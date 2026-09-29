"""Pure-python JevEngine — deterministic keyword heuristics, no external API.

Fully testable offline. All methods are @staticmethods operating on plain
dicts/lists so they can be unit-tested without Django.
"""
import re


def _tokens(text):
    if text is None:
        return []
    return re.findall(r'[a-z0-9]+', str(text).lower())


def _flatten_state(state):
    """Collect all scalar values from a state dict into one token list."""
    toks = []
    if not isinstance(state, dict):
        return _tokens(state)
    for value in state.values():
        if isinstance(value, dict):
            toks.extend(_flatten_state(value))
        elif isinstance(value, (list, tuple)):
            for item in value:
                toks.extend(_flatten_state(item) if isinstance(item, dict) else _tokens(item))
        else:
            toks.extend(_tokens(value))
    return toks


POSITIVE_CUES = {
    'yes', 'true', 'approve', 'approved', 'confirm', 'confirmed', 'ready',
    'done', 'complete', 'completed', 'success', 'successful', 'pass', 'passed',
    'valid', 'verified', 'ok', 'good', 'great', 'excellent', 'high',
}

NEGATIVE_CUES = {
    'no', 'false', 'deny', 'denied', 'reject', 'rejected', 'fail', 'failed',
    'failure', 'error', 'invalid', 'blocked', 'bad', 'poor', 'low', 'critical',
}

URGENCY_CUES = {'urgent', 'asap', 'immediately', 'critical', 'emergency', 'p0', 'sev1', 'outage', 'down'}
RISK_CUES = {'risk', 'risky', 'destructive', 'irreversible', 'delete', 'drop', 'wipe', 'production', 'prod', 'payment', 'billing', 'security', 'breach'}
SPLIT_CUES = {'multiple', 'several', 'batch', 'bulk', 'parallel', 'subtasks', 'parts'}
BLOCK_CUES = {'block', 'blocked', 'impossible', 'missing', 'absent', 'unauthorized', 'forbidden', 'expired'}

DESTRUCTIVE_VERBS = {'delete', 'drop', 'destroy', 'wipe', 'terminate', 'revoke', 'purge', 'truncate'}
SENSITIVE_VERBS = {'deploy', 'release', 'publish', 'merge', 'refund', 'charge', 'pay', 'transfer', 'grant'}


class JevEngine:
    """Deterministic decision engine."""

    ROUTES = ('proceed_fast', 'deep_review', 'split_task', 'block')
    GUARD_DECISIONS = ('allow', 'confirm', 'review', 'deny')

    # ------------------------------------------------------------------
    @staticmethod
    def evaluate_choice(state, criteria):
        """Pick one option from criteria based on keyword overlap with state.

        criteria: {"options": ["a", "b"], "keywords": {"a": ["x", ...]}}.
        Returns {"choice", "distribution", "confidence"}.
        """
        options = list((criteria or {}).get('options', []))
        keywords = (criteria or {}).get('keywords', {}) or {}
        state_toks = set(_flatten_state(state or {}))

        scores = {}
        for option in options:
            keys = {str(k).lower() for k in keywords.get(option, [])}
            keys |= set(_tokens(option))
            scores[option] = len(state_toks & keys)

        total = sum(scores.values())
        if not options:
            return {'choice': None, 'distribution': {}, 'confidence': 0.0}
        if total == 0:
            n = len(options)
            return {
                'choice': options[0],
                'distribution': {o: round(1.0 / n, 4) for o in options},
                'confidence': round(1.0 / n, 4),
            }
        distribution = {o: round(s / total, 4) for o, s in scores.items()}
        best = max(scores, key=lambda o: (scores[o], options.index(o)))
        return {
            'choice': best,
            'distribution': distribution,
            'confidence': distribution[best],
        }

    # ------------------------------------------------------------------
    @staticmethod
    def evaluate_noul(state, proposition):
        """Belief value 0..1 that `proposition` holds given state text."""
        toks = _flatten_state(state or {})
        toks += _tokens(proposition)
        pos = sum(1 for t in toks if t in POSITIVE_CUES)
        neg = sum(1 for t in toks if t in NEGATIVE_CUES)
        if pos + neg == 0:
            return {'value': 0.5, 'positive_cues': 0, 'negative_cues': 0}
        return {
            'value': round(pos / (pos + neg), 4),
            'positive_cues': pos,
            'negative_cues': neg,
        }

    # ------------------------------------------------------------------
    @staticmethod
    def evaluate_score(state, rubric):
        """Score state against a weighted rubric.

        rubric: {"weights": {"criterion": 0..1}, "keywords": {"criterion": [...]},
                 "levels": [[threshold, "label"], ...]}.
        Returns {"score" (0..100), "level", "breakdown"}.
        """
        rubric = rubric or {}
        weights = rubric.get('weights', {}) or {}
        keywords = rubric.get('keywords', {}) or {}
        levels = rubric.get('levels', [[80, 'high'], [50, 'medium'], [0, 'low']])
        state_toks = set(_flatten_state(state or {}))

        breakdown = {}
        for criterion, weight in weights.items():
            keys = {str(k).lower() for k in keywords.get(criterion, [])}
            keys |= set(_tokens(criterion))
            hit = 1.0 if (state_toks & keys) else 0.0
            breakdown[criterion] = {'weight': weight, 'hit': hit}

        total_w = sum(weights.values()) or 1.0
        score = round(sum(b['weight'] * b['hit'] for b in breakdown.values()) / total_w * 100, 2)
        level = 'low'
        for threshold, label in sorted(levels, reverse=True):
            if score >= threshold:
                level = label
                break
        return {'score': score, 'level': level, 'breakdown': breakdown}

    # ------------------------------------------------------------------
    @staticmethod
    def route(state):
        """Route to proceed_fast / deep_review / split_task / block."""
        toks = set(_flatten_state(state or {}))
        reasons = []
        if toks & BLOCK_CUES:
            reasons.append('blocking cues present')
            return {'route': 'block', 'reasons': reasons}
        if toks & SPLIT_CUES:
            reasons.append('multi-part cues present')
            return {'route': 'split_task', 'reasons': reasons}
        if toks & (RISK_CUES | URGENCY_CUES):
            reasons.append('risk/urgency cues present')
            return {'route': 'deep_review', 'reasons': reasons}
        reasons.append('no escalation cues')
        return {'route': 'proceed_fast', 'reasons': reasons}

    # ------------------------------------------------------------------
    @staticmethod
    def guard_tool_call(tool, action, policy=None):
        """Guard a tool call -> allow / confirm / review / deny."""
        policy = policy or {}
        denied = {str(x).lower() for x in policy.get('deny_tools', [])}
        verb = str(action or '').lower().split()[0] if action else ''
        reasons = []

        if str(tool or '').lower() in denied:
            reasons.append('tool denied by policy')
            return {'decision': 'deny', 'reasons': reasons}
        if verb in DESTRUCTIVE_VERBS:
            reasons.append('destructive action verb')
            return {'decision': 'deny' if policy.get('strict') else 'review', 'reasons': reasons}
        if verb in SENSITIVE_VERBS:
            reasons.append('sensitive action verb')
            return {'decision': 'confirm', 'reasons': reasons}
        reasons.append('no guard cues')
        return {'decision': 'allow', 'reasons': reasons}

    # ------------------------------------------------------------------
    @staticmethod
    def _condition_matches(condition, answers):
        """Match a DecisionEdge.condition against accumulated answers."""
        if not condition:
            return True
        answers = answers or {}
        if 'equals' in condition:
            for field, value in (condition['equals'] or {}).items():
                if answers.get(field) != value:
                    return False
            return True
        if 'contains' in condition:
            for field, value in (condition['contains'] or {}).items():
                if str(value).lower() not in str(answers.get(field, '')).lower():
                    return False
            return True
        if 'route_is' in condition:
            return answers.get('_route') == condition['route_is']
        return True

    # ------------------------------------------------------------------
    @classmethod
    def decide(cls, map_config, state):
        """Walk nodes/edges of a decision map.

        map_config: {"nodes": [{"key", "node_type", "config"}], "edges": [...]}.
        Returns {"answers", "route", "confidence", "trace"}.
        """
        nodes = {n.get('key'): n for n in (map_config or {}).get('nodes', [])}
        edges = sorted((map_config or {}).get('edges', []),
                       key=lambda e: (e.get('priority', 0), str(e.get('source'))))

        answers = {}
        trace = []
        confidences = []

        # Start at trigger node if present, else first node.
        current = next((k for k, n in nodes.items() if n.get('node_type') == 'trigger'),
                       next(iter(nodes), None))
        visited = set()
        while current and current not in visited:
            visited.add(current)
            node = nodes.get(current)
            if not node:
                break
            ntype = node.get('node_type')
            config = node.get('config') or {}
            step = {'node': current, 'node_type': ntype}

            if ntype == 'classification' or ntype == 'decision':
                res = cls.evaluate_choice(state, config.get('criteria', {}))
                answers[current] = res['choice']
                step['answer'] = res['choice']
                confidences.append(res['confidence'])
            elif ntype == 'prioritization':
                res = cls.evaluate_score(state, config.get('rubric', {}))
                answers[current] = res['level']
                step['answer'] = res['level']
                confidences.append(res['score'] / 100.0)
            elif ntype == 'rule':
                res = cls.evaluate_noul(state, config.get('instructions', ''))
                answers[current] = res['value']
                step['answer'] = res['value']
                confidences.append(abs(res['value'] - 0.5) * 2)
            elif ntype == 'approval':
                res = cls.guard_tool_call(config.get('tool', ''), config.get('action', ''),
                                          config.get('policy', {}))
                answers[current] = res['decision']
                step['answer'] = res['decision']
                confidences.append(1.0 if res['decision'] in ('allow', 'deny') else 0.5)
            elif ntype == 'action':
                answers[current] = config.get('action', current)
                step['answer'] = answers[current]
                confidences.append(1.0)
            elif ntype == 'llm_agent':
                # Network call lives in actions.call_llm so this module stays
                # pure when no URL is bound (offline default_answer / dry_run).
                from .actions import call_llm
                res = call_llm(current, config, {'trigger': state or {}, 'answers': answers})
                answers[current] = res.get('answer') or ''
                step['answer'] = answers[current]
                step['llm'] = res
                if res.get('ok') is True:
                    confidences.append(0.9)
                elif res.get('dry_run'):
                    confidences.append(0.5)
                else:
                    confidences.append(0.3)
            else:  # trigger / branch
                answers[current] = True
                step['answer'] = True

            trace.append(step)

            # Follow first matching outgoing edge.
            nxt = None
            for edge in edges:
                if edge.get('source') != current:
                    continue
                if cls._condition_matches(edge.get('condition'), answers):
                    nxt = edge.get('target')
                    trace[-1]['edge'] = edge.get('label')
                    break
            current = nxt

        routing = cls.route({**(state or {}), '_answers': answers})
        answers['_route'] = routing['route']
        confidence = round(sum(confidences) / len(confidences), 4) if confidences else 0.0
        return {
            'answers': answers,
            'route': routing['route'],
            'confidence': confidence,
            'trace': trace,
        }
