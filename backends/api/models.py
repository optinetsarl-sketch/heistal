from django.db import models


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


class Category(models.Model):
    """
    Catégorie de produits rattachée à un rayon
    """
    nom = models.CharField(max_length=150, unique=True)
    slug = models.SlugField(max_length=150, unique=True)
    rayon = models.ForeignKey(Rayon, on_delete=models.SET_NULL, null=True, blank=True, related_name='categories')
    description = models.TextField(blank=True, default="")

    class Meta:
        verbose_name_plural = "Catégories"
        ordering = ['nom']

    def __str__(self):
        return self.nom


class Product(models.Model):
    """
    Produit surgelé disponible à la vente et stocké dans un rayon précis
    """
    UNITE_CHOICES = [
        ('kg', 'Kilogramme (kg)'),
        ('carton', 'Carton'),
        ('piece', 'Pièce'),
        ('sachet', 'Sachet'),
    ]

    nom = models.CharField(max_length=200)
    reference = models.CharField(max_length=60, unique=True, help_text="Référence ou Code-barres SKU")
    rayon = models.ForeignKey(Rayon, on_delete=models.SET_NULL, null=True, blank=True, related_name='produits')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='produits')
    
    # Emplacement physique dans le rayon
    emplacement_bac = models.CharField(max_length=100, blank=True, default="Bac 01", help_text="Ex: Bac A-02, Armoire 03")
    temperature_conservation = models.CharField(max_length=50, default="-18°C Surgelé")

    # Prix en Francs CFA
    prix_vente = models.PositiveIntegerField(help_text="Prix unitaire de vente client (FCFA)")
    prix_gros = models.PositiveIntegerField(blank=True, null=True, help_text="Prix de vente carton / B2B (FCFA)")
    cout_achat = models.PositiveIntegerField(blank=True, null=True, help_text="Coût fournisseur d'achat (FCFA)")

    # Stocks séparés par boutique physique Heistal Togo
    stock_tokoin = models.IntegerField(default=50, help_text="Stock boutique Tokoin Wuiti")
    stock_adidogome = models.IntegerField(default=50, help_text="Stock boutique Adidogomé")
    unite = models.CharField(max_length=20, choices=UNITE_CHOICES, default='kg')
    seuil_alerte = models.IntegerField(default=10, help_text="Seuil minimum d'alerte stock faible")

    image = models.CharField(max_length=300, blank=True, default="/heistal_fish.jpg")
    description = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['nom']

    def __str__(self):
        return f"{self.nom} ({self.prix_vente} FCFA)"

    @property
    def stock_total(self):
        return self.stock_tokoin + self.stock_adidogome

    @property
    def statut_stock(self):
        total = self.stock_total
        if total <= 0:
            return "Rupture"
        if total <= self.seuil_alerte:
            return "Faible"
        return "Normal"


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

    BOUTIQUE_CHOICES = [
        ('Tokoin Wuiti', 'Boutique Tokoin Wuiti'),
        ('Adidogomé', 'Boutique Adidogomé'),
    ]

    reference = models.CharField(max_length=60, unique=True, help_text="Réf ticket ex: VTE-20261018-001")
    boutique = models.CharField(max_length=50, choices=BOUTIQUE_CHOICES, default='Tokoin Wuiti')
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
        return f"Vente {self.reference} - {self.total_ttc} FCFA ({self.boutique})"


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
