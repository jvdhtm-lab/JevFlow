from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from django.utils import timezone

from base.views import BaseViewSet, CreateListMixin
from .models import (
    DecisionMap, DecisionNode, DecisionEdge, DecisionRun,
    ApprovalTool, ApprovalRequest,
)
from .serializers import (
    DecisionMapSerializer, DecisionNodeSerializer,
    DecisionEdgeSerializer, DecisionRunSerializer,
    ApprovalToolSerializer, ApprovalRequestSerializer,
)
from .filters import (
    DecisionEdgeFilter, DecisionMapFilter,
    DecisionNodeFilter, DecisionRunFilter,
    ApprovalToolFilter, ApprovalRequestFilter,
)
from .yaml_spec import SpecError, import_yaml, sync_doc


def _touch_map(node_or_edge):
    """Regenerate the parent map's YAML after a direct row write."""
    try:
        node_or_edge.map.refresh_spec_yaml()
    except Exception:
        pass


class DecisionMapViewSet(CreateListMixin, BaseViewSet):
    queryset = DecisionMap.objects.order_by('pk')
    serializer_class = DecisionMapSerializer
    filterset_class = DecisionMapFilter
    search_fields = ["name", "description"]
    ordering_fields = ["id", "name", "version", "trigger_source"]

    @action(methods=['post'], detail=True, url_path='save-graph')
    def save_graph(self, request, pk=None):
        """Full graphical save: sync rows from {nodes, edges} + refresh YAML.

        nodes: [{key, type, title?, config?, x?, y?}]
        edges: [{source_key|from, target_key|to, label?, condition?, priority?}]
        """
        decision_map = self.get_object()
        payload = request.data or {}

        def norm_edge(e):
            return {
                'from': e.get('from', e.get('source_key')),
                'to': e.get('to', e.get('target_key')),
                'label': e.get('label', ''),
                'condition': e.get('condition') or {},
                'priority': e.get('priority', 0),
            }

        doc = {
            'version': decision_map.version,
            'name': decision_map.name,
            'trigger_source': decision_map.trigger_source,
            'nodes': [
                {
                    'key': n.get('key'),
                    'type': n.get('type', n.get('node_type')),
                    'title': n.get('title', ''),
                    'config': n.get('config') or {},
                    'position': {'x': n.get('x', 0), 'y': n.get('y', 0)},
                }
                for n in (payload.get('nodes') or [])
            ],
            'edges': [norm_edge(e) for e in (payload.get('edges') or [])],
        }
        try:
            counts = sync_doc(decision_map, doc)
        except SpecError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        decision_map.refresh_from_db()
        return Response({
            'id': decision_map.id,
            'spec_yaml': decision_map.spec_yaml,
            **counts,
        })

    @action(methods=['post'], detail=True, url_path='import-yaml')
    def import_yaml_action(self, request, pk=None):
        """Replace the graph from YAML text: {spec_yaml: "..."}."""
        decision_map = self.get_object()
        text = (request.data or {}).get('spec_yaml', '')
        if not text or not text.strip():
            return Response({'detail': 'spec_yaml is required.'},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            counts = import_yaml(decision_map, text)
        except SpecError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        decision_map.refresh_from_db()
        return Response({
            'id': decision_map.id,
            'spec_yaml': decision_map.spec_yaml,
            **counts,
        })


class DecisionNodeViewSet(CreateListMixin, BaseViewSet):
    queryset = DecisionNode.objects.order_by('pk')
    serializer_class = DecisionNodeSerializer
    filterset_class = DecisionNodeFilter
    search_fields = ["node_key", "title"]
    ordering_fields = ["id", "node_key", "node_type"]

    def perform_create(self, serializer):
        _touch_map(serializer.save())

    def perform_update(self, serializer):
        _touch_map(serializer.save())

    def perform_destroy(self, instance):
        parent = instance.map
        instance.delete()
        _touch_map(parent)


class DecisionEdgeViewSet(CreateListMixin, BaseViewSet):
    queryset = DecisionEdge.objects.order_by('pk')
    serializer_class = DecisionEdgeSerializer
    filterset_class = DecisionEdgeFilter
    search_fields = ["label"]
    ordering_fields = ["id", "priority", "label"]

    def perform_create(self, serializer):
        _touch_map(serializer.save())

    def perform_update(self, serializer):
        _touch_map(serializer.save())

    def perform_destroy(self, instance):
        parent = instance.map
        instance.delete()
        _touch_map(parent)


class DecisionRunViewSet(CreateListMixin, BaseViewSet):
    queryset = DecisionRun.objects.order_by('pk')
    serializer_class = DecisionRunSerializer
    filterset_class = DecisionRunFilter
    search_fields = ["decided_route", "executed_action", "error"]
    ordering_fields = ["id", "status", "decided_route", "confidence", "started_at"]


class ApprovalToolViewSet(CreateListMixin, BaseViewSet):
    queryset = ApprovalTool.objects.order_by('pk')
    serializer_class = ApprovalToolSerializer
    filterset_class = ApprovalToolFilter
    search_fields = ["name", "target"]
    ordering_fields = ["id", "tool_type", "is_active"]


class ApprovalRequestViewSet(CreateListMixin, BaseViewSet):
    queryset = ApprovalRequest.objects.order_by('pk')
    serializer_class = ApprovalRequestSerializer
    filterset_class = ApprovalRequestFilter
    search_fields = ["node_key", "token"]
    ordering_fields = ["id", "status", "decided_at"]

    def _decide(self, request, approve):
        req = self.get_object()
        if req.status != 'pending':
            return Response(
                {'detail': f'Already {req.status}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        req.status = 'approved' if approve else 'declined'
        req.decided_by = request.user if request.user.is_authenticated else None
        req.decided_at = timezone.now()
        req.save(update_fields=['status', 'decided_by', 'decided_at'])
        return Response(self.get_serializer(req).data)

    @action(methods=['post'], detail=True, url_path='approve')
    def approve(self, request, pk=None):
        """Human approves from the auto-generated review URL (login required)."""
        return self._decide(request, True)

    @action(methods=['post'], detail=True, url_path='decline')
    def decline(self, request, pk=None):
        """Human declines from the auto-generated review URL (login required)."""
        return self._decide(request, False)
