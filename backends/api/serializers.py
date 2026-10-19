from rest_framework import serializers
from .models import Rayon, Category, Product, Sale, SaleItem


class RayonSerializer(serializers.ModelSerializer):
    produits_count = serializers.IntegerField(source='produits.count', read_only=True)

    class Meta:
        model = Rayon
        fields = '__all__'


class CategorySerializer(serializers.ModelSerializer):
    rayon_nom = serializers.ReadOnlyField(source='rayon.nom')

    class Meta:
        model = Category
        fields = '__all__'


class ProductSerializer(serializers.ModelSerializer):
    rayon_nom = serializers.ReadOnlyField(source='rayon.nom')
    category_nom = serializers.ReadOnlyField(source='category.nom')
    stock_total = serializers.ReadOnlyField()
    statut_stock = serializers.ReadOnlyField()

    class Meta:
        model = Product
        fields = '__all__'


class SaleItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = SaleItem
        fields = '__all__'
        extra_kwargs = {'vente': {'required': False}}


class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True, required=False)

    class Meta:
        model = Sale
        fields = '__all__'

    def create(self, validated_data):
        validated_data.pop('items', None)
        items_data = self.context.get('request').data.get('items', []) if self.context.get('request') else []
        sale = Sale.objects.create(**validated_data)
        
        for item_data in items_data:
            produit_id = item_data.get('produit')
            produit = None
            if produit_id:
                try:
                    produit = Product.objects.get(id=produit_id)
                    # Déduire le stock selon la boutique de vente
                    qty = float(item_data.get('quantite', 1))
                    if sale.boutique == 'Adidogomé':
                        produit.stock_adidogome = max(0, produit.stock_adidogome - int(qty))
                    else:
                        produit.stock_tokoin = max(0, produit.stock_tokoin - int(qty))
                    produit.save()
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
        return sale
