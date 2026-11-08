from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import statistiques
from .views import (
    FamilleViewSet, TypeStockViewSet, RayonViewSet, CategoryViewSet, ProductViewSet, SaleViewSet, MouvementViewSet,
    CommandeDirecteViewSet, StaffProfileViewSet, BoutiqueViewSet, ClientViewSet, seed_initial_data, login_api,
    logout_api, change_password_api, session_api
)

router = DefaultRouter()
router.register(r'familles', FamilleViewSet, basename='famille')
router.register(r'types-stock', TypeStockViewSet, basename='typestock')
router.register(r'stock-types', TypeStockViewSet, basename='stocktypes')
router.register(r'commandes', CommandeDirecteViewSet, basename='commande')
router.register(r'orders', CommandeDirecteViewSet, basename='order')
router.register(r'rayons', RayonViewSet)
router.register(r'categories', CategoryViewSet)
router.register(r'products', ProductViewSet)
router.register(r'sales', SaleViewSet)
router.register(r'mouvements', MouvementViewSet, basename='mouvement')
router.register(r'profiles', StaffProfileViewSet, basename='staffprofile')
router.register(r'users', StaffProfileViewSet, basename='staffuser')
router.register(r'clients', ClientViewSet, basename='client')
router.register(r'customers', ClientViewSet, basename='customer')
router.register(r'boutiques', BoutiqueViewSet, basename='boutique')
router.register(r'stores', BoutiqueViewSet, basename='store')


urlpatterns = [
    path('', include(router.urls)),
    path('seed/', seed_initial_data, name='seed_initial_data'),
    path('login/', login_api, name='login_api'),
    path('logout/', logout_api, name='logout_api'),
    path('session/', session_api, name='session_api'),
    path('change-password/', change_password_api, name='change_password_api'),
    path('visites/', statistiques.compter_visite, name='compter_visite'),
    path('statistiques/frequentation/', statistiques.frequentation, name='statistiques_frequentation'),
    path('statistiques/boutiques/', statistiques.boutiques, name='statistiques_boutiques'),
]


