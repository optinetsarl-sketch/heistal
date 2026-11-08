from django.contrib import admin
from .models import Famille, TypeStock, Rayon, Category, Product, Sale, SaleItem, CommandeDirecte, CommandeItem, StaffProfile, StockBoutique, Boutique, Client




class ProductInline(admin.TabularInline):
    model = Product
    extra = 0
    fields = ('nom', 'reference', 'prix_vente', 'unite')


class StockBoutiqueInline(admin.TabularInline):
    model = StockBoutique
    extra = 0


@admin.register(Famille)
class FamilleAdmin(admin.ModelAdmin):
    list_display = ('nom', 'code', 'icone', 'couleur', 'created_at')
    search_fields = ('nom', 'code', 'description')
    inlines = [ProductInline]


@admin.register(TypeStock)
class TypeStockAdmin(admin.ModelAdmin):
    list_display = ('nom', 'code', 'created_at')
    search_fields = ('nom', 'code', 'description')
    inlines = [ProductInline]


@admin.register(Rayon)
class RayonAdmin(admin.ModelAdmin):
    list_display = ('nom', 'code', 'temperature', 'zone_magasin', 'created_at')
    search_fields = ('nom', 'code', 'zone_magasin')


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('nom', 'famille', 'rayon', 'slug')
    search_fields = ('nom', 'slug')
    prepopulated_fields = {'slug': ('nom',)}


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    inlines = [StockBoutiqueInline]
    list_display = ('nom', 'reference', 'famille', 'type_stock', 'prix_vente', 'stock_total', 'unite', 'statut_stock', 'is_active')
    list_filter = ('famille', 'type_stock', 'unite', 'is_active')
    search_fields = ('nom', 'reference', 'emplacement_bac')
    list_editable = ('prix_vente', 'is_active')


class SaleItemInline(admin.TabularInline):
    model = SaleItem
    extra = 0
    readonly_fields = ('nom_produit', 'reference_produit', 'prix_unitaire', 'quantite', 'total_ligne')


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = ('reference', 'boutique', 'client_nom', 'mode_paiement', 'total_ttc', 'caissier', 'date_vente')
    list_filter = ('boutique', 'mode_paiement', 'date_vente')
    search_fields = ('reference', 'client_nom', 'client_tel', 'caissier')
    inlines = [SaleItemInline]
    readonly_fields = ('date_vente',)


class CommandeItemInline(admin.TabularInline):
    model = CommandeItem
    extra = 0
    readonly_fields = ('nom_produit', 'prix_unitaire', 'quantite', 'total_ligne')


@admin.register(CommandeDirecte)
class CommandeDirecteAdmin(admin.ModelAdmin):
    list_display = ('numero_commande', 'client_nom', 'client_telephone', 'boutique_retrait', 'total', 'delai_recuperation', 'statut', 'date_commande', 'date_expiration')
    list_filter = ('statut', 'boutique_retrait', 'date_commande')
    search_fields = ('numero_commande', 'client_nom', 'client_telephone')
    inlines = [CommandeItemInline]
    readonly_fields = ('date_commande', 'date_expiration')


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ('nom_complet', 'telephone', 'type_client', 'quartier', 'ville', 'total_commandes', 'total_depense', 'est_actif', 'date_inscription')
    list_filter = ('type_client', 'est_actif', 'ville', 'boutique_preferee')
    search_fields = ('nom_complet', 'telephone', 'telephone_secondaire', 'email', 'quartier', 'adresse')
    readonly_fields = ('date_inscription', 'total_commandes', 'total_depense', 'derniere_commande')
    exclude = ('mot_de_passe',)


@admin.register(StaffProfile)
class StaffProfileAdmin(admin.ModelAdmin):
    list_display = ('matricule', 'nom_complet', 'role', 'boutique', 'statut')
    list_filter = ('role', 'boutique', 'statut')
    search_fields = ('nom_complet', 'matricule', 'email', 'telephone')
    raw_id_fields = ('superieur_hierarchique',)
    exclude = ('mot_de_passe',)

    def has_delete_permission(self, request, obj=None):
        return False  # Un compte se désactive, il ne se supprime pas.


@admin.register(Boutique)
class BoutiqueAdmin(admin.ModelAdmin):
    list_display = ('nom', 'code', 'telephone', 'ville', 'quartier', 'statut', 'is_siege')
    list_filter = ('ville', 'statut', 'is_siege')
    search_fields = ('nom', 'code', 'telephone', 'localisation', 'quartier')


