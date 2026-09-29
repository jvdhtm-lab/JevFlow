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


def _build_map_config(decision_map, nodes_by_key=None):
    """Convert DecisionMap + related nodes/edges into JevEngine.decide input.

    When ``nodes_by_key`` is provided (post hook/integration resolution), its
    ``config`` overrides the raw ORM config so llm_agent/action nodes see the
    resolved URL + auth headers during decide.
    """
    resolved = nodes_by_key or {}
    nodes = []
    for n in decision_map.nodes.order_by('pk'):
        cfg = (resolved.get(n.node_key) or {}).get('config')
        if cfg is None:
            cfg = n.config or {}
        nodes.append({
            'key': n.node_key,
            'node_type': n.node_type,
            'config': cfg,
        })
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
    """Merge a bound WebhookEndpoint's URL/headers into action/llm node configs.

    A bound `action` or `llm_agent` node may set `config.webhook_endpoint = <id>`
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
        if node.get('node_type') == 'llm_agent':
            # LLM call is not an "action" — only inject URL + auth headers.
            cfg['url'] = url
            cfg['headers'] = build_auth_headers(
                endpoint.integration, cfg.get('headers'), endpoint=endpoint)
        else:
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


def _resolve_llm_integrations(nodes_by_key):
    """Fill URL/headers for llm_agent nodes bound only via Integration.

    Falls back to ``integration.base_url`` (+ optional ``config.path``) when no
    outbound hook is set, so an OpenAI-style integration works alone.
    """
    from integrations.models import Integration

    ids = set()
    for node in (nodes_by_key or {}).values():
        if node.get('node_type') != 'llm_agent':
            continue
        cfg = node.get('config') or {}
        if cfg.get('url'):
            continue
        try:
            ids.add(int(cfg.get('integration')))
        except (TypeError, ValueError):
            pass
    if not ids:
        return
    integrations = {i.id: i for i in Integration.objects.filter(id__in=ids)}
    for node in (nodes_by_key or {}).values():
        if node.get('node_type') != 'llm_agent':
            continue
        cfg = node.get('config') or {}
        if cfg.get('url'):
            continue
        try:
            integ = integrations.get(int(cfg.get('integration')))
        except (TypeError, ValueError):
            integ = None
        if integ is None or not integ.base_url:
            continue
        base = integ.base_url.rstrip('/')
        path = str(cfg.get('path') or '').strip()
        cfg['url'] = path if path.startswith('http') else (
            f"{base}/{path.lstrip('/')}" if path else base)
        cfg['headers'] = build_auth_headers(integ, cfg.get('headers'))
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
        _resolve_llm_integrations(nodes_by_key)
        # decide() uses resolved configs so llm_agent can POST during the walk.
        result = JevEngine.decide(_build_map_config(decision_map, nodes_by_key), state)
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
            from .actions import pending_llm
            result['pending_actions'] = pending_actions(
                nodes_by_key, result.get('trace') or [], state, result.get('answers') or {})
            result['pending_actions'].extend(pending_llm(
                nodes_by_key, result.get('trace') or []))
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
        cfg = node.config or {}
        if node.node_type == 'llm_agent' and cfg.get('integration'):
            try:
                bound[node.node_key] = int(cfg.get('webhook_endpoint') or 0) or None
            except (TypeError, ValueError):
                bound[node.node_key] = None
            continue
        try:
            bound[node.node_key] = int((node.config or {}).get('webhook_endpoint'))
        except (TypeError, ValueError):
            continue
    endpoints = (
        {e.id: e for e in WebhookEndpoint.objects.select_related('integration')
         .filter(id__in=set(v for v in bound.values() if v))}
        if bound else {}
    )
    for res in action_results:
        endpoint = endpoints.get(bound.get(res.get('node')))
        integration = (endpoint.integration if endpoint else None) or decision_map.integration
        if integration is None:
            continue
        ok = res.get('ok')
        result = 'success' if ok else ('skipped' if res.get('skipped') or res.get('dry_run') else 'error')
        kind = res.get('type') or 'action'
        SyncLog.objects.create(
            integration=integration,
            direction='out',
            event_type=f"{kind}:{res.get('node')}",
            payload={'url': res.get('url'), 'method': res.get('method'),
                     'status': res.get('status'), 'dry_run': res.get('dry_run'),
                     'model': res.get('model'), 'answer': res.get('answer')},
            result=result,
            error_msg=res.get('error') or res.get('reason'),
            duration_ms=latency_ms,
            name=f"{kind} {res.get('node')}",
        )


def _resolve_approval_destination(tool):
    """Resolve where/how an approval notification goes. Never raises.

    Returns (kind, url, headers, label). Tools are outbound-only:
    - via='hook': reuse the bound outbound endpoint (its URL + auth win).
    - via='integration': post to the integration's base_url with its
      stored credentials (Bearer/Basic).
    """
    try:
        via = tool.via or 'integration'
        if via == 'hook':
            endpoint = tool.webhook_endpoint
            if endpoint is None or endpoint.direction != 'outbound' or not endpoint.is_active:
                return 'hook', '', {}, 'bound hook missing/inactive'
            if endpoint.target_url:
                url = endpoint.target_url
            else:
                base = (endpoint.integration.base_url or '').rstrip('/') if endpoint.integration else ''
                url = f"{base}/{str(endpoint.target_path or '').lstrip('/')}"
            headers = build_auth_headers(endpoint.integration, None, endpoint=endpoint)
            return 'hook', url, headers, f'hook {endpoint.id}'
        # via == 'integration'
        integration = tool.integration
        if integration is None:
            return 'integration', '', {}, 'no integration bound'
        base = (integration.base_url or '').rstrip('/')
        url = base  # post to integration base; tool carries no target path
        headers = build_auth_headers(integration, None)
        return 'integration', url, headers, f'integration {integration.name}'
    except Exception as exc:
        return 'direct', '', {}, f'{type(exc).__name__}: {exc}'


def _send_approval_notification(tool, review_url, summary):
    """Notify a channel about a pending approval. Never raises.

    Returns (ok, detail). Resolution: bound outbound hook or integration.
    For ``email`` type, tries Django mail (EMAIL_HOST) first; otherwise
    POSTs the message to the resolved URL.
    For ``message`` type, POSTs JSON to the resolved URL.
    """
    from django.conf import settings

    try:
        kind, url, headers, label = _resolve_approval_destination(tool)
        if tool.tool_type == 'email':
            # Try Django SMTP first (EMAIL_HOST configured).
            if getattr(settings, 'EMAIL_HOST', None):
                from django.core.mail import send_mail
                send_mail(
                    subject=f"Approval needed: {summary}",
                    message=f"Review and approve or decline:\n{review_url}",
                    from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', None),
                    recipient_list=[_email_from_integration(tool.integration)],
                    fail_silently=False,
                )
                return True, f"email sent (SMTP)"
        if not (url or '').lower().startswith('http'):
            return False, f'{tool.tool_type} via {kind} needs an http(s) target ({label})'
        import requests

        payload = {'text': f"Approval needed: {summary}\n{review_url}"}
        resp = requests.post(url, json=payload, headers=headers or None, timeout=10)
        if 200 <= resp.status_code < 300:
            return True, f'posted via {kind} ({label})'
        return False, f'{tool.tool_type} via {kind} responded {resp.status_code}'
    except Exception as exc:
        return False, f'{type(exc).__name__}: {exc}'


def _email_from_integration(integration):
    """Best-effort email address from an integration's config or owner."""
    if integration is None:
        return ''
    cfg = integration.config or {}
    for k in ('notify_email', 'email', 'owner_email'):
        v = cfg.get(k)
        if v and isinstance(v, str) and '@' in v:
            return v
    owner = getattr(integration, 'owner', None)
    if owner and getattr(owner, 'email', None):
        return owner.email
    return ''


def _describe_trigger(state):
    """One-line human summary of what triggered the run."""
    state = state or {}
    issue = state.get('issue') or {}
    if isinstance(issue, dict) and (issue.get('key') or issue.get('title')):
        title = issue.get('title') or state.get('summary') or ''
        return f"{issue.get('key', 'issue')}: {title}".strip(': ')
    pr = state.get('pr') or {}
    if isinstance(pr, dict) and (pr.get('number') or pr.get('title')):
        return f"PR #{pr.get('number')}: {pr.get('title') or state.get('summary') or ''}".strip()
    alert = state.get('alert') or {}
    if isinstance(alert, dict) and alert.get('title'):
        return str(alert['title'])
    if state.get('summary'):
        return str(state['summary'])
    bits = [str(v) for v in state.values() if isinstance(v, (str, int, float))][:3]
    return ' '.join(bits)[:200]


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
        tool = ApprovalTool.objects.filter(id=tool_id, status='activated').first()
        if tool is None:
            continue
        token = _secrets.token_urlsafe(24)
        trigger_summary = _describe_trigger(run.trigger_event)
        node_title = node.title or key
        summary = (f"{trigger_summary} — {node_title}" if trigger_summary
                   else f"{decision_map.name} — {node_title}")[:300]
        lines = [
            f"Map: {decision_map.name}",
            f"Step: {node_title} ({key})",
            f"Route: {route}",
            f"Confidence: {round((run.confidence or 0) * 100)}%",
            f"Trigger: {trigger_summary or '—'}",
        ]
        key_answers = {k: v for k, v in (answers or {}).items()
                       if not str(k).startswith('_') and k != key}
        if key_answers:
            lines.append('Answers: ' + ', '.join(
                f"{k}={v}" for k, v in list(key_answers.items())[:6]))
        req = ApprovalRequest.objects.create(
            map=decision_map,
            run=run,
            node_key=key,
            approval_tool=tool,
            token=token,
            status='pending',
            summary=summary,
            description='\n'.join(lines),
            payload={'answers': answers or {}, 'route': route},
            account=decision_map.account,
        )
        review_url = f"/approvals/{token}/"
        summary = f"{trigger_summary} [{decision_map.name} / {node_title}]" if trigger_summary else summary
        ok, detail = _send_approval_notification(tool, review_url, summary)
        _kind, resolved_url, _, _ = _resolve_approval_destination(tool)
        SyncLog.objects.create(
            integration=decision_map.integration,
            direction='out',
            event_type=f"approval:{key}",
            payload={'tool': tool.tool_type, 'via': tool.via, 'url': resolved_url,
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
