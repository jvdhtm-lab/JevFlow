import base64
import time

from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from base.views import BaseViewSet, CreateListMixin
from decisions.models import DecisionRun
from .actions import execute_run_actions, pending_actions
from .engine import JevEngine
from .filters import EngineCallFilter, EnginePresetFilter
from .models import EnginePreset, EngineCall
from .serializers import EnginePresetSerializer, EngineCallSerializer


def build_auth_headers(integration, explicit=None, endpoint=None):
    """Outbound auth headers for a customer-provided outbound hook.

    Precedence: explicit node headers > hook-level auth (auth_scheme +
    auth_username/auth_token stored on the endpoint) > integration-level
    headers > derived Authorization from Integration.config (Bearer
    access_token/bearer_token/bot_token, or Basic username:api_token /
    username:password for Jira-style APIs).
    """
    cfg = (getattr(integration, 'config', None) or {}) if integration else {}
    headers = {str(k): v for k, v in (cfg.get('headers') or {}).items()}
    headers.update({str(k): v for k, v in (explicit or {}).items()})

    if not any(str(h).lower() == 'authorization' for h in headers):
        scheme = (getattr(endpoint, 'auth_scheme', None) or 'none') if endpoint else 'none'
        token = (getattr(endpoint, 'auth_token', None) or '') if endpoint else ''
        user = (getattr(endpoint, 'auth_username', None) or '') if endpoint else ''
        if scheme == 'bearer' and token:
            headers['Authorization'] = f'Bearer {token}'
        elif scheme == 'basic' and user and token:
            raw = f'{user}:{token}'.encode()
            headers['Authorization'] = 'Basic ' + base64.b64encode(raw).decode()
        else:
            token = cfg.get('access_token') or cfg.get('bearer_token') or cfg.get('bot_token')
            if token:
                headers['Authorization'] = f'Bearer {token}'
            else:
                api = cfg.get('api_token') or cfg.get('token')
                user = cfg.get('username') or cfg.get('email')
                if api and user:
                    raw = f'{user}:{api}'.encode()
                    headers['Authorization'] = 'Basic ' + base64.b64encode(raw).decode()
                elif cfg.get('username') and cfg.get('password'):
                    raw = f"{cfg['username']}:{cfg['password']}".encode()
                    headers['Authorization'] = 'Basic ' + base64.b64encode(raw).decode()
    return headers


def _build_map_config(decision_map):
    """Convert DecisionMap + related nodes/edges into JevEngine.decide input."""
    nodes = [
        {
            'key': n.node_key,
            'node_type': n.node_type,
            'config': n.config or {},
        }
        for n in decision_map.nodes.order_by('pk')
    ]
    edges = [
        {
            'source': e.source.node_key,
            'target': e.target.node_key,
            'label': e.label,
            'condition': e.condition or {},
            'priority': e.priority,
        }
        for e in decision_map.edges.order_by('priority', 'pk')
    ]
    return {'nodes': nodes, 'edges': edges}


def _resolve_webhook_endpoints(nodes_by_key):
    """Merge a bound WebhookEndpoint's URL/headers into action node configs.

    A bound `action` node may set `config.webhook_endpoint = <id>`
    to reuse a defined integration hook instead of hand-writing the URL. We
    resolve it here (ORM) so `actions.py` stays pure/testable.
    """
    from integrations.models import WebhookEndpoint

    ids = set()
    for node in (nodes_by_key or {}).values():
        cfg = node.get('config') or {}
        eid = cfg.get('webhook_endpoint')
        if eid:
            try:
                ids.add(int(eid))
            except (TypeError, ValueError):
                pass
    if not ids:
        return

    endpoints = {
        e.id: e
        for e in WebhookEndpoint.objects.select_related('integration').filter(
            id__in=ids, direction='outbound')
    }
    for node in (nodes_by_key or {}).values():
        cfg = node.get('config') or {}
        eid = cfg.get('webhook_endpoint')
        if not eid:
            continue
        try:
            endpoint = endpoints.get(int(eid))
        except (TypeError, ValueError):
            endpoint = None
        if endpoint is None:
            continue
        # Customer-provided outbound destination wins; otherwise fall back to
        # the integration base_url + path for older rows.
        if endpoint.target_url:
            url = endpoint.target_url
        else:
            base = (endpoint.integration.base_url or '').rstrip('/') if endpoint.integration else ''
            path = endpoint.target_path or ''
            url = path if str(path).startswith('http') else f"{base}/{str(path).lstrip('/')}"
        cfg.setdefault('action', 'http_post')
        cfg.setdefault('method', 'POST')
        # A bound hook defines the target: its outbound_url wins over any
        # hand-written node url.
        cfg['url'] = url
        # Outbound auth comes from the customer-provided hook/integration
        # credentials — never from the inbound hook secret.
        cfg['headers'] = build_auth_headers(
            endpoint.integration, cfg.get('headers'), endpoint=endpoint)
        node['config'] = cfg


def _run_engine(decision_map, preset, state, execute=False):
    """Run JevEngine.decide and return (result, latency_ms).

    execute=True also fires visited action nodes (outgoing HTTP
    posts back to external APIs) and records per-node outcomes in
    result['action_results']. The stateless path leaves execute=False and
    instead previews result['pending_actions'].
    """
    state = state or {}
    started = time.perf_counter()
    nodes_by_key = {}
    if decision_map is not None:
        nodes_by_key = {
            n.node_key: {'node_type': n.node_type, 'config': n.config or {}}
            for n in decision_map.nodes.all()
        }
        _resolve_webhook_endpoints(nodes_by_key)
        result = JevEngine.decide(_build_map_config(decision_map), state)
    else:
        config = (preset.config if preset else {}) or {}
        questions = config.get('questions', []) or []
        answers = {}
        confidences = []
        for q in questions:
            qtype = q.get('qtype', 'choice')
            key = q.get('key', qtype)
            if qtype == 'choice':
                res = JevEngine.evaluate_choice(state, q.get('criteria', {}))
                answers[key] = res['choice']
                confidences.append(res['confidence'])
            elif qtype == 'noul':
                res = JevEngine.evaluate_noul(state, q.get('instructions', ''))
                answers[key] = res['value']
                confidences.append(abs(res['value'] - 0.5) * 2)
            elif qtype == 'score':
                res = JevEngine.evaluate_score(state, q.get('rubric', {}))
                answers[key] = res['score']
                confidences.append(res['score'] / 100.0)
        routing = JevEngine.route(state)
        answers['_route'] = routing['route']
        result = {
            'answers': answers,
            'route': routing['route'],
            'confidence': round(sum(confidences) / len(confidences), 4) if confidences else 0.0,
            'trace': [],
        }
    if decision_map is not None:
        if execute:
            result['action_results'] = execute_run_actions(
                nodes_by_key, result.get('trace') or [], state, result.get('answers') or {})
        else:
            result['pending_actions'] = pending_actions(
                nodes_by_key, result.get('trace') or [], state, result.get('answers') or {})
    latency_ms = int((time.perf_counter() - started) * 1000)
    return result, latency_ms


def run_map_for_trigger(decision_map, state):
    """Execute a map (with outgoing actions) and persist a DecisionRun.

    Shared by the inbound webhook receiver and any other server-side trigger.
    Returns a compact summary for the HTTP response.
    """
    result, latency_ms = _run_engine(decision_map, None, state or {}, execute=True)
    action_results = result.get('action_results') or []
    executed = ','.join(a.get('node', '') for a in action_results if not a.get('skipped'))[:200]
    run = DecisionRun.objects.create(
        map=decision_map,
        trigger_event=state or {},
        status='decided' if result['route'] != 'block' else 'escalated',
        answers=result['answers'],
        decided_route=result['route'],
        confidence=result['confidence'],
        executed_action=executed,
        action_results=action_results,
        started_at=timezone.now(),
        finished_at=timezone.now(),
    )
    _record_outbound_sync_logs(decision_map, action_results, latency_ms)
    _notify_approvals(decision_map, run, result.get('trace') or [],
                      result.get('answers') or {}, result.get('route'))
    return {
        'run': run.id,
        'route': result['route'],
        'confidence': result['confidence'],
        'action_results': action_results,
    }


def _record_outbound_sync_logs(decision_map, action_results, latency_ms):
    """Persist one SyncLog per fired/skipped outbound action (direction='out').

    Rule: every integration touchpoint logs through SyncLog — inbound in
    `integrations.views`, outbound here. The log links to the bound outbound
    hook's integration, falling back to the map's integration.
    """
    from integrations.models import SyncLog, WebhookEndpoint

    if not action_results:
        return
    bound = {}
    for node in decision_map.nodes.all():
        try:
            bound[node.node_key] = int((node.config or {}).get('webhook_endpoint'))
        except (TypeError, ValueError):
            continue
    endpoints = (
        {e.id: e for e in WebhookEndpoint.objects.select_related('integration')
         .filter(id__in=set(bound.values()))}
        if bound else {}
    )
    for res in action_results:
        endpoint = endpoints.get(bound.get(res.get('node')))
        integration = (endpoint.integration if endpoint else None) or decision_map.integration
        if integration is None:
            continue
        ok = res.get('ok')
        result = 'success' if ok else ('skipped' if res.get('skipped') or res.get('dry_run') else 'error')
        SyncLog.objects.create(
            integration=integration,
            direction='out',
            event_type=f"action:{res.get('node')}",
            payload={'url': res.get('url'), 'method': res.get('method'),
                     'status': res.get('status'), 'dry_run': res.get('dry_run')},
            result=result,
            error_msg=res.get('error') or res.get('reason'),
            duration_ms=latency_ms,
            name=f"action {res.get('node')}",
        )


def _send_approval_notification(tool, review_url, summary):
    """Notify a channel about a pending approval. Never raises.

    Returns (ok, detail). Channels: smtp_email via Django mail when
    EMAIL_HOST is configured, otherwise slack_channel / teams / whatsapp via
    HTTP POST to the customer-provided target URL.
    """
    from django.conf import settings

    try:
        if tool.tool_type == 'smtp_email':
            if not getattr(settings, 'EMAIL_HOST', None):
                return False, 'SMTP not configured (EMAIL_HOST missing)'
            from django.core.mail import send_mail

            send_mail(
                subject=f"Approval needed: {summary}",
                message=f"Review and approve or decline:\n{review_url}",
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', None),
                recipient_list=[tool.target],
                fail_silently=False,
            )
            return True, f"email sent to {tool.target}"
        if tool.tool_type in ('slack_channel', 'teams', 'whatsapp'):
            if not (tool.target or '').lower().startswith('http'):
                return False, f'{tool.tool_type} needs an http(s) target URL'
            import requests

            resp = requests.post(tool.target, json={'text': f"Approval needed: {summary}\n{review_url}"}, timeout=10)
            if 200 <= resp.status_code < 300:
                return True, f'posted to {tool.tool_type}'
            return False, f'{tool.tool_type} responded {resp.status_code}'
        return False, f'unknown tool type {tool.tool_type}'
    except Exception as exc:
        return False, f'{type(exc).__name__}: {exc}'


def _notify_approvals(decision_map, run, trace, answers, route):
    """Create ApprovalRequests for visited approval nodes and notify channels.

    For each trace step on an `approval` node bound to an ApprovalTool
    (`config.approval_tool`), creates a pending request with an auto-generated
    token review URL and notifies the channel best-effort. Never raises; every
    outcome lands in SyncLog (direction='out').
    """
    import secrets as _secrets

    from decisions.models import ApprovalRequest, ApprovalTool
    from integrations.models import SyncLog

    nodes = {n.node_key: n for n in decision_map.nodes.all()}
    for step in trace or []:
        key = step.get('node')
        node = nodes.get(key)
        if node is None or node.node_type != 'approval':
            continue
        try:
            tool_id = int((node.config or {}).get('approval_tool'))
        except (TypeError, ValueError):
            continue
        tool = ApprovalTool.objects.filter(id=tool_id, is_active=True).first()
        if tool is None:
            continue
        token = _secrets.token_urlsafe(24)
        req = ApprovalRequest.objects.create(
            map=decision_map,
            run=run,
            node_key=key,
            approval_tool=tool,
            token=token,
            status='pending',
            payload={'answers': answers or {}, 'route': route},
            account=decision_map.account,
        )
        review_url = f"/approvals/{token}/"
        summary = f"{decision_map.name} / {node.title or key} (run {run.id})"
        ok, detail = _send_approval_notification(tool, review_url, summary)
        SyncLog.objects.create(
            integration=decision_map.integration,
            direction='out',
            event_type=f"approval:{key}",
            payload={'tool': tool.tool_type, 'target': tool.target,
                     'review_url': review_url, 'request': req.id},
            result='success' if ok else 'error',
            error_msg=None if ok else detail,
            name=f"approval {key}",
        )


class EnginePresetViewSet(CreateListMixin, BaseViewSet):
    queryset = EnginePreset.objects.order_by('pk')
    serializer_class = EnginePresetSerializer
    filterset_class = EnginePresetFilter
    search_fields = ["name", "model"]
    ordering_fields = ["id", "name", "preset_type", "model"]


class EngineCallViewSet(CreateListMixin, BaseViewSet):
    queryset = EngineCall.objects.order_by('pk')
    serializer_class = EngineCallSerializer
    filterset_class = EngineCallFilter
    search_fields = []
    ordering_fields = ["id", "latency_ms", "created_date_time"]

    def perform_create(self, serializer):
        """Create triggers JevEngine.decide; stores answers + pushes DecisionRun."""
        instance = serializer.save(
            created_by=self.request.user if self.request.user.is_authenticated else None,
            status='activated',
        )
        result, latency_ms = _run_engine(instance.map, instance.preset, instance.state or {},
                                       execute=True)
        instance.answers = result['answers']
        instance.latency_ms = latency_ms
        instance.save(update_fields=['answers', 'latency_ms'])

        if instance.map is not None:
            action_results = result.get('action_results') or []
            executed = ','.join(a.get('node', '') for a in action_results if not a.get('skipped'))[:200]
            run = DecisionRun.objects.create(
                map=instance.map,
                trigger_event=instance.state or {},
                status='decided' if result['route'] != 'block' else 'escalated',
                answers=result['answers'],
                decided_route=result['route'],
                confidence=result['confidence'],
                executed_action=executed,
                action_results=action_results,
                started_at=timezone.now(),
                finished_at=timezone.now(),
            )
            _record_outbound_sync_logs(instance.map, action_results, latency_ms)
            _notify_approvals(instance.map, run, result.get('trace') or [],
                              result.get('answers') or {}, result.get('route'))

    @action(methods=['post'], detail=False, url_path='decide')
    def decide(self, request, *args, **kwargs):
        """Stateless decide endpoint: evaluates without persisting."""
        from decisions.models import DecisionMap

        map_id = request.data.get('map')
        preset_id = request.data.get('preset')
        state = request.data.get('state', {})

        decision_map = DecisionMap.objects.filter(pk=map_id).first() if map_id else None
        preset = EnginePreset.objects.filter(pk=preset_id).first() if preset_id else None
        if map_id and decision_map is None:
            return Response({'detail': 'DecisionMap not found.'}, status=status.HTTP_404_NOT_FOUND)
        if preset_id and preset is None:
            return Response({'detail': 'EnginePreset not found.'}, status=status.HTTP_404_NOT_FOUND)

        result, latency_ms = _run_engine(decision_map, preset, state)
        result['latency_ms'] = latency_ms
        return Response(result, status=status.HTTP_200_OK)
