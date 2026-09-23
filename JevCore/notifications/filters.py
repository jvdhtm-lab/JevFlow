"""Explicit backend filters for notifications (Swagger-documented)."""
import django_filters

from .models import Notification


class NotificationFilter(django_filters.FilterSet):
    recipient = django_filters.NumberFilter(
        field_name='recipient', lookup_expr='exact', label='Recipient user ID',
        help_text='Exact recipient user ID.')
    title = django_filters.CharFilter(
        lookup_expr='icontains', label='Title contains',
        help_text='Case-insensitive substring match on title.')
    notification_type = django_filters.CharFilter(
        lookup_expr='exact', label='Notification type',
        help_text='Exact type: integration_connected, webhook_received, decision_made, approval_needed, system, ...')
    is_read = django_filters.BooleanFilter(label='Is read', help_text='Exact boolean match.')
    created_after = django_filters.DateTimeFilter(
        field_name='created_at', lookup_expr='gte', label='Created after',
        help_text='Notifications created at or after this ISO datetime.')
    created_before = django_filters.DateTimeFilter(
        field_name='created_at', lookup_expr='lte', label='Created before',
        help_text='Notifications created at or before this ISO datetime.')

    class Meta:
        model = Notification
        fields = ['id', 'recipient', 'title', 'notification_type', 'is_read',
                  'created_after', 'created_before']
