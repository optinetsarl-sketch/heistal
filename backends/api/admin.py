from django.contrib import admin
from .models import Rayon, Category, Product, Sale, SaleItem


class ProductInline(admin.TabularInline):
    model = Product
    extra = 0
    fields = ('nom', 'reference', 'prix_vente', 'stock_tokoin', 'stock_adidogome', 'unite')


@admin.register(Rayon)
class RayonAdmin(admin.ModelAdmin):
    list_display = ('nom', 'code', 'temperature', 'zone_magasin', 'created_at')
    search_fields = ('nom', 'code', 'zone_magasin')
    inlines = [ProductInline]


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('nom', 'rayon', 'slug')
    search_fields = ('nom', 'slug')
    prepopulated_fields = {'slug': ('nom',)}


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('nom', 'reference', 'rayon', 'category', 'prix_vente', 'stock_tokoin', 'stock_adidogome', 'statut_stock', 'is_active')
    list_filter = ('rayon', 'category', 'temperature_conservation', 'is_active')
    search_fields = ('nom', 'reference', 'emplacement_bac')
    list_editable = ('prix_vente', 'stock_tokoin', 'stock_adidogome', 'is_active')


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
