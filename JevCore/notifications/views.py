from base.views import BaseViewSet, CreateListMixin
from .serializers import NotificationSerializer
from .filters import NotificationFilter
from .models import Notification


class NotificationViewSet(CreateListMixin, BaseViewSet):
    queryset = Notification.objects.order_by('pk')
    serializer_class = NotificationSerializer
    filterset_class = NotificationFilter
    search_fields = ["title", "message"]
    ordering_fields = ["id", "notification_type", "is_read", "created_at"]
