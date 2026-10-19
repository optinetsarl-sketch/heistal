from rest_framework import viewsets, status
from rest_framework.decorators import api_view, action
from rest_framework.response import Response
from .models import Rayon, Category, Product, Sale, SaleItem
from .serializers import RayonSerializer, CategorySerializer, ProductSerializer, SaleSerializer


class RayonViewSet(viewsets.ModelViewSet):
    queryset = Rayon.objects.all()
    serializer_class = RayonSerializer


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

    def get_queryset(self):
        qs = Product.objects.all()
        rayon_id = self.request.query_params.get('rayon')
        cat_id = self.request.query_params.get('category')
        search = self.request.query_params.get('search')
        
        if rayon_id:
            qs = qs.filter(rayon_id=rayon_id)
        if cat_id:
            qs = qs.filter(category_id=cat_id)
        if search:
            qs = qs.filter(nom__icontains=search) | qs.filter(reference__icontains=search)
        return qs

    @action(detail=True, methods=['post'])
    def adjust_stock(self, request, pk=None):
        product = self.get_object()
        delta = int(request.data.get('delta', 0))
        magasin = request.data.get('magasin', 'tokoin')
        
        if magasin == 'adidogome':
            product.stock_adidogome = max(0, product.stock_adidogome + delta)
        else:
            product.stock_tokoin = max(0, product.stock_tokoin + delta)
            
        product.save()
        return Response(ProductSerializer(product).data)


class SaleViewSet(viewsets.ModelViewSet):
    queryset = Sale.objects.all()
    serializer_class = SaleSerializer

    def get_queryset(self):
        qs = Sale.objects.all()
        boutique = self.request.query_params.get('boutique')
        if boutique:
            qs = qs.filter(boutique=boutique)
        return qs


@api_view(['POST'])
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
            'image': "/heistal_fish.jpg"
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
            'image': "/heistal_fish.jpg"
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
            'image': "/heistal_fish.jpg"
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
            'image': "/heistal_fish.jpg"
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
            'image': "/heistal_fish.jpg"
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
            'image': "/heistal_fish.jpg"
        }
    ]

    for p in sample_products:
        Product.objects.get_or_create(reference=p['reference'], defaults=p)

    return Response({
        'message': 'Données initialisées avec succès !',
        'rayons': Rayon.objects.count(),
        'produits': Product.objects.count()
    })
