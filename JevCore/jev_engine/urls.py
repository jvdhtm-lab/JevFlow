from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EnginePresetViewSet, EngineCallViewSet

router = DefaultRouter()
router.register(r'engine-preset', EnginePresetViewSet)
router.register(r'engine-call', EngineCallViewSet)

urlpatterns = [
    # /api/jev/decide/ — stateless decide endpoint (alias of the viewset action)
    path('jev/decide/', EngineCallViewSet.as_view({'post': 'decide'}), name='jev-decide'),
    path('', include(router.urls)),
]
