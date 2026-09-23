"""Explicit backend filters for audit (Swagger-documented)."""
import django_filters

from base.constants import AUDIT_ACTION_CHOICES
from .models import AuditLog


class AuditLogFilter(django_filters.FilterSet):
    user = django_filters.NumberFilter(
        field_name='user', lookup_expr='exact', label='User ID',
        help_text='Exact user ID that performed the action.')
    action = django_filters.ChoiceFilter(
        choices=AUDIT_ACTION_CHOICES, label='Action',
        help_text='Exact action: CREATE, UPDATE, DELETE, VIEW, LOGIN, LOGOUT, WEBHOOK or DECISION.')
    model_name = django_filters.CharFilter(
        lookup_expr='exact', label='Model name',
        help_text='Exact audited model name (e.g. DecisionMap).')
    object_id = django_filters.NumberFilter(
        field_name='object_id', lookup_expr='exact', label='Object ID',
        help_text='Exact audited object primary key.')
    object_repr = django_filters.CharFilter(
        lookup_expr='icontains', label='Object repr contains',
        help_text='Case-insensitive substring match on object representation.')
    timestamp_after = django_filters.DateTimeFilter(
        field_name='timestamp', lookup_expr='gte', label='After',
        help_text='Entries at or after this ISO datetime.')
    timestamp_before = django_filters.DateTimeFilter(
        field_name='timestamp', lookup_expr='lte', label='Before',
        help_text='Entries at or before this ISO datetime.')

    class Meta:
        model = AuditLog
        fields = ['id', 'user', 'action', 'model_name', 'object_id',
                  'object_repr', 'timestamp_after', 'timestamp_before']
