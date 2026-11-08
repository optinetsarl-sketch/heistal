import hashlib
import os
import re
import secrets
from datetime import timedelta
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models.signals import post_delete
from django.dispatch import receiver
from django.contrib.auth.hashers import check_password, identify_hasher, make_password
from django.contrib.auth.models import User
from django.utils import timezone

from .telephones import formater_telephone, normaliser_telephone


def _est_empreinte(valeur):
    """Vrai si la valeur est déjà une empreinte de mot de passe produite par Django."""
    try:
        identify_hasher(valeur)
    except ValueError:
        return False
    return True



class Rayon(models.Model):
    """
    Rayon ou zone de froid dans le magasin Heistal Togo (Bacs, Bahuts, Armoires -18°C)
    """
    nom = models.CharField(max_length=150, unique=True, help_text="Nom du rayon (ex: Rayon Poissons & Mers)")
    code = models.CharField(max_length=50, unique=True, help_text="Code rayon (ex: RAY-POISS-01)")
    temperature = models.CharField(max_length=50, default="-18°C Surgelé")
    zone_magasin = models.CharField(max_length=100, default="Zone Centrale - Bacs Bahuts")
    description = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['nom']

    def __str__(self):
        return f"{self.nom} ({self.temperature})"


def code_disponible(modele, prefixe, nom):
    """Crée un code libre à partir du nom : après une suppression, le simple compte des lignes en redonnerait un déjà pris."""
    initiales = re.sub(r'[^A-Za-z0-9]', '', nom)[:4].upper()
    numero = modele.objects.count() + 1
    while modele.objects.filter(code=f"{prefixe}-{initiales}-{numero:02d}").exists():
        numero += 1
    return f"{prefixe}-{initiales}-{numero:02d}"


class Famille(models.Model):
    """
    Famille de produit Heistal Togo (Poissons, Volailles, Viandes, Frites & Légumes, etc.)
    """
    nom = models.CharField(max_length=150, unique=True, help_text="Nom de la famille de produit (ex: Famille Poissons & Mers)")
    code = models.CharField(max_length=50, unique=True, blank=True, help_text="Code famille (ex: FAM-POISS-01)")
    description = models.TextField(blank=True, default="")
    icone = models.CharField(max_length=30, blank=True, default="📦", help_text="Icône emoji ou symbole")
    couleur = models.CharField(max_length=30, blank=True, default="#007a3d", help_text="Code couleur HEX")
    image = models.TextField(blank=True, default="", help_text="Image représentative (URL, chemin relatif ou base64)")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['nom']
        verbose_name = "Famille de produit"
        verbose_name_plural = "Familles de produits"

    def __str__(self):
        return f"{self.nom} ({self.code})"

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = code_disponible(Famille, 'FAM', self.nom)
        super().save(*args, **kwargs)


class Category(models.Model):
    """
    Catégorie de produits rattachée à une famille ou un rayon
    """
    nom = models.CharField(max_length=150, unique=True)
    slug = models.SlugField(max_length=150, unique=True)
    famille = models.ForeignKey(Famille, on_delete=models.SET_NULL, null=True, blank=True, related_name='categories')
    rayon = models.ForeignKey(Rayon, on_delete=models.SET_NULL, null=True, blank=True, related_name='categories')
    description = models.TextField(blank=True, default="")

    class Meta:
        verbose_name_plural = "Catégories"
        ordering = ['nom']

    def __str__(self):
        return self.nom


class TypeStock(models.Model):
    """
    Type de stock (ex: Stock Magasin, Stock Central, Chambre Froide, Stock Réserve, Congélateur Bahut...)
    """
    nom = models.CharField(max_length=150, unique=True, help_text="Nom du type de stock (ex: Stock Magasin, Stock Central...)")
    code = models.CharField(max_length=50, unique=True, blank=True, help_text="Code type de stock (ex: STK-MAG-01)")
    description = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['nom']
        verbose_name = "Type de stock"
        verbose_name_plural = "Types de stock"

    def __str__(self):
        return f"{self.nom} ({self.code})"

    def save(self, *args, **kwargs):
        if not self.code and self.nom:
            self.code = code_disponible(TypeStock, 'STK', self.nom)
        super().save(*args, **kwargs)


class Product(models.Model):
    """
    Produit surgelé disponible à la vente et affecté à une famille de produit précise
    """
    UNITE_CHOICES = [
        ('kg', 'Kilogramme (kg)'),
        ('carton', 'Carton'),
        ('piece', 'Pièce'),
        ('sachet', 'Sachet'),
    ]

    nom = models.CharField(max_length=200)
    reference = models.CharField(max_length=60, unique=True, help_text="Référence ou Code-barres SKU")
    # Tout produit appartient à une famille : l'API l'exige et une famille utilisée ne peut pas être supprimée.
    famille = models.ForeignKey(Famille, on_delete=models.PROTECT, null=True, blank=True, related_name='produits')
    type_stock = models.ForeignKey(TypeStock, on_delete=models.SET_NULL, null=True, blank=True, related_name='produits')
    rayon = models.ForeignKey(Rayon, on_delete=models.SET_NULL, null=True, blank=True, related_name='produits')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='produits')
    
    # Emplacement physique dans le magasin / bac
    emplacement_bac = models.CharField(max_length=100, blank=True, default="Bac 01", help_text="Ex: Bac A-02, Armoire 03")
    temperature_conservation = models.CharField(max_length=50, default="-18°C Surgelé")

    # Prix en Francs CFA
    prix_vente = models.PositiveIntegerField(help_text="Prix unitaire de vente client (FCFA)")
    prix_gros = models.PositiveIntegerField(blank=True, null=True, help_text="Prix de vente carton / B2B (FCFA)")
    cout_achat = models.PositiveIntegerField(blank=True, null=True, help_text="Coût fournisseur d'achat (FCFA)")

    unite = models.CharField(max_length=50, default='kg', blank=True, help_text="Unité de vente (ex: kg, carton, pièce, sachet, barquette...)")
    seuil_alerte = models.IntegerField(default=10, help_text="Seuil minimum d'alerte stock faible")

    image = models.CharField(max_length=300, blank=True, default="", help_text="Photo principale (vide : l'image de la famille est affichée)")
    description = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['nom']

    def __str__(self):
        return f"{self.nom} ({self.prix_vente} FCFA)"

    def save(self, *args, **kwargs):
        # Personne n'a à inventer une référence : elle est créée si le champ reste vide.
        while not self.reference:
            candidate = f"HST-{secrets.token_hex(3).upper()}"
            if not Product.objects.filter(reference=candidate).exists():
                self.reference = candidate
        super().save(*args, **kwargs)

    def actualiser_photo_principale(self):
        premiere = ProductImage.objects.filter(produit=self).first()
        self.image = premiere.image if premiere else ''
        self.save(update_fields=['image', 'updated_at'])

    @property
    def stock_total(self):
        return sum(stock.quantite for stock in self.stocks.all())

    @property
    def statut_stock(self):
        total = self.stock_total
        if total <= 0:
            return "Rupture"
        if total <= self.seuil_alerte:
            return "Faible"
        return "Normal"


class ProductImage(models.Model):
    """
    Photo d'un produit. La plus ancienne est la photo principale, recopiée dans Product.image.
    """
    produit = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='photos')
    image = models.CharField(max_length=300, help_text="Adresse du fichier (ex: /media/produits/produit_ab12cd34.jpg)")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['id']
        verbose_name = "Photo de produit"
        verbose_name_plural = "Photos de produits"

    def __str__(self):
        return f"Photo de {self.produit.nom}"


@receiver(post_delete, sender=ProductImage)
def supprimer_fichier_photo(sender, instance, **kwargs):
    """Libère le disque, y compris quand le produit entier est supprimé."""
    if instance.image.startswith(f"{settings.MEDIA_URL}produits/"):
        chemin = os.path.join(settings.MEDIA_ROOT, 'produits', os.path.basename(instance.image))
        if os.path.exists(chemin):
            os.remove(chemin)


class Sale(models.Model):
    """
    Vente enregistrée en caisse (Point de Vente)
    """
    PAIEMENT_CHOICES = [
        ('Espèces', 'Espèces (Cash)'),
        ('TMoney', 'TMoney Togo'),
        ('Flooz', 'Moov Flooz'),
        ('Carte', 'Carte Bancaire'),
    ]

    reference = models.CharField(max_length=60, unique=True, help_text="Réf ticket ex: VTE-20261018-001")
    boutique = models.ForeignKey('Boutique', on_delete=models.PROTECT, null=True, blank=True, related_name='ventes')
    boutique_nom = models.CharField(max_length=150, blank=True, default="", help_text="Nom de la boutique au moment de la vente, pour l'historique")
    client_nom = models.CharField(max_length=150, default="Client Comptoir")
    client_tel = models.CharField(max_length=50, blank=True, default="")
    
    mode_paiement = models.CharField(max_length=30, choices=PAIEMENT_CHOICES, default='Espèces')
    sous_total = models.PositiveIntegerField(default=0)
    remise = models.PositiveIntegerField(default=0)
    total_ttc = models.PositiveIntegerField(default=0)
    montant_recu = models.PositiveIntegerField(default=0)
    monnaie_rendue = models.PositiveIntegerField(default=0)

    caissier = models.CharField(max_length=100, default="Caissier Heistal")
    statut = models.CharField(max_length=30, default="Validée")
    notes = models.TextField(blank=True, default="")
    date_vente = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date_vente']

    def __str__(self):
        return f"Vente {self.reference} - {self.total_ttc} FCFA ({self.boutique_nom})"


class SaleItem(models.Model):
    """
    Ligne d'article dans une vente
    """
    vente = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='items')
    produit = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True)
    nom_produit = models.CharField(max_length=200)
    reference_produit = models.CharField(max_length=60, blank=True, default="")
    prix_unitaire = models.PositiveIntegerField()
    quantite = models.DecimalField(max_digits=10, decimal_places=2, default=1.0)
    total_ligne = models.PositiveIntegerField()

    def __str__(self):
        return f"{self.quantite} x {self.nom_produit} ({self.total_ligne} FCFA)"


class Client(models.Model):
    """
    Base de données des Clients Heistal Togo (particuliers, ménages, restaurants, hôtels, grossistes)
    Permet le suivi des commandes, la fidélité, et la connexion à l'espace client.
    """
    TYPE_CLIENT_CHOICES = [
        ('PARTICULIER', 'Particulier / Foyer'),
        ('RESTAURANT', 'Restaurant / Maquis'),
        ('HOTEL', 'Hôtel / Complexe hôtelier'),
        ('GROSSISTE', 'Grossiste / Revendeur B2B'),
    ]

    user = models.OneToOneField(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='client_profile')
    nom_complet = models.CharField(max_length=150, help_text="Nom et prénom du client ou raison sociale")
    telephone = models.CharField(max_length=50, unique=True, help_text="Numéro de téléphone principal (T-Money, Flooz, Appel)")
    telephone_normalise = models.CharField(max_length=20, blank=True, default="", db_index=True, editable=False, help_text="Chiffres du numéro, sans indicatif : sert à reconnaître un client")
    telephone_secondaire = models.CharField(max_length=50, blank=True, default="", help_text="Numéro WhatsApp ou alternatif")
    email = models.EmailField(max_length=150, blank=True, null=True, help_text="Adresse email (optionnel)")
    mot_de_passe = models.CharField(max_length=128, blank=True, default="", help_text="Empreinte du mot de passe de l'espace client (vide : connexion impossible)")
    type_client = models.CharField(max_length=30, choices=TYPE_CLIENT_CHOICES, default='PARTICULIER')
    adresse = models.CharField(max_length=255, blank=True, default="", help_text="Adresse ou repère de livraison à Lomé")
    ville = models.CharField(max_length=100, default="Lomé")
    quartier = models.CharField(max_length=150, blank=True, default="", help_text="Quartier à Lomé (ex: Tokoin, Adidogomé, Bè...)")
    boutique_preferee = models.CharField(max_length=150, default="Boutique Tokoin Wuiti", help_text="Boutique favorite pour le retrait des commandes")

    total_commandes = models.PositiveIntegerField(default=0, help_text="Nombre total de commandes passées")
    total_depense = models.PositiveIntegerField(default=0, help_text="Montant total des achats en FCFA")
    points_fidelite = models.PositiveIntegerField(default=0, help_text="Points de fidélité cumulés")
    est_actif = models.BooleanField(default=True)
    notes = models.TextField(blank=True, default="", help_text="Notes ou préférences (ex: découpe spéciale, habitué)")

    date_inscription = models.DateTimeField(auto_now_add=True)
    derniere_commande = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-date_inscription']
        verbose_name = "Client / Utilisateur Web"
        verbose_name_plural = "Clients / Utilisateurs Web"

    def __str__(self):
        return f"{self.nom_complet} ({self.telephone}) - {self.get_type_client_display()}"

    def save(self, *args, **kwargs):
        # Filet de sécurité : quel que soit le chemin d'écriture, jamais de mot de passe en clair en base.
        if self.mot_de_passe and not _est_empreinte(self.mot_de_passe):
            self.mot_de_passe = make_password(self.mot_de_passe)
        self.telephone_normalise = normaliser_telephone(self.telephone)
        super().save(*args, **kwargs)

    def verifier_mot_de_passe(self, mot_de_passe):
        return check_password(mot_de_passe, self.mot_de_passe)

    @property
    def a_un_compte(self):
        return bool(self.mot_de_passe)

    @classmethod
    def fiche_du_numero(cls, telephone):
        """La fiche d'un numéro, quelle que soit son écriture : celle qui a un compte d'abord, sinon la plus ancienne."""
        chiffres = normaliser_telephone(telephone)
        if not chiffres:
            return None
        fiches = cls.objects.filter(telephone_normalise=chiffres).order_by('id')
        return fiches.exclude(mot_de_passe='').first() or fiches.first()


# Sans 0, O, 1, I ni L : un code se lit et se dicte sans confusion.
ALPHABET_CODE_COMMANDE = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'


def normaliser_code_commande(texte):
    """« k7m 4qx », « K7M4QX » ou « k7m-4qx » deviennent « K7M-4QX ». Un ancien numéro (CMD-…) reste tel quel."""
    texte = str(texte or '').strip().upper()
    brut = re.sub(r'[^A-Z0-9]', '', texte)
    return f'{brut[:3]}-{brut[3:]}' if len(brut) == 6 else texte


def nouveau_code_commande():
    while True:
        brut = ''.join(secrets.choice(ALPHABET_CODE_COMMANDE) for _ in range(6))
        code = f'{brut[:3]}-{brut[3:]}'
        if not CommandeDirecte.objects.filter(numero_commande=code).exists():
            return code


class CommandeDirecte(models.Model):
    """
    Commande directe passée en ligne sur le site web sans obligation de créer un compte.
    Délai de récupération en boutique : 24 heures maximum.
    """
    STATUT_CHOICES = [
        ('EN_ATTENTE', 'En attente de retrait (24h)'),
        ('PRETE', 'Prête en boutique'),
        ('RECUPEREE', 'Récupérée par le client'),
        ('EXPIREE', 'Expirée (>24h non récupérée)'),
        ('ANNULEE', 'Annulée'),
    ]

    client = models.ForeignKey(Client, on_delete=models.SET_NULL, null=True, blank=True, related_name='commandes')
    numero_commande = models.CharField(max_length=50, unique=True, blank=True, help_text="Code de la commande, à taper en boutique (ex : K7M-4QX)")
    client_nom = models.CharField(max_length=150, help_text="Nom complet de la personne")
    client_telephone = models.CharField(max_length=50, help_text="Numéro de téléphone du client")
    telephone_normalise = models.CharField(max_length=20, blank=True, default="", db_index=True, editable=False)
    boutique = models.ForeignKey('Boutique', on_delete=models.PROTECT, null=True, blank=True, related_name='commandes', help_text="Boutique où le client vient chercher sa commande")
    delai_recuperation = models.CharField(max_length=50, default="24 heures", help_text="Délai de récupération garanti")
    date_commande = models.DateTimeField(auto_now_add=True)
    date_expiration = models.DateTimeField(blank=True, null=True, help_text="Échéance limite de retrait (commande + 24h)")
    boutique_retrait = models.CharField(max_length=150, default="Boutique Tokoin Wuiti", help_text="Point de vente pour le retrait")
    total = models.PositiveIntegerField(default=0, help_text="Montant total de la commande en FCFA")
    statut = models.CharField(max_length=30, choices=STATUT_CHOICES, default='EN_ATTENTE')
    notes = models.TextField(blank=True, default="")
    vente = models.OneToOneField(Sale, on_delete=models.SET_NULL, null=True, blank=True, related_name='commande', help_text="Vente enregistrée en caisse au retrait")
    date_retrait = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-date_commande']
        verbose_name = "Commande directe web"
        verbose_name_plural = "Commandes directes web"

    def __str__(self):
        return f"{self.numero_commande} - {self.client_nom} ({self.total} FCFA)"

    def save(self, *args, **kwargs):
        if not self.numero_commande:
            self.numero_commande = nouveau_code_commande()
        if not self.date_expiration:
            self.date_expiration = (self.date_commande or timezone.now()) + timedelta(hours=24)
        if self.boutique_id and not self.boutique_retrait:
            self.boutique_retrait = self.boutique.nom
        self.telephone_normalise = normaliser_telephone(self.client_telephone)

        # Chaque numéro a sa fiche client : la commande s'y rattache, avec ou sans compte.
        if self.telephone_normalise and not self.client_id:
            self.client = Client.fiche_du_numero(self.client_telephone) or Client.objects.create(
                telephone=formater_telephone(self.client_telephone),
                nom_complet=self.client_nom or 'Client Heistal',
                boutique_preferee=self.boutique_retrait or 'Boutique Tokoin Wuiti',
            )

        super().save(*args, **kwargs)

    @classmethod
    def expirer_les_commandes_depassees(cls):
        """Une commande non retirée dans les 24 heures passe en « Expirée »."""
        cls.objects.filter(statut='EN_ATTENTE', date_expiration__lt=timezone.now()).update(statut='EXPIREE')

    @classmethod
    def par_code(cls, texte):
        code = normaliser_code_commande(texte)
        if not code:
            return None
        return cls.objects.select_related('boutique', 'vente').filter(numero_commande=code).first()

    @property
    def est_expiree(self):
        if self.statut in ['RECUPEREE', 'ANNULEE']:
            return False
        if self.date_expiration and timezone.now() > self.date_expiration:
            return True
        return False


class CommandeItem(models.Model):
    """
    Ligne d'article dans une commande directe
    """
    commande = models.ForeignKey(CommandeDirecte, on_delete=models.CASCADE, related_name='items')
    produit = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True)
    nom_produit = models.CharField(max_length=200)
    prix_unitaire = models.PositiveIntegerField(default=0)
    quantite = models.PositiveIntegerField(default=1)
    total_ligne = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.quantite} x {self.nom_produit} ({self.total_ligne} FCFA)"

    def save(self, *args, **kwargs):
        self.total_ligne = self.prix_unitaire * self.quantite
        super().save(*args, **kwargs)


class StaffProfile(models.Model):
    """
    Compte d'un employé. Quatre rôles seulement : ce que chacun peut faire est décrit dans permissions.py.
    Un compte ne se supprime jamais : on le désactive, pour garder l'historique de ses actions.
    """
    SUPER_ADMIN = 'SUPER_ADMIN'
    SERVICE_COMMERCIAL = 'SERVICE_COMMERCIAL'
    CONTROLEUR = 'CONTROLEUR'
    CAISSIERE = 'CAISSIERE'

    ROLE_CHOICES = [
        (SUPER_ADMIN, 'Super admin'),
        (SERVICE_COMMERCIAL, 'Service commercial'),
        (CONTROLEUR, 'Contrôleur'),
        (CAISSIERE, 'Caissière'),
    ]

    DEPARTEMENT_CHOICES = [
        ('DIRECTION', 'Direction Générale & Présidence'),
        ('SECRETARIAT', 'Secrétariat'),
        ('DAF', 'Direction Administrative et Financière (DAF)'),
        ('COMMERCIAL', 'Service Commercial'),
    ]

    SERVICE_RATTACHE_CHOICES = [
        ('DIRECTION_GENERALE', 'Direction Générale'),
        ('SECRETARIAT_APPUI', 'Secrétariat & Appui Administratif'),
        ('DAF_FINANCES', 'Direction Administrative et Financière'),
        ('COMPTABILITE', 'Comptabilité (Saisie, Contrôle & États)'),
        ('CAISSE', 'Caisse (Encaissements & Arrêtés)'),
        ('SERVICE_COMMERCIAL', 'Service Commercial & Supervision'),
        ('BOUTIQUE_TOKOIN', 'Boutique Tokoin Wuiti'),
        ('BOUTIQUE_ADIDOGOME', 'Boutique Adidogomé'),
    ]

    STATUT_CHOICES = [
        ('Actif', 'Actif'),
        ('Inactif', 'Inactif'),
    ]

    NIVEAU_ACCES_CHOICES = [
        ('ADMIN_TOTAL', 'Accès Total Super-Admin (PDG / DG)'),
        ('GESTION_FINANCIERE', 'Gestion Financière (DAF / Comptabilité)'),
        ('GESTION_COMMERCIALE', 'Supervision Commerciale & Stocks (Commercial / Gestionnaire)'),
        ('CAISSE_POS', 'Opérateur Caisse POS (Caissières / Régie)'),
        ('VENTE_RAYON', 'Opérateur Vente & Rayon (Personnel de vente)'),
        ('ADMINISTRATIF', 'Gestion Administrative (Secrétariat)'),
    ]

    user = models.OneToOneField(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='staff_profile')
    nom_complet = models.CharField(max_length=150)
    username = models.CharField(max_length=100, unique=True, blank=True, null=True, help_text="Nom d'utilisateur simple")
    mot_de_passe = models.CharField(max_length=128, blank=True, default="", help_text="Saisie transitoire : hachée vers le compte Django à l'enregistrement, jamais conservée ici")
    email = models.CharField(max_length=150, blank=True, default="")
    telephone = models.CharField(max_length=50, blank=True, default="+228 ")
    matricule = models.CharField(max_length=50, blank=True, default="", help_text="Matricule employé (ex: HST-PDG-01, HST-DG-01)")
    actions_count = models.PositiveIntegerField(default=0, help_text="Nombre d'actions et opérations effectuées")


    role = models.CharField(max_length=40, choices=ROLE_CHOICES, default=CAISSIERE)
    departement = models.CharField(max_length=40, choices=DEPARTEMENT_CHOICES, default='DAF')
    service_rattache = models.CharField(max_length=40, choices=SERVICE_RATTACHE_CHOICES, default='CAISSE')

    # Lien hiérarchique direct (organigramme)
    superieur_hierarchique = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='collaborateurs_rattaches',
        help_text="Supérieur hiérarchique direct selon l'organigramme"
    )

    boutique = models.ForeignKey('Boutique', on_delete=models.SET_NULL, null=True, blank=True, related_name='caissieres', help_text="Boutique d'une caissière")
    mot_de_passe_provisoire = models.BooleanField(default=False, help_text="Le mot de passe donné par le super admin doit être changé à la prochaine connexion")
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='Actif')
    niveau_acces = models.CharField(max_length=30, choices=NIVEAU_ACCES_CHOICES, default='VENTE_RAYON')

    missions = models.TextField(blank=True, default="", help_text="Missions et attributions selon l'organigramme")
    avatar = models.CharField(max_length=10, blank=True, default="")
    date_embauche = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['id']
        verbose_name = "Profil Employé / Organigramme"
        verbose_name_plural = "Profils Employés / Organigramme"

    def __str__(self):
        return f"{self.nom_complet} [{self.get_role_display()}]"

    @property
    def avatar_initials(self):
        if self.avatar:
            return self.avatar
        parts = self.nom_complet.strip().split()
        if len(parts) >= 2:
            return f"{parts[0][0]}{parts[1][0]}".upper()
        elif len(parts) == 1 and len(parts[0]) > 0:
            return parts[0][:2].upper()
    def save(self, *args, **kwargs):
        # Seule une caissière travaille dans une boutique.
        if self.role != self.CAISSIERE:
            self.boutique = None

        # Générer un nom d'utilisateur si vide
        if not self.username and self.nom_complet:
            import re
            base = re.sub(r'[^a-z0-9]', '', self.nom_complet.strip().split()[0].lower()) or 'user'
            cand = base
            counter = 1
            while (
                StaffProfile.objects.exclude(pk=self.pk).filter(username=cand).exists()
                or User.objects.exclude(pk=self.user_id).filter(username=cand).exists()
            ):
                cand = f"{base}{counter}"
                counter += 1
            self.username = cand

        self._synchroniser_compte()
        super().save(*args, **kwargs)

    def _synchroniser_compte(self):
        """Aligne le compte Django sur le profil : le rôle et le statut décident seuls des droits."""
        compte = self.user
        if compte is None:
            if not self.username:
                return
            # Jamais de rattachement implicite à un compte existant : ce serait une prise de contrôle.
            if User.objects.filter(username=self.username).exists():
                raise ValidationError({'username': "Ce nom d'utilisateur est déjà pris."})
            compte = User(username=self.username)
            compte.set_unusable_password()

        compte.username = self.username
        est_super_admin = self.role == self.SUPER_ADMIN
        compte.is_staff = est_super_admin
        compte.is_superuser = est_super_admin
        compte.is_active = self.statut != 'Inactif'
        if self.email:
            compte.email = self.email
        if self.nom_complet:
            parts = self.nom_complet.strip().split(' ', 1)
            compte.first_name = parts[0]
            compte.last_name = parts[1] if len(parts) > 1 else ''

        nouveau_mot_de_passe = self.mot_de_passe
        if nouveau_mot_de_passe:
            compte.set_password(nouveau_mot_de_passe)
            self.mot_de_passe = ''
        compte.save()
        self.user = compte
        if nouveau_mot_de_passe:
            ApiToken.objects.filter(user=compte).delete()


class Boutique(models.Model):
    """
    Boutique physique et point de vente Heistal Togo
    """
    STATUT_CHOICES = [
        ('Active', 'Active (Ouverte)'),
        ('En travaux', 'En travaux / Rénovation'),
        ('Fermée', 'Fermée temporairement'),
    ]

    nom = models.CharField(max_length=150, unique=True, help_text="Nom de la boutique (ex: Boutique Tokoin Wuiti)")
    code = models.CharField(max_length=50, unique=True, blank=True, help_text="Code boutique (ex: BQT-TOK-01)")
    telephone = models.CharField(max_length=60, help_text="Numéro de téléphone (ex: +228 22 26 42 29)")
    email = models.EmailField(blank=True, default="")
    localisation = models.CharField(max_length=255, help_text="Adresse et repère physique (ex: Face station Total Tokoin Wuiti)")
    ville = models.CharField(max_length=100, default="Lomé")
    quartier = models.CharField(max_length=100, blank=True, default="")

    # Enregistrement map et géolocalisation GPS
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True, help_text="Latitude GPS (ex: 6.1485000)")
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True, help_text="Longitude GPS (ex: 1.2180000)")
    lien_map = models.URLField(max_length=500, blank=True, default="", help_text="Lien Google Maps ou OpenStreetMap")
    iframe_map = models.TextField(blank=True, default="", help_text="Code d'intégration Map")

    responsable = models.CharField(max_length=150, blank=True, default="Gestionnaire de Boutique")
    horaires = models.CharField(max_length=200, default="Lun - Sam: 07h30 - 20h00, Dim: 08h00 - 14h00")
    statut = models.CharField(max_length=30, choices=STATUT_CHOICES, default='Active')
    is_siege = models.BooleanField(default=False, help_text="Indique s'il s'agit du siège principal")
    image = models.CharField(max_length=300, blank=True, default="/store.jpg")
    description = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['nom']
        verbose_name = "Boutique / Point de Vente"
        verbose_name_plural = "Boutiques / Points de Vente"

    def __str__(self):
        return f"{self.nom} - {self.ville} ({self.telephone})"

    def save(self, *args, **kwargs):
        if not self.code:
            import re
            cleaned = re.sub(r'[^A-Za-z0-9]', '', self.nom)[:3].upper()
            self.code = f"BQT-{cleaned}-{Boutique.objects.count() + 1:02d}"
        if not self.lien_map and self.latitude and self.longitude:
            self.lien_map = f"https://www.google.com/maps?q={self.latitude},{self.longitude}"
        super().save(*args, **kwargs)


class StockBoutique(models.Model):
    """
    Quantité d'un produit dans une boutique. Pas de ligne : le produit n'y a jamais été stocké.
    """
    produit = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='stocks')
    boutique = models.ForeignKey(Boutique, on_delete=models.CASCADE, related_name='stocks')
    quantite = models.IntegerField(default=0)

    class Meta:
        ordering = ['boutique__nom']
        constraints = [models.UniqueConstraint(fields=['produit', 'boutique'], name='un_stock_par_produit_et_boutique')]
        verbose_name = "Stock en boutique"
        verbose_name_plural = "Stocks en boutique"

    def __str__(self):
        return f"{self.produit.nom} : {self.quantite} à {self.boutique.nom}"


class Mouvement(models.Model):
    """
    Journal de ce qui se passe dans chaque boutique et de ce que fait chaque employé.
    Les noms sont recopiés : une ligne reste lisible même si la boutique ou le produit disparaît.
    """
    VENTE = 'VENTE'
    ENTREE = 'ENTREE'
    SORTIE = 'SORTIE'
    STOCK_DEPART = 'STOCK_DEPART'
    PRODUIT = 'PRODUIT'
    COMPTE = 'COMPTE'
    CONNEXION = 'CONNEXION'

    TYPE_CHOICES = [
        (VENTE, 'Vente'),
        (ENTREE, 'Entrée de stock'),
        (SORTIE, 'Sortie de stock'),
        (STOCK_DEPART, 'Stock de départ'),
        (PRODUIT, 'Produit'),
        (COMPTE, 'Compte'),
        (CONNEXION, 'Connexion'),
    ]

    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    date = models.DateTimeField(default=timezone.now, db_index=True)
    utilisateur = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='mouvements')
    utilisateur_nom = models.CharField(max_length=150, blank=True, default="")
    boutique = models.ForeignKey(Boutique, on_delete=models.SET_NULL, null=True, blank=True, related_name='mouvements')
    boutique_nom = models.CharField(max_length=150, blank=True, default="")
    produit = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True, related_name='mouvements')
    produit_nom = models.CharField(max_length=200, blank=True, default="")
    quantite = models.IntegerField(null=True, blank=True, help_text="Positive pour une entrée, négative pour une sortie")
    stock_apres = models.IntegerField(null=True, blank=True)
    montant = models.PositiveIntegerField(null=True, blank=True)
    reference = models.CharField(max_length=60, blank=True, default="")
    description = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        ordering = ['-date', '-id']
        verbose_name = "Mouvement"
        verbose_name_plural = "Mouvements"

    def __str__(self):
        return f"{self.get_type_display()} - {self.date:%d/%m/%Y %H:%M}"


class ApiToken(models.Model):
    """
    Session de l'API, pour un employé (user) ou un client (client).
    Seule l'empreinte du jeton est stockée : une fuite de la base ne donne accès à aucune session.
    """
    DUREE_EMPLOYE = timedelta(hours=12)
    DUREE_CLIENT = timedelta(days=30)

    empreinte = models.CharField(max_length=64, unique=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='api_tokens')
    client = models.ForeignKey(Client, on_delete=models.CASCADE, null=True, blank=True, related_name='api_tokens')
    doit_changer_mot_de_passe = models.BooleanField(default=False, help_text="Session limitée au changement de mot de passe")
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    @staticmethod
    def empreinte_de(cle):
        return hashlib.sha256(cle.encode()).hexdigest()

    @classmethod
    def emettre(cls, user=None, client=None, doit_changer_mot_de_passe=False):
        """Ouvre une session et retourne le jeton, lisible uniquement à cet instant."""
        cls.objects.filter(expires_at__lte=timezone.now()).delete()
        cle = secrets.token_urlsafe(32)
        cls.objects.create(
            empreinte=cls.empreinte_de(cle),
            user=user,
            client=client,
            doit_changer_mot_de_passe=doit_changer_mot_de_passe,
            expires_at=timezone.now() + (cls.DUREE_EMPLOYE if user else cls.DUREE_CLIENT),
        )
        return cle


class Visite(models.Model):
    """
    Un visiteur du site public, un jour donné. Aucune adresse IP ni donnée personnelle :
    le visiteur est un identifiant tiré au hasard par son navigateur, gardé sur son appareil.
    Un même visiteur ne compte qu'une fois par jour ; ses pages vues s'additionnent.
    """
    jour = models.DateField(db_index=True)
    visiteur = models.CharField(max_length=64)
    pages_vues = models.PositiveIntegerField(default=1)
    premiere_visite = models.DateTimeField(auto_now_add=True)
    derniere_visite = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-jour']
        constraints = [models.UniqueConstraint(fields=['jour', 'visiteur'], name='une_visite_par_visiteur_et_par_jour')]
        verbose_name = "Visite du site"
        verbose_name_plural = "Visites du site"

    def __str__(self):
        return f"{self.jour} · {self.pages_vues} page(s)"
