from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DecisionMapViewSet, DecisionNodeViewSet,
    DecisionEdgeViewSet, DecisionRunViewSet,
    ApprovalToolViewSet, ApprovalRequestViewSet,
)

router = DefaultRouter()
router.register(r'decision-map', DecisionMapViewSet)
router.register(r'decision-node', DecisionNodeViewSet)
router.register(r'decision-edge', DecisionEdgeViewSet)
router.register(r'decision-run', DecisionRunViewSet)
router.register(r'approval-tool', ApprovalToolViewSet)
router.register(r'approval-request', ApprovalRequestViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
