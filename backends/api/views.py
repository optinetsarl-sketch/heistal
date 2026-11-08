import json
import os
import uuid
from django.conf import settings
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, authentication_classes, permission_classes, throttle_classes
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db import transaction
from django.db.models import Count, Q, Sum
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.models import User
from .authentication import CommandeRateThrottle, ConnexionRateThrottle, SuiviRateThrottle, erreurs_mot_de_passe, mot_de_passe_temporaire
from .models import normaliser_code_commande, ApiToken, Rayon, Famille, TypeStock, Category, Product, ProductImage, Sale, SaleItem, CommandeDirecte, CommandeItem, StaffProfile, StockBoutique, Boutique, Client, Mouvement
from .mouvements import noter
from .permissions import (
    HasApiToken, IsClientConnecte, IsGestion, IsGestionOrReadOnly, IsGestionOrStaffReadOnly, IsStaffMember, IsStaffOrOwnClient, IsSuperAdmin, PeutVendre,
    boutiques_accessibles, est_caissiere,
)
from .serializers import (
    ENTIER_MAX, MouvementSerializer, RayonSerializer, FamilleSerializer, TypeStockSerializer, CategorySerializer, ProductSerializer, SaisieStockSerializer,
    SaleSerializer, VariationStockSerializer, retirer_du_stock,
    BoutiqueRetraitSerializer, CommandeDirecteSerializer, NouvelleCommandeSerializer, SuiviCommandeSerializer,
    StaffProfileSerializer, BoutiqueSerializer, ClientPublicSerializer, ClientSerializer
)
from .telephones import formater_telephone, normaliser_telephone, telephone_valide

IMAGE_TAILLE_MAX = 5 * 1024 * 1024
SIGNATURES_IMAGE = (
    (b'\xff\xd8\xff', '.jpg'),
    (b'\x89PNG\r\n\x1a\n', '.png'),
    (b'GIF87a', '.gif'),
    (b'GIF89a', '.gif'),
)


def extension_image(fichier):
    """Déduit l'extension du contenu du fichier : le nom fourni par le client n'est pas fiable."""
    entete = fichier.read(12)
    fichier.seek(0)
    if entete[:4] == b'RIFF' and entete[8:12] == b'WEBP':
        return '.webp'
    for signature, extension in SIGNATURES_IMAGE:
        if entete.startswith(signature):
            return extension
    return None


def controler_image(fichier):
    """Refuse un fichier trop lourd ou qui n'est pas une image, et retourne son extension."""
    if fichier.size > IMAGE_TAILLE_MAX:
        raise ValidationError({'image': "Image trop lourde : 5 Mo maximum."})
    extension = extension_image(fichier)
    if extension is None:
        raise ValidationError({'image': "Format refusé : envoyez une image JPEG, PNG, GIF ou WebP."})
    return extension


def enregistrer_image(fichier, dossier, prefixe):
    """Écrit l'image dans media/<dossier>/ et retourne son adresse publique."""
    nom = f"{prefixe}_{uuid.uuid4().hex[:8]}{controler_image(fichier)}"
    chemin_dossier = os.path.join(settings.MEDIA_ROOT, dossier)
    os.makedirs(chemin_dossier, exist_ok=True)
    with open(os.path.join(chemin_dossier, nom), 'wb+') as destination:
        for chunk in fichier.chunks():
            destination.write(chunk)
    return f"{settings.MEDIA_URL}{dossier}/{nom}"


def seed_initial_familles():
    """
    Initialise les 17 familles de produits officielles de La Boutique Heistal Togo
    """
    familles_data = [
        {"code": "31110", "nom": "VOLAILLE", "icone": "🍗", "couleur": "#f97316", "image": "/familles/volaille.jpg", "description": "Poulets entiers surgelés, cuisses calibrées, ailerons et découpes de volaille de haute qualité."},
        {"code": "31111", "nom": "VOLAILLE LOCALE", "icone": "🐓", "couleur": "#ea580c", "image": "/familles/volaille_locale.jpg", "description": "Poulet bicyclette fermier local, pintades du Togo, découpes fraîches élevées au terroir."},
        {"code": "31115", "nom": "CHARCUTERIE", "icone": "🥓", "couleur": "#be123c", "image": "/familles/charcuterie.jpg", "description": "Jambons gourmets, saucissons, mortadelles, lardons, saucisses et charcuteries fines sélectionnées."},
        {"code": "31120", "nom": "VIANDE", "icone": "🥩", "couleur": "#dc2626", "image": "/familles/viande.jpg", "description": "Viandes bovines sélectionnées, filets de bœuf tendres, mouton, agneau et découpes bouchères."},
        {"code": "31130", "nom": "POISSON", "icone": "🐟", "couleur": "#0284c7", "image": "/familles/poisson.jpg", "description": "Poissons entiers et vidés de haute mer, capitaine, bar, tilapia, saumon et carpe fraîchement surgelés."},
        {"code": "31140", "nom": "LEGUMES", "icone": "🥦", "couleur": "#16a34a", "image": "/familles/legumes.jpg", "description": "Légumes surgelés croquants, petits pois, haricots verts, épinards hachés et frites croustillantes."},
        {"code": "31150", "nom": "CRUTACES", "icone": "🦐", "couleur": "#0ea5e9", "image": "/familles/crustaces.jpg", "description": "Crustacés de premier choix, crevettes tigrées jumbo, gambas royales, crabes et langoustes."},
        {"code": "31155", "nom": "VIENNOISERIE", "icone": "🥐", "couleur": "#d97706", "image": "/familles/viennoiserie.jpg", "description": "Croissants pur beurre croustillants, pains au chocolat feuilletés, brioches et viennoiseries dorées."},
        {"code": "31160", "nom": "BOISSON", "icone": "🍹", "couleur": "#06b6d4", "image": "/familles/boisson.jpg", "description": "Jus de fruits tropicaux naturels, sodas frais, boissons rafraîchissantes et eaux minérales."},
        {"code": "31170", "nom": "PRODUITS LAITIERS", "icone": "🧀", "couleur": "#2563eb", "image": "/familles/laitiers.jpg", "description": "Laits frais, beurres de table de tradition, yaourts onctueux et assortiment de fromages savoureux."},
        {"code": "31180", "nom": "CONFISERIE", "icone": "🍫", "couleur": "#ec4899", "image": "/familles/confiserie.jpg", "description": "Chocolats fins de dégustation, confiseries gourmandes, bonbons et douceurs sucrées d'exception."},
        {"code": "31190", "nom": "PRODUITS ELABORES", "icone": "🥟", "couleur": "#8b5cf6", "image": "/familles/elabores.jpg", "description": "Préparations culinaires gourmandes, nuggets croustillants, samoussas dorés, nems et panés."},
        {"code": "31194", "nom": "RIZ LOCAL", "icone": "🌾", "couleur": "#84cc16", "image": "/familles/riz_local.jpg", "description": "Riz local parfumé du Togo, grains longs et naturels issus des meilleures récoltes locales."},
        {"code": "31195", "nom": "RIZ", "icone": "🍚", "couleur": "#64748b", "image": "/familles/riz.jpg", "description": "Riz blanc de qualité supérieure, riz jasmin parfumé et riz basmati pour un repas raffiné."},
        {"code": "31196", "nom": "GLACES", "icone": "🍦", "couleur": "#f43f5e", "image": "/familles/glaces.jpg", "description": "Crèmes glacées artisanales, sorbets aux fruits exotiques, cônes gaufrés et esquimaux rafraîchissants."},
        {"code": "31197", "nom": "EMBALLAGE", "icone": "📦", "couleur": "#6b7280", "image": "/familles/emballage.jpg", "description": "Barquettes alimentaires, films étirables professionnels, sacs isothermes et solutions de conditionnement."},
        {"code": "31198", "nom": "PRESTATION COUPE POISSON", "icone": "🔪", "couleur": "#0891b2", "image": "/familles/coupe_poisson.jpg", "description": "Service traiteur et découpe professionnelle de poissons frais, écaillage, étêtage et filetage sur mesure."}
    ]
    for fd in familles_data:
        Famille.objects.update_or_create(code=fd["code"], defaults=fd)


def seed_initial_types_stock():
    """
    Initialise les types de stock par défaut (Magasin, Réserve, Chambre Froide...)
    """
    types_data = [
        {"nom": "Stock Magasin (Vente Directe)", "code": "STK-MAG-01", "description": "Articles en vitrine / bacs immédiatement disponibles pour la vente au détail"},
        {"nom": "Stock Central / Réserve Tokoin", "code": "STK-CEN-02", "description": "Stock principal d'approvisionnement et de stockage au siège"},
        {"nom": "Stock Chambre Froide Négative (-18°C)", "code": "STK-CHF-03", "description": "Conservation longue durée grand froid négatif"},
        {"nom": "Stock Congélateurs Bahuts", "code": "STK-BAH-04", "description": "Bacs bahuts d'exposition clientèle"},
        {"nom": "Stock Réserve Adidogomé", "code": "STK-ADI-05", "description": "Stock tampon de sécurité boutique Adidogomé"},
    ]
    for td in types_data:
        TypeStock.objects.get_or_create(code=td["code"], defaults=td)


class FamilleViewSet(viewsets.ModelViewSet):
    """
    CRUD et gestion des Familles de Produits Heistal Togo avec upload d'images
    """
    queryset = Famille.objects.all().order_by('code', 'nom')
    serializer_class = FamilleSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    permission_classes = [IsGestionOrReadOnly]

    def get_queryset(self):
        if not Famille.objects.exists():
            seed_initial_familles()
        return Famille.objects.all().order_by('code', 'nom')

    def _handle_image_file(self, request):
        image_file = request.FILES.get('image') or request.FILES.get('image_file')
        if image_file:
            return enregistrer_image(image_file, 'familles', 'famille')
        return None

    def _enregistrer(self, request, instance=None, partial=False):
        # L'image n'est écrite qu'une fois le reste validé : un refus ne laisse aucun fichier.
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        image = self._handle_image_file(request)
        serializer.save(**({'image': image} if image else {}))
        return serializer

    def destroy(self, request, *args, **kwargs):
        total = self.get_object().produits.count()
        if total:
            return Response(
                {'detail': f"Cette famille contient encore {total} produit(s). Déplacez-les vers une autre famille ou supprimez-les d'abord."},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        donnees = self._enregistrer(request).data
        return Response(donnees, status=status.HTTP_201_CREATED, headers=self.get_success_headers(donnees))

    def update(self, request, *args, **kwargs):
        return Response(self._enregistrer(request, self.get_object(), kwargs.get('partial', False)).data)

    @action(detail=True, methods=['post'], url_path='upload-image')
    def upload_image(self, request, pk=None):
        famille = self.get_object()
        uploaded_url = self._handle_image_file(request)
        if uploaded_url:
            famille.image = uploaded_url
            famille.save()
            return Response({'status': 'success', 'image': uploaded_url, 'famille': FamilleSerializer(famille).data})
        img_str = request.data.get('image')
        if img_str:
            famille.image = img_str
            famille.save()
            return Response({'status': 'success', 'image': img_str, 'famille': FamilleSerializer(famille).data})
        return Response({'error': "Aucun fichier ou URL d'image fourni"}, status=status.HTTP_400_BAD_REQUEST)



class TypeStockViewSet(viewsets.ModelViewSet):
    """
    CRUD et gestion des Types de Stock Heistal Togo
    """
    queryset = TypeStock.objects.all()
    serializer_class = TypeStockSerializer
    permission_classes = [IsGestionOrStaffReadOnly]

    def get_queryset(self):
        if not TypeStock.objects.exists():
            seed_initial_types_stock()
        return TypeStock.objects.all()


class RayonViewSet(viewsets.ModelViewSet):
    queryset = Rayon.objects.all()
    serializer_class = RayonSerializer
    permission_classes = [IsGestionOrStaffReadOnly]


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsGestionOrStaffReadOnly]


class ProductViewSet(viewsets.ModelViewSet):
    """
    Catalogue des produits. Création et modification acceptent des photos dans `nouvelles_photos`,
    et la modification retire celles listées dans `photos_a_supprimer`.
    """
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    permission_classes = [IsGestionOrReadOnly]
    PHOTOS_MAX = 5
    MESSAGE_STOCK_REFUSE = "Vérifiez les boutiques et les quantités."
    CHAMPS_SUIVIS = {'nom': 'Nom', 'prix_vente': 'Prix de vente', 'prix_gros': 'Prix de gros', 'unite': 'Unité', 'reference': 'Référence'}

    def _controler_photos(self, photos, deja_presentes):
        if deja_presentes + len(photos) > self.PHOTOS_MAX:
            raise ValidationError({'image': f"{self.PHOTOS_MAX} photos maximum par produit."})
        for photo in photos:
            controler_image(photo)

    def _ajouter_photos(self, produit, photos):
        for photo in photos:
            ProductImage.objects.create(produit=produit, image=enregistrer_image(photo, 'produits', 'produit'))
        produit.actualiser_photo_principale()

    def _stocks_saisis(self):
        """Lit le stock de départ, envoyé en JSON avec les photos : [{"boutique": 1, "quantite": 12}]."""
        brut = self.request.data.get('stocks')
        if not brut:
            return []
        try:
            donnees = json.loads(brut) if isinstance(brut, str) else brut
        except ValueError:
            donnees = None
        saisie = SaisieStockSerializer(data=donnees, many=True)
        if not saisie.is_valid():
            raise ValidationError({'stocks': self.MESSAGE_STOCK_REFUSE})
        return saisie.validated_data

    def _ids_a_supprimer(self):
        donnees = self.request.data
        ids = donnees.getlist('photos_a_supprimer') if hasattr(donnees, 'getlist') else donnees.get('photos_a_supprimer', [])
        return [int(valeur) for valeur in ids if str(valeur).isdigit()]

    # Les photos sont contrôlées avant toute écriture : un refus ne laisse ni produit ni fichier.
    @transaction.atomic
    def perform_create(self, serializer):
        photos = self.request.FILES.getlist('nouvelles_photos')
        self._controler_photos(photos, 0)
        stocks = self._stocks_saisis()
        produit = serializer.save()
        noter(Mouvement.PRODUIT, self.request.user, produit=produit, description="Produit créé")
        for ligne in stocks:
            StockBoutique.objects.update_or_create(produit=produit, boutique=ligne['boutique'], defaults={'quantite': ligne['quantite']})
            if ligne['quantite'] > 0:
                noter(Mouvement.STOCK_DEPART, self.request.user, boutique=ligne['boutique'], produit=produit, quantite=ligne['quantite'], stock_apres=ligne['quantite'])
        self._ajouter_photos(produit, photos)

    @transaction.atomic
    def perform_update(self, serializer):
        photos = self.request.FILES.getlist('nouvelles_photos')
        existantes = ProductImage.objects.filter(produit=serializer.instance)
        a_supprimer = existantes.filter(pk__in=self._ids_a_supprimer())
        self._controler_photos(photos, existantes.count() - a_supprimer.count())
        avant = {champ: getattr(serializer.instance, champ) for champ in self.CHAMPS_SUIVIS}
        changement_photos = bool(photos) or a_supprimer.exists()
        produit = serializer.save()
        a_supprimer.delete()
        self._ajouter_photos(produit, photos)

        changements = [
            f"{libelle} : {avant[champ]} → {getattr(produit, champ)}"
            for champ, libelle in self.CHAMPS_SUIVIS.items()
            if avant[champ] != getattr(produit, champ)
        ]
        if changement_photos:
            changements.append("Photos modifiées")
        if changements:
            noter(Mouvement.PRODUIT, self.request.user, produit=produit, description=' · '.join(changements)[:255])

    def perform_destroy(self, instance):
        noter(Mouvement.PRODUIT, self.request.user, produit_nom=instance.nom, description="Produit supprimé")
        instance.delete()

    def get_queryset(self):
        qs = Product.objects.prefetch_related('photos', 'stocks__boutique')
        famille_id = self.request.query_params.get('famille')
        type_stock_id = self.request.query_params.get('type_stock')
        rayon_id = self.request.query_params.get('rayon')
        cat_id = self.request.query_params.get('category')
        search = self.request.query_params.get('search')
        
        if famille_id:
            qs = qs.filter(famille_id=famille_id)
        if type_stock_id:
            qs = qs.filter(type_stock_id=type_stock_id)
        if rayon_id:
            qs = qs.filter(rayon_id=rayon_id)
        if cat_id:
            qs = qs.filter(category_id=cat_id)
        if search:
            qs = qs.filter(nom__icontains=search) | qs.filter(reference__icontains=search)
        return qs

    @action(detail=True, methods=['post'])
    def adjust_stock(self, request, pk=None):
        """
        Applique des variations, et non des quantités finales : une vente passée pendant
        la saisie n'est pas effacée. Le verrou empêche deux changements de s'écraser.
        Exemple : {"stocks": [{"boutique": 1, "variation": 10}, {"boutique": 4, "variation": -2}]}
        """
        ajustement = VariationStockSerializer(data=request.data.get('stocks'), many=True, allow_empty=False)
        if not ajustement.is_valid():
            raise ValidationError({'detail': self.MESSAGE_STOCK_REFUSE})
        with transaction.atomic():
            produit = Product.objects.select_for_update().get(pk=self.get_object().pk)
            for ligne in ajustement.validated_data:
                stock, _ = StockBoutique.objects.get_or_create(produit=produit, boutique=ligne['boutique'])
                avant = stock.quantite
                stock.quantite = min(ENTIER_MAX, max(0, avant + ligne['variation']))
                stock.save(update_fields=['quantite'])
                ecart = stock.quantite - avant
                if ecart:
                    noter(
                        Mouvement.ENTREE if ecart > 0 else Mouvement.SORTIE, request.user,
                        boutique=ligne['boutique'], produit=produit, quantite=ecart, stock_apres=stock.quantite,
                    )
            produit.save(update_fields=['updated_at'])
        return Response(self.get_serializer(produit).data)


def nom_du_caissier(utilisateur):
    profil = getattr(utilisateur, 'staff_profile', None)
    return profil.nom_complet if profil else utilisateur.username


class SaleViewSet(viewsets.ModelViewSet):
    queryset = Sale.objects.all()
    serializer_class = SaleSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [PeutVendre()]
        if self.action in ('update', 'partial_update', 'destroy'):
            return [IsSuperAdmin()]
        return super().get_permissions()

    def get_queryset(self):
        qs = Sale.objects.all()
        if est_caissiere(self.request.user):
            qs = qs.filter(boutique__in=boutiques_accessibles(self.request.user))
        boutique = self.request.query_params.get('boutique')
        if boutique and boutique.isdigit():
            qs = qs.filter(boutique_id=boutique)
        return qs

    def perform_create(self, serializer):
        utilisateur = self.request.user
        accessibles = boutiques_accessibles(utilisateur)
        if not accessibles.filter(pk=serializer.validated_data['boutique'].pk).exists():
            sienne = accessibles.first()
            raise PermissionDenied(
                f"Vous ne pouvez vendre que dans votre boutique : {sienne.nom}." if sienne
                else "Aucune boutique n'est affectée à votre compte. Contactez le super admin."
            )
        serializer.save(caissier=nom_du_caissier(utilisateur))

    def perform_destroy(self, instance):
        noter(
            Mouvement.VENTE, self.request.user, boutique=instance.boutique, reference=instance.reference,
            description=f"Vente supprimée ({instance.total_ttc} FCFA)",
        )
        instance.delete()


class MouvementViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Lecture du journal : ?boutique=&utilisateur=&type=&depuis=AAAA-MM-JJ&page=
    Une caissière n'y voit que sa boutique. Personne ne peut le modifier.
    """
    serializer_class = MouvementSerializer
    TAILLE_PAGE = 50

    def get_queryset(self):
        qs = Mouvement.objects.all()
        if est_caissiere(self.request.user):
            qs = qs.filter(boutique__in=boutiques_accessibles(self.request.user))
        parametres = self.request.query_params
        boutique = parametres.get('boutique', '')
        utilisateur = parametres.get('utilisateur', '')
        if boutique.isdigit():
            qs = qs.filter(boutique_id=boutique)
        if utilisateur.isdigit():
            qs = qs.filter(utilisateur_id=utilisateur)
        if parametres.get('type') in dict(Mouvement.TYPE_CHOICES):
            qs = qs.filter(type=parametres['type'])
        try:
            depuis = parse_date(parametres.get('depuis', ''))
        except ValueError:
            depuis = None
        if depuis:
            qs = qs.filter(date__date__gte=depuis)
        return qs

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        page = request.query_params.get('page', '1')
        numero = int(page) if page.isdigit() and int(page) > 0 else 1
        debut = (numero - 1) * self.TAILLE_PAGE
        lignes = list(qs[debut:debut + self.TAILLE_PAGE + 1])
        resume = qs.aggregate(
            ventes=Sum('montant', filter=Q(type=Mouvement.VENTE)),
            entrees=Sum('quantite', filter=Q(quantite__gt=0)),
            sorties=Sum('quantite', filter=Q(quantite__lt=0)),
        )
        return Response({
            'total': qs.count(),
            'suite': len(lignes) > self.TAILLE_PAGE,
            'resume': {
                'ventes': resume['ventes'] or 0,
                'entrees': resume['entrees'] or 0,
                'sorties': abs(resume['sorties'] or 0),
            },
            'resultats': self.get_serializer(lignes[:self.TAILLE_PAGE], many=True).data,
        })

    @action(detail=False, methods=['get'])
    def filtres(self, request):
        boutiques = boutiques_accessibles(request.user).order_by('nom')
        profils = StaffProfile.objects.none() if est_caissiere(request.user) else StaffProfile.objects.exclude(user=None).order_by('nom_complet')
        return Response({
            'boutiques': [{'id': boutique.id, 'nom': boutique.nom} for boutique in boutiques],
            'utilisateurs': [{'id': profil.user_id, 'nom': profil.nom_complet} for profil in profils],
        })


class CommandeDirecteViewSet(viewsets.ModelViewSet):
    """
    Commandes passées sur le site, avec ou sans compte, à retirer en boutique sous 24 heures.
    Chaque commande a un code (ex : K7M-4QX) : en boutique, on le tape pour l'afficher et l'encaisser.
    """
    queryset = CommandeDirecte.objects.all()
    serializer_class = CommandeDirecteSerializer
    http_method_names = ['get', 'post', 'patch', 'head', 'options']
    CODES_MAX = 20

    def get_permissions(self):
        # Le site public commande et suit ses commandes ; le personnel lit et encaisse ; la gestion modifie.
        if self.action in ('create', 'suivi'):
            return [permissions.AllowAny()]
        if self.action in ('list', 'retrieve', 'par_code'):
            return [IsStaffMember()]
        if self.action == 'encaisser':
            return [PeutVendre()]
        return [IsGestion()]

    def get_throttles(self):
        if self.action == 'create':
            return [CommandeRateThrottle()]
        if self.action == 'suivi':
            return [SuiviRateThrottle()]
        return super().get_throttles()

    def get_queryset(self):
        CommandeDirecte.expirer_les_commandes_depassees()
        qs = CommandeDirecte.objects.select_related('boutique', 'vente').prefetch_related('items__produit')
        statut = self.request.query_params.get('statut')
        search = self.request.query_params.get('search')
        boutique = self.request.query_params.get('boutique')

        if statut:
            qs = qs.filter(statut=statut)
        if boutique:
            qs = qs.filter(boutique_id=boutique) if boutique.isdigit() else qs.filter(boutique_retrait__icontains=boutique)
        if search:
            qs = qs.filter(
                Q(numero_commande__icontains=search) |
                Q(client_nom__icontains=search) |
                Q(client_telephone__icontains=search)
            )
        return qs

    def create(self, request, *args, **kwargs):
        jeton = request.auth
        client = jeton.client if jeton is not None and jeton.client_id else None
        saisie = NouvelleCommandeSerializer(data=request.data, context={'client': client})
        saisie.is_valid(raise_exception=True)
        commande = saisie.save()
        return Response(SuiviCommandeSerializer(commande, context={'complet': True}).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], authentication_classes=[])
    def suivi(self, request):
        """
        Le client retrouve ses commandes par leur code, sans compte : ?codes=K7M-4QX,P3R-9TA
        Ni le nom complet ni le téléphone ne sont montrés à qui connaît seulement le code.
        """
        codes = [normaliser_code_commande(code) for code in request.query_params.get('codes', '').split(',')]
        codes = list(dict.fromkeys(code for code in codes if code))[:self.CODES_MAX]
        CommandeDirecte.expirer_les_commandes_depassees()
        trouvees = {
            commande.numero_commande: commande
            for commande in CommandeDirecte.objects.select_related('boutique').prefetch_related('items__produit').filter(numero_commande__in=codes)
        }
        return Response([SuiviCommandeSerializer(trouvees[code]).data for code in codes if code in trouvees])

    @action(detail=False, methods=['get'], url_path=r'code/(?P<code>[^/]+)')
    def par_code(self, request, code=None):
        """En boutique : le code tapé affiche toute la commande."""
        CommandeDirecte.expirer_les_commandes_depassees()
        commande = CommandeDirecte.par_code(code)
        if commande is None:
            return Response(
                {'detail': "Aucune commande ne porte ce code. Vérifiez les lettres et les chiffres."},
                status=status.HTTP_404_NOT_FOUND
            )
        return Response(CommandeDirecteSerializer(commande).data)

    @action(detail=True, methods=['post'])
    def encaisser(self, request, pk=None):
        """
        Le client est là : la commande devient une vente de sa boutique (stock et recette du jour),
        puis passe en « Récupérée ». Le verrou empêche de l'encaisser deux fois.
        """
        mode = request.data.get('mode_paiement')
        if mode not in dict(Sale.PAIEMENT_CHOICES):
            return Response({'detail': "Choisissez le mode de paiement."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            commande = CommandeDirecte.objects.select_for_update().filter(pk=pk).first()
            if commande is None:
                return Response({'detail': "Cette commande n'existe plus."}, status=status.HTTP_404_NOT_FOUND)
            refus = self._refus_encaissement(commande, request.user)
            if refus:
                return refus

            boutique = commande.boutique
            vente = Sale.objects.create(
                reference=f"VTE-{commande.numero_commande}",
                boutique=boutique, boutique_nom=boutique.nom,
                client_nom=commande.client_nom, client_tel=commande.client_telephone,
                mode_paiement=mode, sous_total=commande.total, total_ttc=commande.total, montant_recu=commande.total,
                caissier=nom_du_caissier(request.user), notes=f"Commande en ligne {commande.numero_commande}",
            )
            for ligne in commande.items.select_related('produit'):
                produit = Product.objects.select_for_update().filter(pk=ligne.produit_id).first() if ligne.produit_id else None
                stock_apres = retirer_du_stock(produit, boutique, ligne.quantite) if produit else None
                SaleItem.objects.create(
                    vente=vente, produit=produit, nom_produit=ligne.nom_produit,
                    reference_produit=getattr(produit, 'reference', ''), prix_unitaire=ligne.prix_unitaire,
                    quantite=ligne.quantite, total_ligne=ligne.total_ligne,
                )
                noter(
                    Mouvement.VENTE, request.user, boutique=boutique, produit=produit, produit_nom=ligne.nom_produit,
                    quantite=-ligne.quantite, stock_apres=stock_apres, montant=ligne.total_ligne, reference=vente.reference,
                    description=f"Commande en ligne {commande.numero_commande}",
                )

            commande.statut = 'RECUPEREE'
            commande.vente = vente
            commande.date_retrait = timezone.now()
            commande.save(update_fields=['statut', 'vente', 'date_retrait'])
        return Response(CommandeDirecteSerializer(commande).data)

    def _refus_encaissement(self, commande, utilisateur):
        def refus(message, code=status.HTTP_400_BAD_REQUEST):
            return Response({'detail': message}, status=code)

        if commande.statut == 'RECUPEREE':
            return refus("Cette commande a déjà été remise au client.")
        if commande.statut == 'ANNULEE':
            return refus("Cette commande a été annulée : elle ne peut plus être encaissée.")
        if commande.boutique is None:
            return refus("Cette commande n'indique pas de boutique de retrait. Encaissez-la depuis la caisse comme une vente.")
        if not boutiques_accessibles(utilisateur).filter(pk=commande.boutique_id).exists():
            return refus(f"Cette commande est à retirer à la boutique {commande.boutique.nom}.", status.HTTP_403_FORBIDDEN)
        if commande.boutique.statut != 'Active':
            return refus(f"La boutique {commande.boutique.nom} n'est pas ouverte à la vente.")
        return None

    @action(detail=True, methods=['post'])
    def changer_statut(self, request, pk=None):
        commande = self.get_object()
        nouveau_statut = request.data.get('statut')
        if commande.vente_id and nouveau_statut != 'RECUPEREE':
            return Response(
                {'detail': "Cette commande a été encaissée : son statut ne peut plus changer."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if nouveau_statut in ['EN_ATTENTE', 'PRETE', 'RECUPEREE', 'EXPIREE', 'ANNULEE']:
            commande.statut = nouveau_statut
            commande.save()
            return Response(CommandeDirecteSerializer(commande).data)
        return Response({'error': 'Statut invalide'}, status=status.HTTP_400_BAD_REQUEST)


class ClientViewSet(viewsets.ModelViewSet):
    """
    CRUD et gestion de la base de données des clients Heistal Togo (Web, Magasins, B2B)
    """
    queryset = Client.objects.all()
    serializer_class = ClientSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsGestion()]
        return super().get_permissions()

    def get_queryset(self):
        qs = Client.objects.all()
        type_client = self.request.query_params.get('type_client')
        quartier = self.request.query_params.get('quartier')
        est_actif = self.request.query_params.get('est_actif')
        search = self.request.query_params.get('search')

        if type_client and type_client != 'Tous':
            qs = qs.filter(type_client=type_client)
        if quartier:
            qs = qs.filter(quartier__icontains=quartier)
        if est_actif is not None and est_actif != '':
            qs = qs.filter(est_actif=(est_actif.lower() in ['true', '1', 'actif']))
        if search:
            qs = qs.filter(
                Q(nom_complet__icontains=search) |
                Q(telephone__icontains=search) |
                Q(telephone_secondaire__icontains=search) |
                Q(email__icontains=search) |
                Q(quartier__icontains=search) |
                Q(adresse__icontains=search)
            )
        return qs

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny],
            authentication_classes=[], throttle_classes=[ConnexionRateThrottle])
    def register(self, request):
        """
        Création de l'espace client depuis le site. Un numéro qui a déjà commandé sans compte
        a déjà sa fiche : pour la reprendre, il faut le code d'une de ses commandes, preuve
        que c'est bien la personne qui a commandé (sinon n'importe qui verrait ses commandes).
        """
        tel = str(request.data.get('telephone', '')).strip()
        nom = str(request.data.get('nom_complet', '')).strip()
        pwd = str(request.data.get('mot_de_passe', '')).strip()
        email = str(request.data.get('email', '')).strip() or None
        code = str(request.data.get('code_commande', '')).strip()

        def refus(message, code_http=status.HTTP_400_BAD_REQUEST, **extra):
            return Response({'success': False, 'message': message, **extra}, status=code_http)

        if not tel or not nom or not pwd:
            return refus('Le nom complet, le numéro de téléphone et le mot de passe sont requis.')
        if not telephone_valide(tel):
            return refus("Saisissez un numéro de téléphone valide (8 chiffres).")
        if len(nom) > 150:
            return refus("Le nom est trop long (150 caractères au maximum).")
        erreurs = erreurs_mot_de_passe(pwd)
        if erreurs:
            return refus(' '.join(erreurs))

        fiche = Client.fiche_du_numero(tel)
        if fiche is not None and fiche.a_un_compte:
            # Connaître un numéro ne prouve pas qu'il nous appartient : un compte existant reste intact.
            return refus("Ce numéro a déjà un compte. Connectez-vous avec votre mot de passe.", status.HTTP_409_CONFLICT)

        commandes_du_numero = CommandeDirecte.objects.filter(telephone_normalise=normaliser_telephone(tel))
        if commandes_du_numero.exists():
            if not code:
                return refus(
                    "Ce numéro a déjà passé commande chez nous. Pour créer votre compte, tapez le code d'une de vos commandes.",
                    status.HTTP_409_CONFLICT, besoin_code=True,
                )
            if not commandes_du_numero.filter(numero_commande=normaliser_code_commande(code)).exists():
                return refus("Ce code ne correspond à aucune commande passée avec ce numéro.", besoin_code=True)

        if fiche is not None and not fiche.est_actif:
            return refus("Ce numéro a été désactivé. Contactez le service client Heistal.", status.HTTP_403_FORBIDDEN)

        if fiche is None:
            fiche = Client(telephone=formater_telephone(tel))
        fiche.nom_complet = nom
        fiche.mot_de_passe = make_password(pwd)
        if email:
            fiche.email = email
        fiche.save()

        return Response({
            'success': True,
            'message': 'Votre compte est créé.',
            'client': ClientPublicSerializer(fiche).data,
            'token': ApiToken.emettre(client=fiche),
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny],
            authentication_classes=[], throttle_classes=[ConnexionRateThrottle])
    def login(self, request):
        """
        Connexion d'un client via son téléphone (écrit comme il veut) ou son email, et son mot de passe
        """
        identifiant = str(request.data.get('identifiant', '') or request.data.get('telephone', '')).strip()
        password = str(request.data.get('password', '') or request.data.get('mot_de_passe', '')).strip()

        if not identifiant or not password:
            return Response(
                {'success': False, 'message': 'Saisissez votre numéro de téléphone et votre mot de passe.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        client = None
        if '@' in identifiant:
            client = Client.objects.filter(email__iexact=identifiant).exclude(mot_de_passe='').first()
        if client is None:
            client = Client.fiche_du_numero(identifiant)

        # Même réponse si le compte n'existe pas : cette page ne doit pas révéler qui est client.
        if not check_password(password, client.mot_de_passe if client else ''):
            return Response(
                {'success': False, 'message': 'Numéro de téléphone ou mot de passe incorrect.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not client.est_actif:
            return Response(
                {'success': False, 'message': "Ce compte client est désactivé. Contactez le service client Heistal."},
                status=status.HTTP_403_FORBIDDEN
            )

        return Response({
            'success': True,
            'message': f'Bienvenue {client.nom_complet} !',
            'client': ClientPublicSerializer(client).data,
            'token': ApiToken.emettre(client=client)
        })

    @action(detail=False, methods=['get'], permission_classes=[IsClientConnecte])
    def moi(self, request):
        """L'espace du client connecté : sa fiche et toutes les commandes passées avec son numéro."""
        client = request.auth.client
        filtre = Q(client=client)
        if client.telephone_normalise:
            filtre |= Q(telephone_normalise=client.telephone_normalise)
        CommandeDirecte.expirer_les_commandes_depassees()
        commandes = (
            CommandeDirecte.objects.filter(filtre).distinct()
            .select_related('boutique').prefetch_related('items__produit').order_by('-date_commande')
        )
        return Response({
            'client': ClientPublicSerializer(client).data,
            'commandes': SuiviCommandeSerializer(commandes, many=True, context={'complet': True}).data,
        })

    @action(detail=True, methods=['get'], permission_classes=[IsStaffOrOwnClient])
    def commandes(self, request, pk=None):
        """
        Historique des commandes d'un client
        """
        client = self.get_object()
        commandes = client.commandes.all()
        return Response(CommandeDirecteSerializer(commandes, many=True).data)


class BoutiqueViewSet(viewsets.ModelViewSet):
    """
    CRUD et gestion des boutiques et points de vente Heistal Togo avec localisation et map
    """
    queryset = Boutique.objects.all()
    serializer_class = BoutiqueSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsSuperAdmin()]
        return super().get_permissions()

    def destroy(self, request, *args, **kwargs):
        boutique = self.get_object()
        total = boutique.stocks.aggregate(total=Sum('quantite'))['total'] or 0
        if total > 0:
            return Response(
                {'detail': f"Cette boutique a encore {total} article(s) en stock. Retirez ce stock avant de la supprimer."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if boutique.ventes.exists():
            return Response(
                {'detail': "Cette boutique a des ventes enregistrées. Passez-la en « Fermée » plutôt que de la supprimer."},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny], authentication_classes=[])
    def retrait(self, request):
        """Les boutiques ouvertes où le client peut venir chercher sa commande (pas le siège)."""
        boutiques = Boutique.objects.filter(statut='Active', is_siege=False).order_by('nom')
        return Response(BoutiqueRetraitSerializer(boutiques, many=True).data)

    @action(detail=False, methods=['get'], url_path='espaces-de-vente')
    def espaces_de_vente(self, request):
        """Les boutiques ouvertes et leurs chiffres du jour. Une caissière ne reçoit que la sienne."""
        boutiques = self.get_queryset().filter(statut='Active', pk__in=boutiques_accessibles(request.user)).order_by('nom')

        ventes = Sale.objects.filter(date_vente__date=timezone.localdate()).values('boutique').annotate(total=Sum('total_ttc'), tickets=Count('id'))
        ventes = {ligne['boutique']: ligne for ligne in ventes}
        stocks = StockBoutique.objects.filter(quantite__gt=0).values('boutique').annotate(produits=Count('id'))
        stocks = {ligne['boutique']: ligne['produits'] for ligne in stocks}

        return Response([
            {
                'id': boutique.id,
                'nom': boutique.nom,
                'is_siege': boutique.is_siege,
                'ventes_du_jour': ventes.get(boutique.id, {}).get('total', 0),
                'tickets_du_jour': ventes.get(boutique.id, {}).get('tickets', 0),
                'produits_en_stock': stocks.get(boutique.id, 0),
            }
            for boutique in boutiques
        ])

    def get_queryset(self):
        if not Boutique.objects.exists():
            seed_initial_boutiques()

        qs = Boutique.objects.all()
        ville = self.request.query_params.get('ville')
        statut = self.request.query_params.get('statut')
        search = self.request.query_params.get('search')

        if ville and ville != 'Toutes':
            qs = qs.filter(ville__iexact=ville)
        if statut and statut != 'Tous':
            qs = qs.filter(statut=statut)
        if search:
            qs = qs.filter(
                Q(nom__icontains=search) |
                Q(telephone__icontains=search) |
                Q(localisation__icontains=search) |
                Q(quartier__icontains=search) |
                Q(ville__icontains=search)
            )
        return qs


class StaffProfileViewSet(viewsets.ModelViewSet):
    """
    Comptes des employés, réservés au super admin. Un compte ne se supprime jamais : il se désactive,
    pour que son historique reste lisible. Le mot de passe n'est jamais choisi ici : il est tiré au
    sort, montré une seule fois, et l'employé doit le changer à sa première connexion.
    """
    queryset = StaffProfile.objects.select_related('boutique')
    serializer_class = StaffProfileSerializer
    permission_classes = [IsSuperAdmin]
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_queryset(self):
        qs = StaffProfile.objects.select_related('boutique')
        role = self.request.query_params.get('role')
        statut = self.request.query_params.get('statut')
        search = self.request.query_params.get('search')

        if role and role != 'Tous':
            qs = qs.filter(role=role)
        if statut and statut != 'Tous':
            qs = qs.filter(statut=statut)
        if search:
            qs = qs.filter(
                Q(nom_complet__icontains=search) |
                Q(username__icontains=search) |
                Q(email__icontains=search) |
                Q(matricule__icontains=search) |
                Q(telephone__icontains=search)
            )
        return qs

    def create(self, request, *args, **kwargs):
        reponse = super().create(request, *args, **kwargs)
        reponse.data['mot_de_passe_temporaire'] = self.mot_de_passe_cree
        return reponse

    def perform_create(self, serializer):
        self.mot_de_passe_cree = mot_de_passe_temporaire()
        profil = serializer.save(mot_de_passe=self.mot_de_passe_cree, mot_de_passe_provisoire=True)
        noter(Mouvement.COMPTE, self.request.user, boutique=profil.boutique, description=f"Compte créé : {profil.nom_complet} ({profil.get_role_display()})")

    def perform_update(self, serializer):
        ancien = serializer.instance
        avant = (ancien.get_role_display(), ancien.statut, ancien.boutique)
        profil = serializer.save()
        role_avant, statut_avant, boutique_avant = avant

        changements = []
        if profil.get_role_display() != role_avant:
            changements.append(f"rôle : {role_avant} → {profil.get_role_display()}")
        if profil.statut != statut_avant:
            changements.append('compte désactivé' if profil.statut == 'Inactif' else 'compte réactivé')
        if profil.boutique != boutique_avant and profil.boutique is not None:
            changements.append(f"affecté(e) à {profil.boutique.nom}")
        if changements:
            noter(Mouvement.COMPTE, self.request.user, boutique=profil.boutique, description=f"{profil.nom_complet} — {', '.join(changements)}")

    @action(detail=False, methods=['get'])
    def caissieres(self, request):
        """
        Liste des caissières, pour les affecter à une boutique
        """
        qs = StaffProfile.objects.select_related('boutique').filter(role=StaffProfile.CAISSIERE)
        return Response(StaffProfileSerializer(qs, many=True).data)

    @action(detail=True, methods=['post'])
    def affecter_boutique(self, request, pk=None):
        """
        Affecte une caissière à une boutique : seules les caissières y travaillent
        """
        profil = self.get_object()
        if profil.role != StaffProfile.CAISSIERE:
            return Response({'detail': "Seule une caissière peut être affectée à une boutique."}, status=status.HTTP_400_BAD_REQUEST)
        serializer = self.get_serializer(profil, data={'boutique': request.data.get('boutique')}, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def reinitialiser_mot_de_passe(self, request, pk=None):
        """
        Remplace le mot de passe, ferme les sessions ouvertes et oblige à en choisir un nouveau
        """
        profil = self.get_object()
        provisoire = mot_de_passe_temporaire(profil.user)
        profil.mot_de_passe = provisoire
        profil.mot_de_passe_provisoire = True
        profil.save()
        noter(Mouvement.COMPTE, request.user, boutique=profil.boutique, description=f"{profil.nom_complet} — mot de passe réinitialisé")
        return Response({'mot_de_passe_temporaire': provisoire})

    @action(detail=False, methods=['post'])
    def seed_default(self, request):
        seed_staff_profiles()
        return Response({
            'message': "Comptes Heistal Togo initialisés avec succès !",
            'total': StaffProfile.objects.count()
        })


def seed_staff_profiles():
    """
    Initialise les comptes de départ de Heistal Togo
    """
    seed_initial_boutiques()

    # 1. PDG
    pdg, _ = StaffProfile.objects.get_or_create(
        matricule="HST-PDG-001",
        defaults={
            'nom_complet': "Hugues Wilson",
            'email': "hugues.wilson@heistal-togo.tg",
            'telephone': "+228 90 01 02 03",
            'role': "SUPER_ADMIN",
            'departement': "DIRECTION",
            'service_rattache': "DIRECTION_GENERALE",
            'statut': "Actif",
            'niveau_acces': "ADMIN_TOTAL",
            'missions': "Président-Directeur Général. Orientation stratégique, investissements, partenariats et pilotage global.",
            'avatar': "HW"
        }
    )

    # 2. DG
    dg, _ = StaffProfile.objects.get_or_create(
        matricule="HST-DG-002",
        defaults={
            'nom_complet': "David Mensah",
            'email': "david.mensah@heistal-togo.tg",
            'telephone': "+228 91 12 13 14",
            'role': "SUPER_ADMIN",
            'departement': "DIRECTION",
            'service_rattache': "DIRECTION_GENERALE",
            'superieur_hierarchique': pdg,
            'statut': "Actif",
            'niveau_acces': "ADMIN_TOTAL",
            'missions': "Direction générale et coordination des activités. Exécution opérationnelle et coordination Secrétariat, DAF et Service Commercial.",
            'avatar': "DM"
        }
    )

    # 3. SECRÉTARIAT
    sec, _ = StaffProfile.objects.get_or_create(
        matricule="HST-SEC-003",
        defaults={
            'nom_complet': "Afi Mawuena",
            'email': "afi.mawuena@heistal-togo.tg",
            'telephone': "+228 92 23 24 25",
            'role': "CONTROLEUR",
            'departement': "SECRETARIAT",
            'service_rattache': "SECRETARIAT_APPUI",
            'superieur_hierarchique': dg,
            'statut': "Actif",
            'niveau_acces': "ADMINISTRATIF",
            'missions': "Appui administratif à la direction. Correspondances officielles, accueil protocolaire, tenue des registres et archivage.",
            'avatar': "AM"
        }
    )

    # 4. DAF
    daf, _ = StaffProfile.objects.get_or_create(
        matricule="HST-DAF-004",
        defaults={
            'nom_complet': "Kodjo Agbeko",
            'email': "kodjo.agbeko@heistal-togo.tg",
            'telephone': "+228 93 34 35 36",
            'role': "CONTROLEUR",
            'departement': "DAF",
            'service_rattache': "DAF_FINANCES",
            'superieur_hierarchique': dg,
            'statut': "Actif",
            'niveau_acces': "GESTION_FINANCIERE",
            'missions': "Direction administrative et financière. Trésorerie, déclarations fiscales, budgets et supervision Comptabilité/Caisse.",
            'avatar': "KA"
        }
    )

    # 5. COMPTABILITÉ (rattaché au DAF)
    StaffProfile.objects.get_or_create(
        matricule="HST-CPT-005",
        defaults={
            'nom_complet': "Sylvie Lawson",
            'email': "sylvie.lawson@heistal-togo.tg",
            'telephone': "+228 94 45 46 47",
            'role': "CONTROLEUR",
            'departement': "DAF",
            'service_rattache': "COMPTABILITE",
            'superieur_hierarchique': daf,
            'statut': "Actif",
            'niveau_acces': "GESTION_FINANCIERE",
            'missions': "Saisie, contrôle, rapprochements et états financiers. Factures fournisseurs, gestion des créances et bilans.",
            'avatar': "SL"
        }
    )

    # 6. CAISSE (rattaché au DAF)
    StaffProfile.objects.get_or_create(
        matricule="HST-CAI-006",
        defaults={
            'nom_complet': "Yao Dogbé",
            'email': "yao.dogbe@heistal-togo.tg",
            'telephone': "+228 95 56 57 58",
            'role': "CAISSIERE",
            'departement': "DAF",
            'service_rattache': "CAISSE",
            'superieur_hierarchique': daf,
            'statut': "Actif",
            'niveau_acces': "CAISSE_POS",
            'missions': "Encaissements, décaissements et arrêtés de caisse. Caisse centrale, versements banques et consolidation des recettes.",
            'avatar': "YD"
        }
    )

    # 7. SERVICE COMMERCIAL (rattaché au DG)
    commercial, _ = StaffProfile.objects.get_or_create(
        matricule="HST-COM-007",
        defaults={
            'nom_complet': "Paulin Dossou",
            'email': "paulin.dossou@heistal-togo.tg",
            'telephone': "+228 96 67 68 69",
            'role': "SERVICE_COMMERCIAL",
            'departement': "COMMERCIAL",
            'service_rattache': "SERVICE_COMMERCIAL",
            'superieur_hierarchique': dg,
            'statut': "Actif",
            'niveau_acces': "GESTION_COMMERCIALE",
            'missions': "Ventes et suivi des boutiques. Stratégie commerciale surgelés, partenariats B2B, suivi des objectifs et animation de réseau.",
            'avatar': "PD"
        }
    )

    # Caisses supplémentaires en boutique
    StaffProfile.objects.get_or_create(
        matricule="HST-CAI-008",
        defaults={
            'nom_complet': "Akossiwa Tossou",
            'email': "akossiwa.tossou@heistal-togo.tg",
            'telephone': "+228 98 89 90 91",
            'role': "CAISSIERE",
            'departement': "DAF",
            'service_rattache': "CAISSE",
            'superieur_hierarchique': daf,
            'boutique': Boutique.objects.filter(code='BQT-TOK-01').first(),
            'statut': "Actif",
            'niveau_acces': "CAISSE_POS",
            'missions': "Caisse et encaissements Point de Vente Tokoin Wuiti.",
            'avatar': "AT"
        }
    )
    StaffProfile.objects.get_or_create(
        matricule="HST-CAI-009",
        defaults={
            'nom_complet': "Edwige Ayité",
            'email': "edwige.ayite@heistal-togo.tg",
            'telephone': "+228 91 22 33 44",
            'role': "CAISSIERE",
            'departement': "DAF",
            'service_rattache': "CAISSE",
            'superieur_hierarchique': daf,
            'boutique': Boutique.objects.filter(code='BQT-ADI-02').first(),
            'statut': "Actif",
            'niveau_acces': "CAISSE_POS",
            'missions': "Caisse et encaissements Point de Vente Adidogomé.",
            'avatar': "EA"
        }
    )



@api_view(['POST'])
@permission_classes([IsSuperAdmin])
def seed_initial_data(request):
    """
    Initialise les rayons, catégories et produits de base de La Boutique Heistal Togo
    """
    if Rayon.objects.exists() and Product.objects.exists():
        return Response({'message': 'Les données existent déjà.', 'produits': Product.objects.count()})

    # 1. Création des Rayons
    r_poissons, _ = Rayon.objects.get_or_create(
        nom="Rayon Poissons & Mers",
        defaults={
            'code': 'RAY-POISS-01',
            'temperature': '-18°C Surgelé',
            'zone_magasin': 'Zone Centrale - Bacs Bahuts A1 à A4',
            'description': 'Tilapia entier, Capitaine, Bar, Saumon, Crevettes géantes de mer'
        }
    )

    r_volailles, _ = Rayon.objects.get_or_create(
        nom="Rayon Volailles & Découpes",
        defaults={
            'code': 'RAY-VOL-02',
            'temperature': '-18°C Surgelé',
            'zone_magasin': 'Zone Latérale Gauche - Bacs Bahuts B1 à B4',
            'description': 'Poulets entiers, Cuisses gros calibre, Ailerons, Gésiers nettoyés'
        }
    )

    r_viandes, _ = Rayon.objects.get_or_create(
        nom="Rayon Viandes Rouges & Bovins",
        defaults={
            'code': 'RAY-VIAND-03',
            'temperature': '-18°C Surgelé',
            'zone_magasin': 'Zone Fond Magasin - Bacs C1 à C3',
            'description': 'Filets de bœuf, Côtes de porc fermier, Mouton découpé, Jarrets'
        }
    )

    r_legumes, _ = Rayon.objects.get_or_create(
        nom="Rayon Frites, Légumes & Glaces",
        defaults={
            'code': 'RAY-LEG-04',
            'temperature': '-18°C Surgelé',
            'zone_magasin': 'Zone Entrée - Armoires Vitrées D1 & D2',
            'description': 'Frites croustillantes McCain, Petits pois, Haricots verts, Bacs de glaces'
        }
    )

    r_snacks, _ = Rayon.objects.get_or_create(
        nom="Rayon Snacks & Croustillants",
        defaults={
            'code': 'RAY-SNA-05',
            'temperature': '-18°C Surgelé',
            'zone_magasin': 'Zone Caisse - Bacs E1',
            'description': 'Nuggets croustillants, Croquettes de poisson, Samosas et feuilletés'
        }
    )

    # 2. Création des Catégories
    c_poissons, _ = Category.objects.get_or_create(nom="Poissons & Fruits de mer", defaults={'slug': 'poissons', 'rayon': r_poissons})
    c_volailles, _ = Category.objects.get_or_create(nom="Volailles & Découpes", defaults={'slug': 'volailles', 'rayon': r_volailles})
    c_viandes, _ = Category.objects.get_or_create(nom="Viandes Rouges & Bovins", defaults={'slug': 'viandes', 'rayon': r_viandes})
    c_frites, _ = Category.objects.get_or_create(nom="Frites & Légumes", defaults={'slug': 'frites-legumes', 'rayon': r_legumes})
    c_snacks, _ = Category.objects.get_or_create(nom="Snacks & Panés", defaults={'slug': 'snacks-panes', 'rayon': r_snacks})

    # 3. Création des Produits
    sample_products = [
        {
            'nom': "Tilapia Frais Surgelé de Première Qualité",
            'reference': "HST-TIL-001",
            'rayon': r_poissons,
            'category': c_poissons,
            'emplacement_bac': "Bac A-01",
            'prix_vente': 2800,
            'prix_gros': 26000,
            'cout_achat': 2200,
            'stock_tokoin': 85,
            'stock_adidogome': 60,
            'unite': 'kg',
        },
        {
            'nom': "Cuisses de Poulet Gros Calibre (Carton 10kg)",
            'reference': "HST-VOL-002",
            'rayon': r_volailles,
            'category': c_volailles,
            'emplacement_bac': "Bac B-01",
            'prix_vente': 18500,
            'prix_gros': 17500,
            'cout_achat': 15000,
            'stock_tokoin': 42,
            'stock_adidogome': 35,
            'unite': 'carton',
        },
        {
            'nom': "Filet de Bœuf Tendre Sans Os",
            'reference': "HST-BOV-003",
            'rayon': r_viandes,
            'category': c_viandes,
            'emplacement_bac': "Bac C-01",
            'prix_vente': 4500,
            'prix_gros': 42000,
            'cout_achat': 3600,
            'stock_tokoin': 28,
            'stock_adidogome': 20,
            'unite': 'kg',
        },
        {
            'nom': "Frites Croustillantes McCain Original (Sachet 2.5kg)",
            'reference': "HST-FRI-004",
            'rayon': r_legumes,
            'category': c_frites,
            'emplacement_bac': "Armoire D-01",
            'prix_vente': 3800,
            'prix_gros': 14000,
            'cout_achat': 2900,
            'stock_tokoin': 65,
            'stock_adidogome': 48,
            'unite': 'sachet',
        },
        {
            'nom': "Nuggets de Poulet Extra Croustillants (1kg)",
            'reference': "HST-SNA-005",
            'rayon': r_snacks,
            'category': c_snacks,
            'emplacement_bac': "Bac E-01",
            'prix_vente': 3200,
            'prix_gros': 30000,
            'cout_achat': 2400,
            'stock_tokoin': 54,
            'stock_adidogome': 38,
            'unite': 'sachet',
        },
        {
            'nom': "Capitaine Frais Entier Écaillé",
            'reference': "HST-CAP-006",
            'rayon': r_poissons,
            'category': c_poissons,
            'emplacement_bac': "Bac A-03",
            'prix_vente': 3500,
            'prix_gros': 32000,
            'cout_achat': 2800,
            'stock_tokoin': 12,
            'stock_adidogome': 8,
            'unite': 'kg',
        }
    ]

    seed_initial_familles()
    code_famille = {
        'HST-TIL-001': '31130', 'HST-VOL-002': '31110', 'HST-BOV-003': '31120',
        'HST-FRI-004': '31140', 'HST-SNA-005': '31190', 'HST-CAP-006': '31130',
    }
    seed_staff_profiles()
    seed_initial_boutiques()

    for p in sample_products:
        stocks = {'BQT-TOK-01': p.pop('stock_tokoin'), 'BQT-ADI-02': p.pop('stock_adidogome')}
        p['famille'] = Famille.objects.get(code=code_famille[p['reference']])
        produit, cree = Product.objects.get_or_create(reference=p['reference'], defaults=p)
        if cree:
            for boutique in Boutique.objects.filter(code__in=stocks):
                StockBoutique.objects.create(produit=produit, boutique=boutique, quantite=stocks[boutique.code])

    return Response({
        'message': 'Données, organigramme et boutiques initialisés avec succès !',
        'rayons': Rayon.objects.count(),
        'produits': Product.objects.count(),
        'collaborateurs': StaffProfile.objects.count(),
        'boutiques': Boutique.objects.count()
    })


def seed_initial_boutiques():
    """
    Initialise les boutiques phares de Heistal Togo avec localisation et coordonnées map
    """
    Boutique.objects.get_or_create(
        nom="Boutique Tokoin Wuiti",
        defaults={
            'code': 'BQT-TOK-01',
            'telephone': '+228 22 26 42 29',
            'email': 'tokoin@heistal-togo.tg',
            'localisation': 'Tokoin Wuiti, Boulevard de la Paix, face station Total',
            'ville': 'Lomé',
            'quartier': 'Tokoin Wuiti',
            'latitude': 6.1485000,
            'longitude': 1.2180000,
            'lien_map': 'https://www.google.com/maps?q=6.1485,1.2180',
            'responsable': 'Samuel Kpelly',
            'horaires': 'Lun - Sam: 07h30 - 20h00, Dim: 08h00 - 14h00',
            'statut': 'Active',
            'is_siege': False,
            'description': 'Magasin principal de surgelés, poissons et volailles gros & détail.'
        }
    )

    Boutique.objects.get_or_create(
        nom="Boutique Adidogomé",
        defaults={
            'code': 'BQT-ADI-02',
            'telephone': '+228 90 11 22 33',
            'email': 'adidogome@heistal-togo.tg',
            'localisation': "Adidogomé Douane, Avenue d'Aflao, près du carrefour Limousine",
            'ville': 'Lomé',
            'quartier': 'Adidogomé',
            'latitude': 6.1720000,
            'longitude': 1.1650000,
            'lien_map': 'https://www.google.com/maps?q=6.1720,1.1650',
            'responsable': 'Estelle Foli',
            'horaires': 'Lun - Sam: 07h30 - 20h00, Dim: 08h00 - 14h00',
            'statut': 'Active',
            'is_siege': False,
            'description': 'Point de vente surgelés et poissons frais pour la zone Ouest de Lomé.'
        }
    )

    Boutique.objects.get_or_create(
        nom="Siège Direction Heistal",
        defaults={
            'code': 'BQT-SIEG-00',
            'telephone': '+228 90 01 02 03',
            'email': 'contact@heistal-togo.tg',
            'localisation': 'Zone Administrative et Commerciale, Lomé',
            'ville': 'Lomé',
            'quartier': 'Centre-ville',
            'latitude': 6.1375000,
            'longitude': 1.2123000,
            'lien_map': 'https://www.google.com/maps?q=6.1375,1.2123',
            'responsable': 'Direction Générale (PDG)',
            'horaires': 'Lun - Ven: 08h00 - 18h00',
            'statut': 'Active',
            'is_siege': True,
            'description': 'Direction générale, service administratif, comptabilité centrale.'
        }
    )



def _session_employe(compte, profile):
    """Données de session renvoyées au frontend, avec ou sans profil employé."""
    return {
        'id': profile.id if profile else compte.id,
        'nom_complet': profile.nom_complet if profile else (compte.get_full_name() or compte.username),
        'username': (profile.username or profile.nom_complet.split()[0].lower()) if profile else compte.username,
        'email': profile.email if profile else compte.email,
        'role': profile.role if profile else StaffProfile.SUPER_ADMIN,
        'role_label': profile.get_role_display() if profile else 'Super admin',
        'boutique': profile.boutique_id if profile else None,
        'boutique_nom': profile.boutique.nom if profile and profile.boutique else '',
        'matricule': profile.matricule if profile else f'HST-{compte.id}',
        'avatar': profile.avatar_initials if profile else 'HW',
        'statut': profile.statut if profile else 'Actif',
    }


@api_view(['POST'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
@throttle_classes([ConnexionRateThrottle])
def login_api(request):
    """
    Authentification d'un collaborateur Heistal Togo via son identifiant et son mot de passe
    """
    identifiant = str(
        request.data.get('identifiant') or
        request.data.get('username') or
        request.data.get('email') or
        request.data.get('matricule') or
        ''
    ).strip()
    password = str(request.data.get('password', '')).strip()

    if not identifiant:
        return Response(
            {'success': False, 'message': "Veuillez saisir votre nom d'utilisateur."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # 1. Recherche par nom d'utilisateur, nom complet, email ou matricule
    profile = StaffProfile.objects.filter(
        Q(username__iexact=identifiant) | 
        Q(nom_complet__iexact=identifiant) |
        Q(email__iexact=identifiant) | 
        Q(matricule__iexact=identifiant)
    ).first()

    compte = profile.user if profile else None
    if not profile:
        compte = User.objects.filter(Q(username__iexact=identifiant) | Q(email__iexact=identifiant)).first()
        profile = getattr(compte, 'staff_profile', None)

    # 2. Seul le mot de passe du compte fait foi. Sans profil employé, seul un superutilisateur entre.
    mot_de_passe_valide = compte.check_password(password) if compte else check_password(password, '')
    if not mot_de_passe_valide or not (profile or compte.is_superuser):
        return Response(
            {'success': False, 'message': 'Identifiant ou mot de passe incorrect.'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    # 3. Vérification du statut (Désactivé)
    if not compte.is_active:
        return Response(
            {'success': False, 'message': 'Ce compte a été désactivé. Veuillez contacter le super admin.'},
            status=status.HTTP_403_FORBIDDEN
        )

    # 4. Un mot de passe trop faible ou provisoire n'ouvre qu'une session limitée à son changement
    mot_de_passe_faible = bool(erreurs_mot_de_passe(password, compte)) or bool(profile and profile.mot_de_passe_provisoire)
    user_data = _session_employe(compte, profile)
    noter(Mouvement.CONNEXION, compte, boutique=profile.boutique if profile else None, description="Connexion")
    return Response({
        'success': True,
        'message': f'Bienvenue {user_data["nom_complet"]} !',
        'user': user_data,
        'token': ApiToken.emettre(user=compte, doit_changer_mot_de_passe=mot_de_passe_faible),
        'must_change_password': mot_de_passe_faible,
    })


@api_view(['GET'])
def session_api(request):
    """
    Vérifie la session en cours : le frontend s'en sert pour écarter un jeton périmé dès l'ouverture
    """
    return Response({'user': _session_employe(request.user, getattr(request.user, 'staff_profile', None))})


@api_view(['POST'])
@permission_classes([HasApiToken])
def logout_api(request):
    """
    Ferme la session en cours : le jeton devient inutilisable immédiatement
    """
    request.auth.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([HasApiToken])
def change_password_api(request):
    """
    Changement de son propre mot de passe par un collaborateur connecté
    """
    compte = request.auth.user
    if compte is None:
        return Response(
            {'success': False, 'message': 'Action réservée aux collaborateurs.'},
            status=status.HTTP_403_FORBIDDEN
        )

    ancien = str(request.data.get('ancien_mot_de_passe', '')).strip()
    nouveau = str(request.data.get('nouveau_mot_de_passe', '')).strip()

    if not compte.check_password(ancien):
        return Response(
            {'success': False, 'message': 'Mot de passe actuel incorrect.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    erreurs = erreurs_mot_de_passe(nouveau, compte)
    if nouveau == ancien:
        erreurs.append("Le nouveau mot de passe doit être différent de l'ancien.")
    if erreurs:
        return Response({'success': False, 'message': ' '.join(erreurs)}, status=status.HTTP_400_BAD_REQUEST)

    compte.set_password(nouveau)
    compte.save(update_fields=['password'])
    StaffProfile.objects.filter(user=compte).update(mot_de_passe_provisoire=False)
    # Les sessions ouvertes avec l'ancien mot de passe tombent toutes.
    ApiToken.objects.filter(user=compte).delete()
    return Response({
        'success': True,
        'message': 'Mot de passe mis à jour.',
        'token': ApiToken.emettre(user=compte),
    })



