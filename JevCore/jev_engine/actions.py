"""Outgoing action execution for decision runs.

An `action` node can POST a message back to an external API
(e.g. a Jira issue comment) using data from the trigger event and the Jev
answers. Node config shape::

    {
      "action": "http_post",          # required to execute over HTTP
      "method": "POST",               # default POST
      "url": "https://jira.example.com/rest/api/3/issue/{{trigger.issue.key}}/comment",
      "headers": {"Content-Type": "application/json",
                  "Authorization": "Basic {{trigger.secrets.jira_token}}"},
      "body": {"body": "Triaged as {{answers.classify}} ({{answers._route}})."},
      "timeout": 10,                  # seconds, default 10
      "dry_run": true                 # render + record, skip the network call
    }

``{{dotted.path}}`` placeholders resolve against
``{"trigger": <trigger event>, "answers": <jev answers>}``.
Anything without ``"action": "http_post"`` (legacy ``{"action": "name"}``
configs) is recorded as skipped so old maps keep working.

Nothing here ever raises: every outcome is returned as a result dict and
stored on the DecisionRun for the Actions-style UI.
"""
import logging
import re

logger = logging.getLogger(__name__)

PLACEHOLDER_RE = re.compile(r'\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}')
MAX_RESPONSE_CHARS = 2000
EXECUTABLE_TYPES = ('action',)
# llm_agent runs during JevEngine.decide (answer feeds edge conditions);
# its result is collected from the trace into action_results.


def resolve_path(context, path):
    """Dotted lookup in a nested dict/list context. Returns None when missing."""
    current = context
    for part in str(path).split('.'):
        if isinstance(current, dict):
            current = current.get(part)
        elif isinstance(current, (list, tuple)):
            try:
                current = current[int(part)]
            except (ValueError, IndexError):
                return None
        else:
            return None
        if current is None:
            return None
    return current


def render_value(value, context):
    """Recursively substitute {{placeholders}} in strings, dicts and lists."""
    if isinstance(value, str):
        def _replace(match):
            resolved = resolve_path(context, match.group(1))
            return '' if resolved is None else str(resolved)

        return PLACEHOLDER_RE.sub(_replace, value)
    if isinstance(value, dict):
        return {k: render_value(v, context) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [render_value(v, context) for v in value]
    return value


def execute_action(node_key, node_type, config, context):
    """Execute one action node. Always returns a result dict, never raises."""
    config = config or {}
    base = {'node': node_key, 'type': node_type}

    if node_type not in EXECUTABLE_TYPES:
        return {**base, 'skipped': True, 'reason': f"node type '{node_type}' is not executable"}

    if config.get('action') != 'http_post' or not config.get('url'):
        return {**base, 'skipped': True,
                'reason': "no http_post url configured (legacy action name kept as-is)"}

    method = str(config.get('method') or 'POST').upper()
    try:
        timeout = float(config.get('timeout') or 10)
    except (TypeError, ValueError):
        timeout = 10.0
    url = render_value(config.get('url'), context)
    headers = render_value(config.get('headers') or {}, context)
    body = render_value(config.get('body'), context)
    if not isinstance(headers, dict):
        headers = {}

    if config.get('dry_run'):
        return {**base, 'skipped': False, 'dry_run': True, 'ok': None,
                'method': method, 'url': url, 'headers': headers, 'body': body,
                'note': 'dry_run=true: rendered, not sent'}

    try:
        import requests

        resp = requests.request(method, url, json=body, headers=headers,
                                timeout=timeout)
        text = (resp.text or '')[:MAX_RESPONSE_CHARS]
        return {**base, 'skipped': False, 'dry_run': False, 'ok': 200 <= resp.status_code < 300,
                'method': method, 'url': url, 'status': resp.status_code,
                'response': text}
    except Exception as exc:  # network, DNS, timeout, invalid URL, ...
        logger.warning('action %s failed: %s', node_key, exc)
        return {**base, 'skipped': False, 'dry_run': False, 'ok': False,
                'method': method, 'url': url, 'error': f'{type(exc).__name__}: {exc}'}


def pending_actions(nodes_by_key, trace, state, answers):
    """Describe what WOULD run, without side effects (stateless preview)."""
    context = {'trigger': state or {}, 'answers': answers or {}}
    out = []
    for step in trace or []:
        key = step.get('node')
        node = (nodes_by_key or {}).get(key) or {}
        if node.get('node_type') not in EXECUTABLE_TYPES:
            continue
        config = node.get('config') or {}
        if config.get('action') != 'http_post' or not config.get('url'):
            out.append({'node': key, 'type': node.get('node_type'),
                        'skipped': True, 'reason': 'no http_post url configured'})
            continue
        out.append({'node': key, 'type': node.get('node_type'), 'skipped': False,
                    'method': str(config.get('method') or 'POST').upper(),
                    'url': render_value(config.get('url'), context),
                    'dry_run': bool(config.get('dry_run'))})
    return out


def execute_run_actions(nodes_by_key, trace, state, answers):
    """Execute every visited action node. Returns result list."""
    context = {'trigger': state or {}, 'answers': answers or {}}
    results = []
    for step in trace or []:
        key = step.get('node')
        node = (nodes_by_key or {}).get(key) or {}
        ntype = node.get('node_type')
        if ntype == 'llm_agent':
            # Already invoked during decide — surface the outcome for the UI.
            llm = step.get('llm')
            if llm:
                results.append({**llm, 'node': key, 'type': 'llm_agent'})
            continue
        if ntype not in EXECUTABLE_TYPES:
            continue
        results.append(execute_action(
            key, ntype, node.get('config') or {}, context))
    return results


def extract_llm_answer(payload, response_path=None):
    """Pull a short answer string out of an LLM HTTP response body.

    Tries ``response_path`` first, then common provider shapes
    (OpenAI ``choices[0].message.content``, ``answer``, ``content``,
    ``text``, ``output_text``). Falls back to the raw text.
    """
    if response_path and isinstance(payload, dict):
        resolved = resolve_path(payload, response_path)
        if resolved is not None:
            if isinstance(resolved, (dict, list)):
                import json as _json
                return _json.dumps(resolved)[:MAX_RESPONSE_CHARS]
            return str(resolved)[:MAX_RESPONSE_CHARS]
    if isinstance(payload, dict):
        try:
            choice = payload.get('choices')
            if isinstance(choice, list) and choice:
                msg = (choice[0] or {}).get('message') or {}
                content = msg.get('content') or choice[0].get('text')
                if content:
                    return str(content)[:MAX_RESPONSE_CHARS]
        except Exception:
            pass
        for k in ('answer', 'content', 'output_text', 'text', 'response', 'result', 'completion'):
            v = payload.get(k)
            if v is not None and not isinstance(v, (dict, list)):
                return str(v)[:MAX_RESPONSE_CHARS]
        # Nested chat-completion style: {"data": {"text": "..."}}
        data = payload.get('data')
        if isinstance(data, dict):
            for k in ('text', 'content', 'answer'):
                if data.get(k):
                    return str(data[k])[:MAX_RESPONSE_CHARS]
    if isinstance(payload, str):
        return payload[:MAX_RESPONSE_CHARS]
    import json as _json
    return _json.dumps(payload, default=str)[:MAX_RESPONSE_CHARS] if payload is not None else ''


def call_llm(node_key, config, context):
    """POST a prompt to a bound LLM endpoint (hook or integration).

    Config shape (URL/headers pre-resolved from webhook_endpoint / integration)::

        {
          "prompt": "Triage: {{trigger.summary}}",
          "system": "Answer with one word.",
          "model": "gpt-4o-mini",
          "url": "https://api.openai.com/v1/chat/completions",  # from hook
          "headers": {"Authorization": "Bearer ..."},
          "response_path": "choices.0.message.content",
          "default_answer": "review",
          "timeout": 20,
          "dry_run": false
        }

    Returns a result dict; never raises. On failure uses ``default_answer``
    (or empty string) so graph edges can still branch.
    """
    config = config or {}
    base = {'node': node_key, 'type': 'llm_agent'}
    prompt = render_value(config.get('prompt') or '', context)
    system = render_value(config.get('system') or '', context)
    model = str(config.get('model') or 'gpt-4o-mini')
    url = str(config.get('url') or '').strip()
    default = str(config.get('default_answer') or '')

    try:
        timeout = float(config.get('timeout') or 20)
    except (TypeError, ValueError):
        timeout = 20.0

    if config.get('dry_run') or not url.lower().startswith('http'):
        reason = 'dry_run=true' if config.get('dry_run') else 'no llm url configured'
        return {**base, 'skipped': False, 'dry_run': True, 'ok': None,
                'answer': default, 'prompt': prompt, 'model': model,
                'note': f'{reason}: using default_answer'}

    headers = render_value(config.get('headers') or {}, context)
    if not isinstance(headers, dict):
        headers = {}
    headers.setdefault('Content-Type', 'application/json')
    body = {
        'model': model,
        'messages': ([{'role': 'system', 'content': system}] if system else [])
        + [{'role': 'user', 'content': prompt}],
        'temperature': float(config.get('temperature') or 0),
    }
    # Allow a custom body template; {{prompt}} is already resolved above.
    if config.get('body'):
        body = render_value(config['body'], {**context, 'prompt': prompt, 'model': model})

    try:
        import requests

        resp = requests.post(url, json=body, headers=headers, timeout=timeout)
        text = (resp.text or '')[:MAX_RESPONSE_CHARS]
        if not (200 <= resp.status_code < 300):
            return {**base, 'skipped': False, 'dry_run': False, 'ok': False,
                    'status': resp.status_code, 'answer': default,
                    'prompt': prompt, 'model': model, 'url': url,
                    'response': text,
                    'error': f'HTTP {resp.status_code}'}
        try:
            payload = resp.json()
        except Exception:
            payload = text
        answer = extract_llm_answer(payload, config.get('response_path')) or default
        return {**base, 'skipped': False, 'dry_run': False, 'ok': True,
                'status': resp.status_code, 'answer': answer,
                'prompt': prompt, 'model': model, 'url': url,
                'response': text}
    except Exception as exc:
        logger.warning('llm %s failed: %s', node_key, exc)
        return {**base, 'skipped': False, 'dry_run': False, 'ok': False,
                'answer': default, 'prompt': prompt, 'model': model, 'url': url,
                'error': f'{type(exc).__name__}: {exc}'}


def pending_llm(nodes_by_key, trace):
    """Preview of llm_agent nodes that would have been called (no side effects)."""
    out = []
    for step in trace or []:
        key = step.get('node')
        node = (nodes_by_key or {}).get(key) or {}
        if node.get('node_type') != 'llm_agent':
            continue
        if step.get('llm'):
            out.append({**step['llm'], 'node': key, 'type': 'llm_agent'})
            continue
        cfg = node.get('config') or {}
        out.append({'node': key, 'type': 'llm_agent', 'skipped': False,
                    'dry_run': True, 'ok': None,
                    'model': cfg.get('model'), 'url': cfg.get('url') or '',
                    'answer': cfg.get('default_answer') or '',
                    'note': 'preview — decide not executed yet'})
    return out
