from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    IntegrationViewSet, WebhookEndpointViewSet, SyncLogViewSet,
)

router = DefaultRouter()
router.register(r'integration', IntegrationViewSet)
router.register(r'webhook-endpoint', WebhookEndpointViewSet)
router.register(r'sync-log', SyncLogViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
