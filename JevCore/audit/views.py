from base.views import BaseViewSet, CreateListMixin
from .serializers import AuditLogSerializer
from .filters import AuditLogFilter
from .models import AuditLog


class AuditLogViewSet(CreateListMixin, BaseViewSet):
    queryset = AuditLog.objects.order_by('pk')
    serializer_class = AuditLogSerializer
    filterset_class = AuditLogFilter
    search_fields = ["model_name", "object_repr", "user_agent"]
    ordering_fields = ["id", "action", "model_name", "timestamp"]
