"""Explicit backend filters for integrations (documented for Swagger)."""
import django_filters

from base.constants import (
    INTEGRATION_PURPOSE_CHOICES,
    INTEGRATION_STATUS_CHOICES,
    INTEGRATION_TYPE_CHOICES,
    STATUS_CHOICES,
    SYNC_DIRECTION_CHOICES,
    SYNC_RESULT_CHOICES,
    WEBHOOK_DIRECTION_CHOICES,
    WEBHOOK_SOURCE_CHOICES,
)
from .models import Integration, SyncLog, WebhookEndpoint


class IntegrationFilter(django_filters.FilterSet):
    name = django_filters.CharFilter(
        lookup_expr='icontains', label='Name contains',
        help_text='Case-insensitive substring match on integration name.')
    integration_type = django_filters.ChoiceFilter(
        choices=INTEGRATION_TYPE_CHOICES, label='Integration type',
        help_text='Exact type: jira, github, gitlab, slack, teams, aws, gcp, azure_cloud, codex, outlook, generic_webhook, ...')
    purpose = django_filters.ChoiceFilter(
        choices=INTEGRATION_PURPOSE_CHOICES, label='Purpose',
        help_text='Exact purpose: user_auth (login providers, unrelated to webhooks) or action_trigger (external systems maps talk to).')
    connection_status = django_filters.ChoiceFilter(
        choices=INTEGRATION_STATUS_CHOICES, label='Connection status',
        help_text='Exact status: connected, disconnected, error or pending.')
    owner = django_filters.NumberFilter(
        field_name='owner', lookup_expr='exact', label='Owner user ID',
        help_text='Exact owner user ID.')
    status = django_filters.ChoiceFilter(
        choices=STATUS_CHOICES, label='Status', help_text='Exact record status.')
    last_sync_after = django_filters.DateTimeFilter(
        field_name='last_sync_at', lookup_expr='gte', label='Synced after',
        help_text='Integrations synced at or after this ISO datetime.')
    last_sync_before = django_filters.DateTimeFilter(
        field_name='last_sync_at', lookup_expr='lte', label='Synced before',
        help_text='Integrations synced at or before this ISO datetime.')

    class Meta:
        model = Integration
        fields = ['id', 'name', 'purpose', 'integration_type', 'connection_status',
                  'owner', 'status',
                  'last_sync_after', 'last_sync_before']


class WebhookEndpointFilter(django_filters.FilterSet):
    name = django_filters.CharFilter(
        lookup_expr='icontains', label='Name contains',
        help_text='Case-insensitive substring match on endpoint name.')
    integration = django_filters.NumberFilter(
        field_name='integration', lookup_expr='exact', label='Integration ID',
        help_text='Exact parent integration ID.')
    source = django_filters.ChoiceFilter(
        choices=WEBHOOK_SOURCE_CHOICES, label='Source',
        help_text='Exact source: jira, github, ci, slack, teams or generic.')
    direction = django_filters.ChoiceFilter(
        choices=WEBHOOK_DIRECTION_CHOICES, label='Direction',
        help_text='Exact direction: inbound (trigger receives) or outbound (action posts).')
    is_active = django_filters.BooleanFilter(label='Is active', help_text='Exact boolean match.')
    status = django_filters.ChoiceFilter(
        choices=STATUS_CHOICES, label='Status', help_text='Exact record status.')

    class Meta:
        model = WebhookEndpoint
        fields = ['id', 'name', 'integration', 'direction', 'source', 'is_active',
                  'status']


class SyncLogFilter(django_filters.FilterSet):
    integration = django_filters.NumberFilter(
        field_name='integration', lookup_expr='exact', label='Integration ID',
        help_text='Exact parent integration ID.')
    direction = django_filters.ChoiceFilter(
        choices=SYNC_DIRECTION_CHOICES, label='Direction',
        help_text='Exact direction: in (inbound) or out (outbound).')
    event_type = django_filters.CharFilter(
        lookup_expr='icontains', label='Event type contains',
        help_text='Case-insensitive substring match on event type.')
    result = django_filters.ChoiceFilter(
        choices=SYNC_RESULT_CHOICES, label='Result',
        help_text='Exact result: success, error or skipped.')
    duration_min = django_filters.NumberFilter(
        field_name='duration_ms', lookup_expr='gte', label='Min duration (ms)',
        help_text='Entries with duration_ms greater than or equal to this.')
    duration_max = django_filters.NumberFilter(
        field_name='duration_ms', lookup_expr='lte', label='Max duration (ms)',
        help_text='Entries with duration_ms less than or equal to this.')
    status = django_filters.ChoiceFilter(
        choices=STATUS_CHOICES, label='Status', help_text='Exact record status.')

    class Meta:
        model = SyncLog
        fields = ['id', 'integration', 'direction', 'event_type', 'result',
                  'duration_min', 'duration_max', 'status']
