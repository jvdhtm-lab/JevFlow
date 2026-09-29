"""Explicit backend filters for decisions (documented for Swagger)."""
import django_filters

from base.constants import (
    APPROVAL_REQUEST_STATUS_CHOICES,
    APPROVAL_TOOL_CHOICES,
    APPROVAL_TOOL_VIA_CHOICES,
    DECISION_NODE_TYPE_CHOICES,
    DECISION_RUN_STATUS_CHOICES,
    DECISION_TRIGGER_CHOICES,
    STATUS_CHOICES,
)
from .models import (
    DecisionEdge, DecisionMap, DecisionNode, DecisionRun,
    ApprovalTool, ApprovalRequest,
)


class DecisionMapFilter(django_filters.FilterSet):
    name = django_filters.CharFilter(
        lookup_expr='icontains', label='Name contains',
        help_text='Case-insensitive substring match on map name.')
    integration = django_filters.NumberFilter(
        field_name='integration', lookup_expr='exact', label='Integration ID',
        help_text='Exact linked integration ID.')
    version = django_filters.CharFilter(
        lookup_expr='exact', label='Version', help_text='Exact version string.')
    is_active = django_filters.BooleanFilter(label='Is active', help_text='Exact boolean match.')
    trigger_source = django_filters.ChoiceFilter(
        choices=DECISION_TRIGGER_CHOICES, label='Trigger source',
        help_text='Exact source: webhook, manual, schedule or event.')
    status = django_filters.ChoiceFilter(
        choices=STATUS_CHOICES, label='Status', help_text='Exact record status.')

    class Meta:
        model = DecisionMap
        fields = ['id', 'name', 'integration', 'version', 'is_active',
                  'trigger_source', 'status']


class DecisionNodeFilter(django_filters.FilterSet):
    map = django_filters.NumberFilter(
        field_name='map', lookup_expr='exact', label='Map ID',
        help_text='Exact parent decision-map ID (used by the graphical editor).')
    node_key = django_filters.CharFilter(
        lookup_expr='exact', label='Node key', help_text='Exact node key within the map.')
    node_type = django_filters.ChoiceFilter(
        choices=DECISION_NODE_TYPE_CHOICES, label='Node type',
        help_text='Exact type: trigger, rule, classification, prioritization, decision, action, branch or approval.')
    title = django_filters.CharFilter(
        lookup_expr='icontains', label='Title contains',
        help_text='Case-insensitive substring match on node title.')
    status = django_filters.ChoiceFilter(
        choices=STATUS_CHOICES, label='Status', help_text='Exact record status.')

    class Meta:
        model = DecisionNode
        fields = ['id', 'map', 'node_key', 'node_type', 'title', 'status']


class DecisionEdgeFilter(django_filters.FilterSet):
    map = django_filters.NumberFilter(
        field_name='map', lookup_expr='exact', label='Map ID',
        help_text='Exact parent decision-map ID.')
    source = django_filters.NumberFilter(
        field_name='source', lookup_expr='exact', label='Source node ID',
        help_text='Exact source DecisionNode ID.')
    target = django_filters.NumberFilter(
        field_name='target', lookup_expr='exact', label='Target node ID',
        help_text='Exact target DecisionNode ID.')
    label = django_filters.CharFilter(
        lookup_expr='icontains', label='Label contains',
        help_text='Case-insensitive substring match on edge label.')
    priority = django_filters.NumberFilter(
        field_name='priority', lookup_expr='exact', label='Priority',
        help_text='Exact edge priority.')
    status = django_filters.ChoiceFilter(
        choices=STATUS_CHOICES, label='Status', help_text='Exact record status.')

    class Meta:
        model = DecisionEdge
        fields = ['id', 'map', 'source', 'target', 'label', 'priority', 'status']


class DecisionRunFilter(django_filters.FilterSet):
    map = django_filters.NumberFilter(
        field_name='map', lookup_expr='exact', label='Map ID',
        help_text='Exact parent decision-map ID (used by the runs view filter).')
    status = django_filters.ChoiceFilter(
        choices=DECISION_RUN_STATUS_CHOICES, label='Run status',
        help_text='Exact status: pending, running, decided, escalated or failed.')
    decided_route = django_filters.CharFilter(
        lookup_expr='exact', label='Decided route',
        help_text='Exact route chosen by the engine: proceed_fast, deep_review, split_task or block.')
    confidence_min = django_filters.NumberFilter(
        field_name='confidence', lookup_expr='gte', label='Min confidence',
        help_text='Runs with confidence greater than or equal to this (0..1).')
    confidence_max = django_filters.NumberFilter(
        field_name='confidence', lookup_expr='lte', label='Max confidence',
        help_text='Runs with confidence less than or equal to this (0..1).')
    executed_action = django_filters.CharFilter(
        lookup_expr='icontains', label='Executed action contains',
        help_text='Case-insensitive substring match on executed action.')
    started_after = django_filters.DateTimeFilter(
        field_name='started_at', lookup_expr='gte', label='Started after',
        help_text='Runs started at or after this ISO datetime.')
    started_before = django_filters.DateTimeFilter(
        field_name='started_at', lookup_expr='lte', label='Started before',
        help_text='Runs started at or before this ISO datetime.')

    class Meta:
        model = DecisionRun
        fields = ['id', 'map', 'status', 'decided_route',
                  'confidence_min', 'confidence_max', 'executed_action',
                  'started_after', 'started_before']


class ApprovalToolFilter(django_filters.FilterSet):
    tool_type = django_filters.ChoiceFilter(
        choices=APPROVAL_TOOL_CHOICES, label='Tool type',
        help_text='Exact type: message or email.')
    via = django_filters.ChoiceFilter(
        choices=APPROVAL_TOOL_VIA_CHOICES, label='Via',
        help_text='Exact send mode: integration or hook.')
    integration = django_filters.NumberFilter(
        field_name='integration', lookup_expr='exact', label='Integration ID',
        help_text='Exact integration ID.')
    webhook_endpoint = django_filters.NumberFilter(
        field_name='webhook_endpoint', lookup_expr='exact', label='Hook ID',
        help_text='Exact outbound hook ID.')
    status = django_filters.ChoiceFilter(
        choices=STATUS_CHOICES, label='Status', help_text='Exact record status.')

    class Meta:
        model = ApprovalTool
        fields = ['id', 'tool_type', 'via', 'integration', 'webhook_endpoint',
                  'status']


class ApprovalRequestFilter(django_filters.FilterSet):
    map = django_filters.NumberFilter(
        field_name='map', lookup_expr='exact', label='Map ID',
        help_text='Exact parent decision-map ID.')
    run = django_filters.NumberFilter(
        field_name='run', lookup_expr='exact', label='Run ID',
        help_text='Exact parent decision-run ID.')
    token = django_filters.CharFilter(
        lookup_expr='exact', label='Token',
        help_text='Exact review token from the auto-generated approval URL.')
    status = django_filters.ChoiceFilter(
        choices=APPROVAL_REQUEST_STATUS_CHOICES, label='Status',
        help_text='Exact status: pending, approved or declined.')

    class Meta:
        model = ApprovalRequest
        fields = ['id', 'map', 'run', 'token', 'status']
