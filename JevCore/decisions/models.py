from django.conf import settings
from django.db import models
from base.models import BaseModel, TenantBaseModel
from base.constants import (
    APPROVAL_REQUEST_STATUS_CHOICES,
    APPROVAL_TOOL_CHOICES,
    APPROVAL_TOOL_VIA_CHOICES,
    DECISION_MAP_CATEGORY_CHOICES,
    DECISION_NODE_TYPE_CHOICES,
    DECISION_RUN_STATUS_CHOICES,
)


class DecisionMap(TenantBaseModel):
    integration = models.ForeignKey(
        'integrations.Integration',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='decision_maps'
    )
    version = models.CharField(max_length=20, default='1.0.0')
    is_active = models.BooleanField(default=True)
    # ReactFlow layout: {"nodes": [{"id", "position": {"x", "y"}, ...}], "edges": [...]}
    layout = models.JSONField(null=True, blank=True)
    # Canonical YAML spec of the graph (nodes/edges). Regenerated on every
    # write path so the DB always holds the current graphical map as YAML.
    spec_yaml = models.TextField(blank=True, default='')
    category = models.CharField(
        max_length=20, choices=DECISION_MAP_CATEGORY_CHOICES, default='manual'
    )

    def refresh_spec_yaml(self):
        """Re-render spec_yaml from the current rows. Returns the YAML text."""
        from .yaml_spec import export_yaml

        self.spec_yaml = export_yaml(self)
        self.save(update_fields=['spec_yaml'])
        return self.spec_yaml


class DecisionNode(BaseModel):
    """A typed Jev question + layout position.

    config holds the Jev question, e.g.
    {"qtype": "choice|noul|score", "instructions": "...", "criteria": {...}}
    """
    map = models.ForeignKey(
        DecisionMap, on_delete=models.CASCADE, related_name='nodes'
    )
    node_key = models.CharField(max_length=50)  # e.g. trigger/rule/classify/...
    node_type = models.CharField(max_length=30, choices=DECISION_NODE_TYPE_CHOICES)
    title = models.CharField(max_length=200, null=True, blank=True)
    config = models.JSONField(null=True, blank=True)
    position_x = models.FloatField(default=0)
    position_y = models.FloatField(default=0)

    class Meta:
        unique_together = ['map', 'node_key']


class DecisionEdge(BaseModel):
    map = models.ForeignKey(
        DecisionMap, on_delete=models.CASCADE, related_name='edges'
    )
    source = models.ForeignKey(
        DecisionNode, on_delete=models.CASCADE, related_name='source_edges'
    )
    target = models.ForeignKey(
        DecisionNode, on_delete=models.CASCADE, related_name='target_edges'
    )
    label = models.CharField(max_length=200, null=True, blank=True)
    condition = models.JSONField(null=True, blank=True)
    priority = models.IntegerField(default=0)

    class Meta:
        ordering = ['priority', 'pk']


class DecisionRun(BaseModel):
    """A single evaluation pass: trigger_event in, typed answers out."""
    map = models.ForeignKey(
        DecisionMap, on_delete=models.CASCADE, related_name='runs'
    )
    trigger_event = models.JSONField(null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=DECISION_RUN_STATUS_CHOICES, default='pending'
    )
    answers = models.JSONField(null=True, blank=True)
    decided_route = models.CharField(max_length=30, null=True, blank=True)
    confidence = models.FloatField(null=True, blank=True)
    executed_action = models.CharField(max_length=200, null=True, blank=True)
    # Per-node outcomes of outgoing HTTP actions (see jev_engine.actions).
    action_results = models.JSONField(null=True, blank=True)
    error = models.TextField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)


class ApprovalTool(TenantBaseModel):
    """A predefined notification channel for approval nodes (outbound-only).

    Type is ``message`` (channel message) or ``email`` (with the auto-generated
    approve/decline link). Delivery is always outbound: ``via='integration'``
    posts through the bound integration's channel/credentials, ``via='hook'``
    through the bound outbound webhook endpoint. Active/inactive uses the
    inherited ``status`` (activated/deactivated). Approval nodes bind via
    ``config.approval_tool = <id>``.
    """
    tool_type = models.CharField(max_length=20, choices=APPROVAL_TOOL_CHOICES)
    via = models.CharField(
        max_length=20, choices=APPROVAL_TOOL_VIA_CHOICES, default='integration'
    )
    webhook_endpoint = models.ForeignKey(
        'integrations.WebhookEndpoint', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='approval_tools',
    )
    integration = models.ForeignKey(
        'integrations.Integration', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='approval_tools',
    )


class ApprovalRequest(TenantBaseModel):
    """One human decision on a run that reached an approval node.

    Created when a run's trace visits an approval node bound to a tool. The
    human opens the auto-generated review URL (login required) and approves
    or declines.
    """
    map = models.ForeignKey(
        DecisionMap, on_delete=models.CASCADE, related_name='approval_requests'
    )
    run = models.ForeignKey(
        DecisionRun, on_delete=models.CASCADE, null=True, blank=True,
        related_name='approval_requests',
    )
    node_key = models.CharField(max_length=50)
    approval_tool = models.ForeignKey(
        ApprovalTool, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='approval_requests',
    )
    token = models.CharField(max_length=100, unique=True)
    status = models.CharField(
        max_length=20, choices=APPROVAL_REQUEST_STATUS_CHOICES, default='pending'
    )
    # Human-readable "what am I approving", generated at notify time from the
    # trigger context (issue key, PR title, alert title, ...).
    summary = models.CharField(max_length=300, blank=True, default='')
    description = models.TextField(null=True, blank=True)
    payload = models.JSONField(null=True, blank=True)
    decided_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='approval_decisions',
    )
    decided_at = models.DateTimeField(null=True, blank=True)
