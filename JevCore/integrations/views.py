import hashlib
import hmac

from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from base.views import BaseViewSet, CreateListMixin
from .models import Integration, WebhookEndpoint, SyncLog
from .serializers import (
    IntegrationSerializer, WebhookEndpointSerializer,
    IntegrationSerializer, SyncLogSerializer,
)
from .filters import (
    SyncLogFilter, IntegrationFilter,
    SyncLogFilter, WebhookEndpointFilter,
)

# Headers external systems use to sign webhook bodies.
SIGNATURE_HEADERS = ('X-Hub-Signature-256', 'X-Signature-256', 'X-Jira-Signature', 'X-Signature')


def _check_inbound_auth(endpoint, request):
    """Authenticate an inbound webhook call.

    Supported (when the endpoint has a secret): shared-secret header
    (`X-JevFlow-Secret`), `Authorization: Bearer <secret>`, `?secret=`, or an
    HMAC-SHA256 body signature (GitHub `X-Hub-Signature-256` style). Endpoints
    without a secret accept the call (dev convenience).
    """
    secret = endpoint.secret
    if not secret:
        return True

    provided = request.headers.get('X-JevFlow-Secret') or request.query_params.get('secret')
    if provided and hmac.compare_digest(str(provided), str(secret)):
        return True

    authz = request.headers.get('Authorization') or ''
    if authz.lower().startswith('bearer ') and hmac.compare_digest(authz[7:].strip(), str(secret)):
        return True

    body = request.body or b''
    expected = hmac.new(str(secret).encode(), body, hashlib.sha256).hexdigest()
    for header in SIGNATURE_HEADERS:
        sig = request.headers.get(header)
        if not sig:
            continue
        candidate = str(sig).split('=', 1)[-1].strip()
        if hmac.compare_digest(candidate, expected):
            return True
    return False


def _find_inbound_endpoint(request):
    """Match an inbound hook by its customer secret.

    Returns (secret, endpoint). Plain secret (header/query/Bearer) looks the
    hook up directly; otherwise we try the HMAC signatures against active
    inbound hooks. (None, None) when nothing matches.
    """
    provided = (
        request.headers.get('X-JevFlow-Secret')
        or request.query_params.get('secret')
    )
    authz = request.headers.get('Authorization') or ''
    if authz.lower().startswith('bearer '):
        provided = provided or authz[7:].strip()

    active = WebhookEndpoint.objects.filter(
        direction='inbound', is_active=True).select_related('integration')
    if provided:
        endpoint = active.filter(secret=str(provided)).first()
        if endpoint is not None:
            return str(provided), endpoint
        return None, None

    body = request.body or b''
    for endpoint in active.exclude(secret__isnull=True).exclude(secret=''):
        expected = hmac.new(str(endpoint.secret).encode(), body, hashlib.sha256).hexdigest()
        for header in SIGNATURE_HEADERS:
            sig = request.headers.get(header)
            if not sig:
                continue
            if hmac.compare_digest(str(sig).split('=', 1)[-1].strip(), expected):
                return str(endpoint.secret), endpoint
    return None, None


def _receive_for_endpoint(view, endpoint, request):
    """Shared inbound handling once the hook is identified."""
    payload = request.data if isinstance(request.data, dict) else {'payload': request.data}
    endpoint.last_received_at = timezone.now()
    endpoint.save(update_fields=['last_received_at'])

    from decisions.models import DecisionNode
    from jev_engine.views import run_map_for_trigger

    bound = (
        DecisionNode.objects
        .filter(node_type='trigger', config__webhook_endpoint=endpoint.id)
        .select_related('map')
    )
    payload_event = payload.get('event') if isinstance(payload, dict) else None
    runs = []
    for node in bound:
        if not node.map or not node.map.is_active:
            continue
        node_event = (node.config or {}).get('event')
        # Real event matching: if the payload carries an event, only trigger
        # maps whose trigger node expects that exact event.
        if payload_event and node_event and node_event != payload_event:
            continue
        runs.append(run_map_for_trigger(node.map, payload))

    SyncLog.objects.create(
        integration=endpoint.integration,
        account=endpoint.account,
        direction='in',
        event_type=f"webhook:{endpoint.source}",
        payload=payload,
        result='success',
        name=f"webhook {endpoint.id}",
    )
    return Response(
        {'endpoint': endpoint.id, 'source': endpoint.source, 'runs': runs},
        status=status.HTTP_200_OK,
    )


class IntegrationViewSet(CreateListMixin, BaseViewSet):
    queryset = Integration.objects.order_by('pk')
    serializer_class = IntegrationSerializer
    filterset_class = IntegrationFilter
    search_fields = ["name", "base_url", "credentials_hint"]
    ordering_fields = ["id", "name", "integration_type", "connection_status", "last_sync_at"]


class WebhookEndpointViewSet(CreateListMixin, BaseViewSet):
    queryset = WebhookEndpoint.objects.order_by('pk')
    serializer_class = WebhookEndpointSerializer
    filterset_class = WebhookEndpointFilter
    search_fields = ["name", "target_path"]
    ordering_fields = ["id", "name", "source", "last_received_at"]

    @action(
        methods=['post'], detail=False, url_path='receive',
        authentication_classes=[], permission_classes=[AllowAny],
    )
    def receive(self, request):
        """The ONE fixed inbound hook URL shared by every inbound hook.

        The per-customer secret (generated by us, given to the customer)
        identifies whose call it is: shared-secret header, Bearer, ?secret=,
        or HMAC signature. Every active map whose trigger node is bound to the
        matched inbound hook runs, with outgoing actions fired.
        """
        secret, endpoint = _find_inbound_endpoint(request)
        if endpoint is None:
            return Response({'detail': 'Authentication failed.'}, status=status.HTTP_403_FORBIDDEN)
        return _receive_for_endpoint(self, endpoint, request)

    @action(
        methods=['post'], detail=True, url_path='receive',
        authentication_classes=[], permission_classes=[AllowAny],
    )
    def receive_for_id(self, request, pk=None):
        """Back-compat alias: POST /api/webhook-endpoint/<id>/receive/."""
        endpoint = self.get_object()
        if endpoint.direction != 'inbound':
            return Response(
                {'detail': 'This hook is outbound; only inbound hooks receive calls.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not _check_inbound_auth(endpoint, request):
            return Response({'detail': 'Authentication failed.'}, status=status.HTTP_403_FORBIDDEN)
        return _receive_for_endpoint(self, endpoint, request)


class SyncLogViewSet(CreateListMixin, BaseViewSet):
    queryset = SyncLog.objects.order_by('pk')
    serializer_class = SyncLogSerializer
    filterset_class = SyncLogFilter
    search_fields = ["event_type", "error_msg"]
    ordering_fields = ["id", "event_type", "direction", "result", "duration_ms"]
