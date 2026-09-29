"""YAML spec for DecisionMap: human-readable graph stored in DB.

The YAML document is the canonical portable form of a decision map:

    version: 1.0.0
    name: Jira triage
    category: webhook
    nodes:
      - key: trigger
        type: trigger
        title: Jira webhook
        config: {event: issue.created}
        position: {x: 0, y: 0}
    edges:
      - from: trigger
        to: classify
        label: on-issue
        condition: {}
        priority: 0

``export_yaml`` renders the DB rows, ``import_yaml`` parses YAML text and
syncs rows (matched by node ``key`` / edge ``from``+``to``). The map's
``spec_yaml`` column always mirrors the rows after any write path.
"""

import yaml

from base.constants import DECISION_NODE_TYPE_CHOICES, JEV_QTYPE_CHOICES

SPEC_VERSION = '1.0.0'

VALID_NODE_TYPES = {c[0] for c in DECISION_NODE_TYPE_CHOICES}
VALID_QTYPES = {c[0] for c in JEV_QTYPE_CHOICES}

REQUIRED_NODE_FIELDS = ('key', 'type')


class SpecError(ValueError):
    """Raised when YAML text or the decoded doc is invalid."""


def map_to_doc(decision_map):
    """Render a DecisionMap + rows as a plain dict."""
    nodes = [
        {
            'key': n.node_key,
            'type': n.node_type,
            'title': n.title or '',
            'config': n.config or {},
            'position': {'x': n.position_x, 'y': n.position_y},
        }
        for n in decision_map.nodes.order_by('pk')
    ]
    edges = [
        {
            'from': e.source.node_key,
            'to': e.target.node_key,
            'label': e.label or '',
            'condition': e.condition or {},
            'priority': e.priority,
        }
        for e in decision_map.edges.order_by('priority', 'pk')
    ]
    return {
        'version': decision_map.version or SPEC_VERSION,
        'name': decision_map.name,
        'category': decision_map.category,
        'nodes': nodes,
        'edges': edges,
    }


def export_yaml(decision_map):
    """Return the YAML spec string for a map."""
    return yaml.safe_dump(map_to_doc(decision_map), sort_keys=False, default_flow_style=False)


def validate_doc(doc):
    """Raise SpecError if the decoded doc is malformed."""
    if not isinstance(doc, dict):
        raise SpecError('Spec must be a mapping at the top level.')
    nodes = doc.get('nodes', []) or []
    edges = doc.get('edges', []) or []
    if not isinstance(nodes, list) or not isinstance(edges, list):
        raise SpecError("'nodes' and 'edges' must be lists.")
    seen = set()
    for n in nodes:
        if not isinstance(n, dict):
            raise SpecError('Each node must be a mapping.')
        for f in REQUIRED_NODE_FIELDS:
            if not n.get(f):
                raise SpecError(f"Node is missing required field '{f}': {n!r}")
        if n['key'] in seen:
            raise SpecError(f"Duplicate node key: {n['key']}")
        seen.add(n['key'])
        if n['type'] not in VALID_NODE_TYPES:
            raise SpecError(f"Unknown node type '{n['type']}' (key '{n['key']}').")
        config = n.get('config') or {}
        if not isinstance(config, dict):
            raise SpecError(f"Node '{n['key']}' config must be a mapping.")
        qtype = config.get('qtype')
        if qtype and qtype not in VALID_QTYPES:
            raise SpecError(f"Node '{n['key']}' has unknown qtype '{qtype}'.")
    for e in edges:
        if not isinstance(e, dict):
            raise SpecError('Each edge must be a mapping.')
        if not e.get('from') or not e.get('to'):
            raise SpecError(f"Edge is missing 'from'/'to': {e!r}")
        if e['from'] not in seen:
            raise SpecError(f"Edge references unknown node '{e['from']}'.")
        if e['to'] not in seen:
            raise SpecError(f"Edge references unknown node '{e['to']}'.")
    return doc


def sync_doc(decision_map, doc):
    """Sync DB rows to match a validated doc. Returns {'nodes': n, 'edges': m}."""
    from .models import DecisionNode, DecisionEdge

    doc = validate_doc(doc)
    node_rows = {}
    for item in doc.get('nodes', []) or []:
        pos = item.get('position') or {}
        node, _ = DecisionNode.objects.update_or_create(
            map=decision_map,
            node_key=item['key'],
            defaults={
                'name': item.get('title') or item['key'],
                'node_type': item['type'],
                'title': item.get('title') or '',
                'config': item.get('config') or {},
                'position_x': float(pos.get('x', 0) or 0),
                'position_y': float(pos.get('y', 0) or 0),
                'status': 'activated',
            },
        )
        node_rows[item['key']] = node
    DecisionNode.objects.filter(map=decision_map).exclude(
        node_key__in=list(node_rows)
    ).delete()

    # Refresh: deletions cascade to edges, so re-fetch survivors.
    node_rows = {n.node_key: n for n in decision_map.nodes.all()}
    seen_edges = set()
    for prio, item in enumerate(doc.get('edges', []) or []):
        key = (item['from'], item['to'], item.get('label') or '')
        edge, _ = DecisionEdge.objects.update_or_create(
            map=decision_map,
            source=node_rows[item['from']],
            target=node_rows[item['to']],
            label=item.get('label') or '',
            defaults={
                'name': f"{item['from']}->{item['to']}",
                'condition': item.get('condition') or {},
                'priority': item.get('priority', prio),
                'status': 'activated',
            },
        )
        seen_edges.add(edge.pk)
    DecisionEdge.objects.filter(map=decision_map).exclude(pk__in=list(seen_edges)).delete()

    # Keep the ReactFlow layout column in step with positions.
    decision_map.layout = {
        'nodes': [
            {'id': k, 'position': {'x': n.position_x, 'y': n.position_y}}
            for k, n in node_rows.items()
        ],
        'edges': [
            {'from': e.source.node_key, 'to': e.target.node_key}
            for e in decision_map.edges.order_by('priority', 'pk')
        ],
    }
    decision_map.spec_yaml = export_yaml(decision_map)
    decision_map.save(update_fields=['layout', 'spec_yaml'])
    return {'nodes': len(node_rows), 'edges': len(seen_edges)}


def import_yaml(decision_map, text):
    """Parse YAML text and sync rows. Raises SpecError on any problem."""
    try:
        doc = yaml.safe_load(text)
    except yaml.YAMLError as exc:
        raise SpecError(f'Invalid YAML: {exc}')
    if doc is None:
        raise SpecError('Empty spec.')
    return sync_doc(decision_map, doc)
