from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RayonViewSet, CategoryViewSet, ProductViewSet, SaleViewSet, seed_initial_data

router = DefaultRouter()
router.register(r'rayons', RayonViewSet)
router.register(r'categories', CategoryViewSet)
router.register(r'products', ProductViewSet)
router.register(r'sales', SaleViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('seed/', seed_initial_data, name='seed_initial_data'),
]
