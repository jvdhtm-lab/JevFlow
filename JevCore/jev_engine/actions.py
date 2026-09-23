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
        if node.get('node_type') not in EXECUTABLE_TYPES:
            continue
        results.append(execute_action(
            key, node.get('node_type'), node.get('config') or {}, context))
    return results
