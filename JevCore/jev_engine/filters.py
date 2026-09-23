"""Explicit backend filters for jev_engine, audit, notifications (Swagger-documented)."""
import django_filters

from base.constants import ENGINE_PRESET_CHOICES, STATUS_CHOICES
from jev_engine.models import EngineCall, EnginePreset


class EnginePresetFilter(django_filters.FilterSet):
    name = django_filters.CharFilter(
        lookup_expr='icontains', label='Name contains',
        help_text='Case-insensitive substring match on preset name.')
    preset_type = django_filters.ChoiceFilter(
        choices=ENGINE_PRESET_CHOICES, label='Preset type',
        help_text='Exact type: route, model-route, tool-guard, research, completion or custom.')
    model = django_filters.CharFilter(
        lookup_expr='exact', label='Model', help_text='Exact Jev model identifier.')
    status = django_filters.ChoiceFilter(
        choices=STATUS_CHOICES, label='Status', help_text='Exact record status.')

    class Meta:
        model = EnginePreset
        fields = ['id', 'name', 'preset_type', 'model', 'status']


class EngineCallFilter(django_filters.FilterSet):
    preset = django_filters.NumberFilter(
        field_name='preset', lookup_expr='exact', label='Preset ID',
        help_text='Exact engine-preset ID.')
    map = django_filters.NumberFilter(
        field_name='map', lookup_expr='exact', label='Map ID',
        help_text='Exact decision-map ID.')
    created_by = django_filters.NumberFilter(
        field_name='created_by', lookup_expr='exact', label='Created-by user ID',
        help_text='Exact user ID that triggered the call.')
    latency_min = django_filters.NumberFilter(
        field_name='latency_ms', lookup_expr='gte', label='Min latency (ms)',
        help_text='Calls with latency_ms greater than or equal to this.')
    latency_max = django_filters.NumberFilter(
        field_name='latency_ms', lookup_expr='lte', label='Max latency (ms)',
        help_text='Calls with latency_ms less than or equal to this.')
    status = django_filters.ChoiceFilter(
        choices=STATUS_CHOICES, label='Status', help_text='Exact record status.')
    created_after = django_filters.DateTimeFilter(
        field_name='created_date_time', lookup_expr='gte', label='Created after',
        help_text='Calls created at or after this ISO datetime.')
    created_before = django_filters.DateTimeFilter(
        field_name='created_date_time', lookup_expr='lte', label='Created before',
        help_text='Calls created at or before this ISO datetime.')

    class Meta:
        model = EngineCall
        fields = ['id', 'preset', 'map', 'created_by',
                  'latency_min', 'latency_max', 'status',
                  'created_after', 'created_before']
