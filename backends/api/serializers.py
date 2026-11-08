from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import User
from django.db import transaction
from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from .authentication import erreurs_mot_de_passe
from .models import Rayon, Famille, TypeStock, Category, Product, ProductImage, Sale, SaleItem, CommandeDirecte, CommandeItem, StaffProfile, StockBoutique, Boutique, Client, Mouvement
from .mouvements import noter
from .permissions import est_membre_du_personnel
from .telephones import formater_telephone, masquer_telephone, telephone_valide


def refuser_mot_de_passe_faible(valeur):
    erreurs = erreurs_mot_de_passe(valeur) if valeur else []
    if erreurs:
        raise serializers.ValidationError(erreurs)


class FamilleSerializer(serializers.ModelSerializer):
    produits_count = serializers.IntegerField(source='produits.count', read_only=True)
    image = serializers.CharField(required=False, allow_blank=True, default='')

    class Meta:
        model = Famille
        fields = '__all__'
        extra_kwargs = {
            'nom': {
                'error_messages': {'required': "Saisissez le nom de la famille.", 'blank': "Saisissez le nom de la famille."},
                'validators': [UniqueValidator(queryset=Famille.objects.all(), lookup='iexact', message="Une famille porte déjà ce nom.")],
            },
            'code': {
                'validators': [UniqueValidator(queryset=Famille.objects.all(), lookup='iexact', message="Ce code est déjà utilisé par une autre famille.")],
            },
        }

    def to_internal_value(self, data):
        # Un fichier dans 'image' est traité par la vue. Pas de data.copy() : un gros envoi,
        # gardé dans un fichier temporaire, ne se copie pas.
        if hasattr(data, 'get') and hasattr(data.get('image'), 'read'):
            data = {cle: valeur for cle, valeur in data.items() if cle != 'image'}
        return super().to_internal_value(data)


class TypeStockSerializer(serializers.ModelSerializer):
    produits_count = serializers.IntegerField(source='produits.count', read_only=True)

    class Meta:
        model = TypeStock
        fields = '__all__'
        extra_kwargs = {
            'nom': {
                'error_messages': {'required': "Saisissez le nom du type de stock.", 'blank': "Saisissez le nom du type de stock."},
                'validators': [UniqueValidator(queryset=TypeStock.objects.all(), lookup='iexact', message="Un type de stock porte déjà ce nom.")],
            },
            'code': {
                'validators': [UniqueValidator(queryset=TypeStock.objects.all(), lookup='iexact', message="Ce code est déjà utilisé par un autre type de stock.")],
            },
        }


class RayonSerializer(serializers.ModelSerializer):
    produits_count = serializers.IntegerField(source='produits.count', read_only=True)

    class Meta:
        model = Rayon
        fields = '__all__'


class CategorySerializer(serializers.ModelSerializer):
    rayon_nom = serializers.ReadOnlyField(source='rayon.nom')
    famille_nom = serializers.CharField(source='famille.nom', read_only=True, default='')

    class Meta:
        model = Category
        fields = '__all__'


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'image']


# Plus grand entier d'une colonne PostgreSQL. SQLite n'a pas cette limite : elle est posée ici pour valoir partout.
ENTIER_MAX = 2147483647

class StockBoutiqueSerializer(serializers.ModelSerializer):
    boutique_nom = serializers.CharField(source='boutique.nom', read_only=True)

    class Meta:
        model = StockBoutique
        fields = ['boutique', 'boutique_nom', 'quantite']


class SaisieStockSerializer(serializers.Serializer):
    """Stock de départ d'un nouveau produit : seule une boutique active peut le recevoir."""
    boutique = serializers.PrimaryKeyRelatedField(queryset=Boutique.objects.filter(statut='Active'))
    quantite = serializers.IntegerField(min_value=0, max_value=ENTIER_MAX)


class VariationStockSerializer(serializers.Serializer):
    """Variation du stock d'une boutique, positive ou négative."""
    VARIATION_MAX = 1000000

    boutique = serializers.PrimaryKeyRelatedField(queryset=Boutique.objects.all())
    variation = serializers.IntegerField(min_value=-VARIATION_MAX, max_value=VARIATION_MAX)


class ProductSerializer(serializers.ModelSerializer):
    photos = ProductImageSerializer(many=True, read_only=True)
    stocks = StockBoutiqueSerializer(many=True, read_only=True)
    reference = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=60,
        validators=[UniqueValidator(queryset=Product.objects.all(), message="Cette référence est déjà utilisée par un autre produit.")],
    )
    famille_nom = serializers.CharField(source='famille.nom', read_only=True, default='')
    famille_code = serializers.CharField(source='famille.code', read_only=True, default='')
    famille_icone = serializers.CharField(source='famille.icone', read_only=True, default='📦')
    famille_couleur = serializers.CharField(source='famille.couleur', read_only=True, default='#007a3d')
    famille_image = serializers.CharField(source='famille.image', read_only=True, default='')
    type_stock_nom = serializers.CharField(source='type_stock.nom', read_only=True, default='')
    type_stock_code = serializers.CharField(source='type_stock.code', read_only=True, default='')
    rayon_nom = serializers.ReadOnlyField(source='rayon.nom')
    category_nom = serializers.ReadOnlyField(source='category.nom')
    stock_total = serializers.ReadOnlyField()
    stock_general = serializers.IntegerField(source='stock_total', read_only=True)
    statut_stock = serializers.ReadOnlyField()

    class Meta:
        model = Product
        fields = '__all__'
        # La photo principale découle des photos envoyées : elle ne se choisit pas directement.
        read_only_fields = ['image']
        extra_kwargs = {
            'nom': {'error_messages': {'required': "Saisissez le nom du produit.", 'blank': "Saisissez le nom du produit."}},
            # Le formulaire de l'admin arrive en multipart, où un booléen absent vaut « non » :
            # sans cette valeur, chaque produit créé naîtrait masqué du site.
            'is_active': {'default': True},
            'famille': {
                'required': True,
                'allow_null': False,
                'error_messages': {
                    'required': "Choisissez la famille du produit.",
                    'null': "Choisissez la famille du produit.",
                    'does_not_exist': "Cette famille n'existe plus.",
                },
            },
            'prix_vente': {
                'min_value': 1,
                'max_value': ENTIER_MAX,
                'error_messages': {
                    'required': "Saisissez le prix de vente.",
                    'invalid': "Le prix doit être un nombre entier.",
                    'min_value': "Le prix doit être supérieur à 0.",
                    'max_value': "Ce prix est trop grand.",
                },
            },
            'prix_gros': {
                'min_value': 1,
                'max_value': ENTIER_MAX,
                'error_messages': {
                    'invalid': "Le prix de gros doit être un nombre entier.",
                    'min_value': "Le prix de gros doit être supérieur à 0.",
                    'max_value': "Ce prix est trop grand.",
                },
            },
            'seuil_alerte': {
                'min_value': 0,
                'max_value': ENTIER_MAX,
                'error_messages': {
                    'invalid': "Le seuil d'alerte doit être un nombre entier.",
                    'min_value': "Le seuil d'alerte ne peut pas être négatif.",
                    'max_value': "Ce seuil est trop grand.",
                },
            },
        }

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Le catalogue est public, mais le coût d'achat (et donc la marge) reste interne.
        request = self.context.get('request')
        if request is None or not est_membre_du_personnel(request):
            data.pop('cout_achat', None)
        return data


def retirer_du_stock(produit, boutique, quantite):
    """Retire une quantité vendue du stock de la boutique, sans descendre sous zéro. Retourne ce qui reste."""
    stock, _ = StockBoutique.objects.get_or_create(produit=produit, boutique=boutique)
    stock.quantite = max(0, stock.quantite - quantite)
    stock.save(update_fields=['quantite'])
    return stock.quantite


class SaleItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = SaleItem
        fields = '__all__'
        extra_kwargs = {'vente': {'required': False}}


class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True, required=False)
    boutique = serializers.PrimaryKeyRelatedField(
        queryset=Boutique.objects.filter(statut='Active'),
        error_messages={
            'required': "Choisissez la boutique de la vente.",
            'null': "Choisissez la boutique de la vente.",
            'does_not_exist': "Cette boutique n'est pas ouverte à la vente.",
        },
    )

    class Meta:
        model = Sale
        fields = '__all__'
        read_only_fields = ['boutique_nom', 'caissier']

    @transaction.atomic
    def create(self, validated_data):
        validated_data.pop('items', None)
        items_data = self.context.get('request').data.get('items', []) if self.context.get('request') else []
        boutique = validated_data['boutique']
        sale = Sale.objects.create(boutique_nom=boutique.nom, **validated_data)

        for item_data in items_data:
            produit_id = item_data.get('produit')
            produit = None
            stock_apres = None
            qty = float(item_data.get('quantite', 1))
            if produit_id:
                try:
                    # Le verrou sur le produit empêche deux ventes de s'écraser, comme pour les ajustements.
                    produit = Product.objects.select_for_update().get(id=produit_id)
                    stock_apres = retirer_du_stock(produit, boutique, int(qty))
                except Product.DoesNotExist:
                    pass

            SaleItem.objects.create(
                vente=sale,
                produit=produit,
                nom_produit=item_data.get('nom_produit', getattr(produit, 'nom', 'Article')),
                reference_produit=item_data.get('reference_produit', getattr(produit, 'reference', '')),
                prix_unitaire=item_data.get('prix_unitaire', 0),
                quantite=item_data.get('quantite', 1),
                total_ligne=item_data.get('total_ligne', 0)
            )
            noter(
                Mouvement.VENTE, self.context['request'].user, boutique=boutique, produit=produit,
                produit_nom=item_data.get('nom_produit', ''), quantite=-int(qty), stock_apres=stock_apres,
                montant=item_data.get('total_ligne', 0), reference=sale.reference,
            )
        return sale


class CommandeItemSerializer(serializers.ModelSerializer):
    unite = serializers.CharField(source='produit.unite', read_only=True, default='')

    class Meta:
        model = CommandeItem
        fields = ['id', 'produit', 'nom_produit', 'prix_unitaire', 'quantite', 'total_ligne', 'unite']
        read_only_fields = fields


class BoutiqueRetraitSerializer(serializers.ModelSerializer):
    """Ce que le site public montre d'une boutique où l'on vient chercher sa commande."""

    class Meta:
        model = Boutique
        fields = ['id', 'nom', 'localisation', 'quartier', 'ville', 'telephone', 'horaires', 'lien_map']
        read_only_fields = fields


class CommandeDirecteSerializer(serializers.ModelSerializer):
    """Commande vue par le personnel : tout le détail, articles et vente du retrait compris."""
    items = CommandeItemSerializer(many=True, read_only=True)
    est_expiree = serializers.ReadOnlyField()
    code = serializers.CharField(source='numero_commande', read_only=True)
    boutique_info = BoutiqueRetraitSerializer(source='boutique', read_only=True)
    vente_reference = serializers.CharField(source='vente.reference', read_only=True, default='')

    class Meta:
        model = CommandeDirecte
        fields = '__all__'
        read_only_fields = ['numero_commande', 'client', 'telephone_normalise', 'vente', 'date_retrait', 'date_commande', 'total']


class LigneNouvelleCommandeSerializer(serializers.Serializer):
    produit = serializers.IntegerField(error_messages={'invalid': "Un produit du panier est invalide.", 'required': "Un produit du panier est invalide."})
    quantite = serializers.IntegerField(
        min_value=1, max_value=999,
        error_messages={
            'invalid': "Saisissez une quantité entière.",
            'min_value': "La quantité doit être d'au moins 1.",
            'max_value': "999 au maximum par produit.",
        },
    )


class NouvelleCommandeSerializer(serializers.Serializer):
    """
    Commande passée sur le site, avec ou sans compte. Le prix vient toujours du catalogue :
    le navigateur n'envoie que les produits, les quantités et la boutique de retrait.
    """
    LIGNES_MAX = 50

    boutique = serializers.PrimaryKeyRelatedField(
        queryset=Boutique.objects.filter(statut='Active', is_siege=False),
        error_messages={
            'required': "Choisissez la boutique où vous viendrez chercher votre commande.",
            'null': "Choisissez la boutique où vous viendrez chercher votre commande.",
            'does_not_exist': "Cette boutique ne prend pas de commandes en ce moment. Choisissez-en une autre.",
            'incorrect_type': "Choisissez la boutique où vous viendrez chercher votre commande.",
        },
    )
    client_nom = serializers.CharField(max_length=150, required=False, allow_blank=True, trim_whitespace=True,
                                       error_messages={'max_length': "Le nom est trop long (150 caractères au maximum)."})
    client_telephone = serializers.CharField(max_length=50, required=False, allow_blank=True)
    items = LigneNouvelleCommandeSerializer(
        many=True, allow_empty=False,
        error_messages={'empty': "Votre panier est vide.", 'not_a_list': "Votre panier est vide.", 'required': "Votre panier est vide."},
    )

    def validate_items(self, lignes):
        quantites = {}
        for ligne in lignes:
            quantites[ligne['produit']] = quantites.get(ligne['produit'], 0) + ligne['quantite']
        if len(quantites) > self.LIGNES_MAX:
            raise serializers.ValidationError(f"{self.LIGNES_MAX} produits différents au maximum par commande.")

        produits = Product.objects.in_bulk(list(quantites))
        for produit_id, quantite in quantites.items():
            produit = produits.get(produit_id)
            if produit is None or not produit.is_active or not produit.prix_vente:
                raise serializers.ValidationError("Un produit de votre panier n'est plus en vente. Retirez-le, puis réessayez.")
            if quantite > 999:
                raise serializers.ValidationError(f"{produit.nom} : 999 au maximum.")
        return [(produits[produit_id], quantite) for produit_id, quantite in quantites.items()]

    def validate(self, attrs):
        client = self.context.get('client')
        if client is not None:
            # Connecté : la commande est au nom du compte, quoi qu'envoie le navigateur.
            attrs['client_nom'], attrs['client_telephone'] = client.nom_complet, client.telephone
        else:
            erreurs = {}
            if not attrs.get('client_nom', '').strip():
                erreurs['client_nom'] = "Saisissez votre nom."
            if not telephone_valide(attrs.get('client_telephone', '')):
                erreurs['client_telephone'] = "Saisissez votre numéro de téléphone (8 chiffres)."
            if erreurs:
                raise serializers.ValidationError(erreurs)

        # Le stock n'est pas réservé, mais on ne promet pas ce que la boutique n'a pas.
        boutique = attrs['boutique']
        stocks = dict(
            StockBoutique.objects.filter(boutique=boutique, produit__in=[produit for produit, _ in attrs['items']])
            .values_list('produit_id', 'quantite')
        )
        manques = [
            f"{produit.nom} (il en reste {stocks.get(produit.id, 0)})"
            for produit, quantite in attrs['items'] if quantite > stocks.get(produit.id, 0)
        ]
        if manques:
            raise serializers.ValidationError({'items': f"Pas assez de stock à {boutique.nom} pour : {', '.join(manques)}."})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        lignes = validated_data['items']
        commande = CommandeDirecte.objects.create(
            client=self.context.get('client'),
            client_nom=validated_data['client_nom'].strip(),
            client_telephone=formater_telephone(validated_data['client_telephone']),
            boutique=validated_data['boutique'],
            boutique_retrait=validated_data['boutique'].nom,
            total=sum(produit.prix_vente * quantite for produit, quantite in lignes),
            statut='EN_ATTENTE',
        )
        CommandeItem.objects.bulk_create([
            CommandeItem(
                commande=commande, produit=produit, nom_produit=produit.nom, prix_unitaire=produit.prix_vente,
                quantite=quantite, total_ligne=produit.prix_vente * quantite,
            )
            for produit, quantite in lignes
        ])
        return commande


class SuiviCommandeSerializer(serializers.ModelSerializer):
    """
    Commande vue par le client. Retrouvée avec son seul code, elle ne montre ni le nom complet
    ni le numéro de téléphone ; dans son compte (`complet`), le client voit tout.
    """
    code = serializers.CharField(source='numero_commande')
    boutique = BoutiqueRetraitSerializer(read_only=True)
    items = CommandeItemSerializer(many=True, read_only=True)
    client_nom = serializers.SerializerMethodField()
    client_telephone = serializers.SerializerMethodField()

    class Meta:
        model = CommandeDirecte
        fields = ['code', 'statut', 'date_commande', 'date_expiration', 'date_retrait', 'boutique', 'boutique_retrait',
                  'items', 'total', 'client_nom', 'client_telephone']
        read_only_fields = fields

    def get_client_nom(self, obj):
        if self.context.get('complet'):
            return obj.client_nom
        prenom, _, reste = obj.client_nom.strip().partition(' ')
        return f"{prenom} {reste.strip()[:1]}.".strip() if reste.strip() else prenom

    def get_client_telephone(self, obj):
        return obj.client_telephone if self.context.get('complet') else masquer_telephone(obj.client_telephone)


class MouvementSerializer(serializers.ModelSerializer):
    type_libelle = serializers.CharField(source='get_type_display', read_only=True)

    class Meta:
        model = Mouvement
        fields = [
            'id', 'type', 'type_libelle', 'date', 'utilisateur', 'utilisateur_nom', 'boutique', 'boutique_nom',
            'produit_nom', 'quantite', 'stock_apres', 'montant', 'reference', 'description',
        ]


class StaffProfileSerializer(serializers.ModelSerializer):
    role_label = serializers.CharField(source='get_role_display', read_only=True)
    initials = serializers.ReadOnlyField(source='avatar_initials')
    boutique = serializers.PrimaryKeyRelatedField(
        queryset=Boutique.objects.filter(statut='Active'),
        required=False,
        allow_null=True,
        error_messages={'does_not_exist': "Cette boutique n'est pas ouverte."},
    )
    boutique_nom = serializers.CharField(source='boutique.nom', read_only=True, default='')

    class Meta:
        model = StaffProfile
        fields = [
            'id', 'user', 'nom_complet', 'username', 'email', 'telephone', 'matricule', 'role', 'role_label',
            'boutique', 'boutique_nom', 'statut', 'initials', 'mot_de_passe_provisoire', 'created_at',
        ]
        # `user` ne se choisit pas : le lier à la main permettrait de s'emparer d'un compte existant.
        read_only_fields = ['user', 'mot_de_passe_provisoire']
        extra_kwargs = {
            'nom_complet': {'error_messages': {'required': "Saisissez le nom de l'utilisateur.", 'blank': "Saisissez le nom de l'utilisateur."}},
            'role': {'required': True, 'error_messages': {'invalid_choice': "Ce rôle n'existe pas.", 'required': "Choisissez le rôle."}},
            'username': {'required': False, 'allow_blank': True, 'allow_null': True, 'validators': []},
        }

    def validate_username(self, value):
        compte_actuel = self.instance.user_id if self.instance else None
        profil_actuel = self.instance.pk if self.instance else None
        deja_pris = (
            User.objects.exclude(pk=compte_actuel).filter(username__iexact=value).exists()
            or StaffProfile.objects.exclude(pk=profil_actuel).filter(username__iexact=value).exists()
        )
        if value and deja_pris:
            raise serializers.ValidationError("Ce nom d'utilisateur est déjà pris.")
        return value

    def validate(self, data):
        profil = self.instance
        role = data.get('role', profil.role if profil else None)
        statut = data.get('statut', profil.statut if profil else 'Actif')

        if role == StaffProfile.CAISSIERE:
            boutique = data.get('boutique', profil.boutique if profil else None)
            if boutique is None:
                raise serializers.ValidationError({'boutique': "Choisissez la boutique de la caissière."})

        if profil is not None and profil.role == StaffProfile.SUPER_ADMIN and profil.statut == 'Actif':
            perd_ses_droits = role != StaffProfile.SUPER_ADMIN or statut != 'Actif'
            if perd_ses_droits:
                if profil.user == self.context['request'].user:
                    raise serializers.ValidationError({'detail': "Vous ne pouvez pas retirer les droits de votre propre compte."})
                autres = StaffProfile.objects.filter(role=StaffProfile.SUPER_ADMIN, statut='Actif').exclude(pk=profil.pk)
                if not autres.exists():
                    raise serializers.ValidationError({'detail': "Il doit rester au moins un super admin actif."})
        return data


class BoutiqueSerializer(serializers.ModelSerializer):
    caissieres = serializers.SerializerMethodField()
    caissiere_principale = serializers.SerializerMethodField()

    class Meta:
        model = Boutique
        fields = '__all__'

    def get_caissieres(self, obj):
        return [
            {'id': profil.id, 'nom_complet': profil.nom_complet, 'username': profil.username, 'telephone': profil.telephone, 'statut': profil.statut}
            for profil in obj.caissieres.all()
        ]

    def get_caissiere_principale(self, obj):
        caissieres = self.get_caissieres(obj)
        return caissieres[0] if caissieres else None


class ClientPublicSerializer(serializers.ModelSerializer):
    """Ce qu'un client voit de sa propre fiche : ni les notes du personnel, ni ses statistiques."""

    class Meta:
        model = Client
        fields = ['id', 'nom_complet', 'telephone', 'email', 'quartier']
        read_only_fields = fields


class ClientSerializer(serializers.ModelSerializer):
    type_client_label = serializers.CharField(source='get_type_client_display', read_only=True)
    commandes_count = serializers.IntegerField(source='commandes.count', read_only=True)
    dernieres_commandes = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = '__all__'
        extra_kwargs = {'mot_de_passe': {'write_only': True, 'required': False, 'allow_blank': True}}

    def validate_mot_de_passe(self, value):
        refuser_mot_de_passe_faible(value)
        return make_password(value) if value else value

    def validate(self, attrs):
        # Un champ vide conserve le mot de passe actuel.
        if not attrs.get('mot_de_passe'):
            attrs.pop('mot_de_passe', None)
        return attrs

    def get_dernieres_commandes(self, obj):
        recentes = obj.commandes.all()[:5]
        return [
            {
                'id': c.id,
                'numero_commande': c.numero_commande,
                'total': c.total,
                'statut': c.statut,
                'statut_label': c.get_statut_display(),
                'boutique_retrait': c.boutique_retrait,
                'date_commande': c.date_commande
            }
            for c in recentes
        ]




