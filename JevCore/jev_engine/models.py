from django.db import models
from base.models import BaseModel
from base.constants import ENGINE_PRESET_CHOICES


class EnginePreset(BaseModel):
    preset_type = models.CharField(
        max_length=20, choices=ENGINE_PRESET_CHOICES, default='custom'
    )
    model = models.CharField(max_length=100, default='jev-latest')
    config = models.JSONField(null=True, blank=True)


class EngineCall(BaseModel):
    preset = models.ForeignKey(
        EnginePreset, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='calls'
    )
    map = models.ForeignKey(
        'decisions.DecisionMap', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='engine_calls'
    )
    state = models.JSONField(null=True, blank=True)
    questions = models.JSONField(null=True, blank=True)
    answers = models.JSONField(null=True, blank=True)
    latency_ms = models.IntegerField(null=True, blank=True)
    created_by = models.ForeignKey(
        'identity_api.CustomUser', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='engine_calls'
    )
