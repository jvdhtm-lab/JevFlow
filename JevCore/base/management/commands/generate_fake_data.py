import os
import random
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone
from faker import Faker

from identity_api.models import Account, CustomUser, App, Role, SocialAccount
from integrations.models import Integration, WebhookEndpoint, SyncLog
from decisions.models import (
    DecisionMap, DecisionNode, DecisionEdge, DecisionRun,
    ApprovalTool, ApprovalRequest,
)
from jev_engine.models import EnginePreset, EngineCall
from jev_engine.engine import JevEngine
from notifications.models import Notification
from audit.models import AuditLog


class Command(BaseCommand):
    help = 'Generate fake data for JevFlow development'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing fake data before creating new',
        )
        parser.add_argument(
            '--accounts',
            type=int,
            default=3,
            help='Number of accounts to create',
        )

    def handle(self, *args, **options):
        use_seed = os.environ.get('DEV', '').lower() in ('1', 'true', 'yes')

        if not use_seed:
            self.stdout.write(self.style.WARNING(
                'DEV environment variable not set. Skipping fake data generation.\n'
                'Set DEV=1 to enable fake data generation.'
            ))
            return

        if options['clear']:
            self.clear_data()

        self.stdout.write(self.style.SUCCESS('Generating JevFlow fake data...'))

        self.faker = Faker()
        num_accounts = options['accounts']

        for account_idx in range(num_accounts):
            account = self.create_account(account_idx + 1)
            self.stdout.write(f'Created account: {account.name}')

            users = self.create_users(account)
            self.stdout.write(f'Created {len(users)} users')

            integrations = self.create_integrations(account, users)
            self.stdout.write(f'Created {len(integrations)} integrations')

            endpoints = self.create_webhook_endpoints(account, integrations)
            self.stdout.write(f'Created {len(endpoints)} webhook endpoints')

            self.create_sync_logs(account, integrations)

            tools = self.create_approval_tools(account, integrations)
            self.stdout.write(f'Created {len(tools)} approval tools')

            maps = self.create_decision_maps(account, integrations, tools)
            self.stdout.write(f'Created {len(maps)} decision maps')

            runs = self.create_decision_runs(maps)
            self.stdout.write(f'Created {len(runs)} decision runs')

            self.create_engine_presets_and_calls(account, users, maps)
            self.stdout.write('Created engine presets and calls')

            self.create_audit_logs(users)
            self.stdout.write('Created audit logs')

            self.create_notifications(users, maps, integrations)
            self.stdout.write('Created notifications')

        self.stdout.write(self.style.SUCCESS('Fake data generation complete.'))

    # ------------------------------------------------------------------
    def clear_data(self):
        self.stdout.write('Clearing existing data...')
        Notification.objects.all().delete()
        AuditLog.objects.all().delete()
        EngineCall.objects.all().delete()
        EnginePreset.objects.all().delete()
        DecisionRun.objects.all().delete()
        DecisionEdge.objects.all().delete()
        DecisionNode.objects.all().delete()
        DecisionMap.objects.all().delete()
        SyncLog.objects.all().delete()
        ApprovalRequest.objects.all().delete()
        ApprovalTool.objects.all().delete()
        WebhookEndpoint.objects.all().delete()
        Integration.objects.all().delete()
        SocialAccount.objects.all().delete()
        Role.objects.all().delete()
        App.objects.all().delete()
        CustomUser.objects.filter(is_superuser=False).delete()
        Account.objects.all().delete()
        self.stdout.write('Data cleared.')

    # ------------------------------------------------------------------
    def create_account(self, idx):
        name = f'{self.faker.company()} {idx}'
        slug = f'account-{idx}-{self.faker.slug()}'
        account, _ = Account.objects.get_or_create(
            slug=slug,
            defaults={
                'name': name,
                'description': self.faker.catch_phrase(),
                'status': 'activated',
            }
        )
        return account

    def create_users(self, account):
        users = []
        specs = [
            ('local', 'local'),
            ('google', 'google'),
            ('outlook', 'outlook'),
            ('slack', 'slack'),
        ]
        for provider, _ in specs:
            username = f'{provider}.{account.slug[:12]}'.replace('_', '-')[:30]
            email = f'{username}@example.com'
            user, created = CustomUser.objects.get_or_create(
                username=username,
                defaults={
                    'email': email,
                    'first_name': self.faker.first_name(),
                    'last_name': self.faker.last_name(),
                    'account': account,
                    'auth_provider': provider,
                    'avatar_url': self.faker.image_url(),
                    'status': 'activated',
                    'is_active': True,
                }
            )
            if created:
                user.set_password('password123')
                user.save()
            if provider != 'local':
                SocialAccount.objects.get_or_create(
                    provider=provider,
                    provider_uid=f'{provider}-uid-{user.id}',
                    defaults={
                        'user': user,
                        'extra_data': {'email': email},
                        'status': 'activated',
                    }
                )
            users.append(user)
        return users

    # ------------------------------------------------------------------
    def create_integrations(self, account, users):
        owner = users[0]
        specs = [
            ('jira', 'Jira', 'https://example.atlassian.net'),
            ('github', 'GitHub', 'https://api.github.com'),
            ('slack', 'Slack', 'https://slack.com/api'),
            ('teams', 'Teams', 'https://graph.microsoft.com'),
            ('aws', 'AWS', 'https://aws.amazon.com'),
            ('codex', 'Codex', 'https://codex.example.com'),
            # VHRS is the reference HRIS we are wiring up. Use generic_webhook
            # as the type because VHRS is not in INTEGRATION_TYPE_CHOICES yet.
            ('generic_webhook', 'VHRS', 'http://localhost:8080'),
        ]
        integrations = []
        for itype, name, base_url in specs:
            obj, _ = Integration.objects.get_or_create(
                name=f'{name} {account.slug[:8]}',
                account=account,
                defaults={
                    'description': f'{name} integration for {account.name}',
                    'purpose': 'action_trigger',
                    'integration_type': itype,
                    'base_url': base_url,
                    'connection_status': random.choice(['connected', 'connected', 'pending', 'error']),
                    'config': {'region': 'us-east-1', 'sync_interval_min': 15},
                    'credentials_hint': 'token stored in vault',
                    'owner': owner,
                    'last_sync_at': timezone.now() - timedelta(hours=random.randint(1, 72)),
                    'status': 'activated',
                }
            )
            integrations.append(obj)
        return integrations

    def create_webhook_endpoints(self, account, integrations):
        from base.constants import INBOUND_WEBHOOK_PATH

        endpoints = []
        source_map = {
            'jira': 'jira', 'github': 'github', 'slack': 'slack',
            'teams': 'teams', 'aws': 'ci', 'codex': 'generic',
        }
        for integration in integrations:
            src = source_map.get(integration.integration_type, 'generic')
            # Inbound: ONE fixed hook URL for the whole system; the per-customer
            # secret (generated by us) is the identity. save() enforces the path.
            endpoints.append(WebhookEndpoint.objects.create(
                name=f'{integration.integration_type} inbound',
                description=f'Inbound hook for {integration.name} (fixed URL, customer secret)',
                integration=integration,
                direction='inbound',
                source=src,
                target_path=INBOUND_WEBHOOK_PATH,
                is_active=True,
                last_received_at=timezone.now() - timedelta(minutes=random.randint(5, 5000)),
                account=account,
                status='activated',
            ))
            # Outbound: URL + auth both provided by the customer.
            slug = self.faker.slug()
            scheme = random.choice(['bearer', 'bearer', 'basic', 'none'])
            endpoints.append(WebhookEndpoint.objects.create(
                name=f'{integration.integration_type} outbound',
                description=f'Outbound hook for {integration.name} (customer URL + auth)',
                integration=integration,
                direction='outbound',
                source=src,
                target_path=f'/webhooks/{slug}',
                target_url=f'https://hooks.customer.example/{integration.integration_type}/{slug}',
                auth_scheme=scheme,
                auth_username=f'{integration.integration_type}-bot' if scheme == 'basic' else None,
                auth_token=self.faker.sha256()[:32] if scheme != 'none' else None,
                is_active=random.choice([True, True, True, False]),
                account=account,
                status='activated',
            ))

        # Extra VHRS hooks: one inbound endpoint per HR event and a dedicated
        # outbound endpoint that posts back into the VHRS API.
        vhrs = next((i for i in integrations if i.name.startswith('VHRS')), None)
        if vhrs:
            for event in ['employee.hired', 'leave.requested', 'incident.reported']:
                endpoints.append(WebhookEndpoint.objects.create(
                    name=f'VHRS {event} ({account.slug[:10]})',
                    description=f'Inbound VHRS event: {event}',
                    integration=vhrs,
                    direction='inbound',
                    source='generic',
                    target_path=INBOUND_WEBHOOK_PATH,
                    is_active=True,
                    last_received_at=timezone.now() - timedelta(minutes=random.randint(5, 5000)),
                    account=account,
                    status='activated',
                ))
            endpoints.append(WebhookEndpoint.objects.create(
                name=f'VHRS outbound API ({account.slug[:10]})',
                description='Posts action results back into VHRS',
                integration=vhrs,
                direction='outbound',
                source='generic',
                target_path='/api/staff/',
                target_url='http://localhost:8080/api/staff/',
                auth_scheme='bearer',
                auth_token=self.faker.sha256()[:32],
                is_active=True,
                account=account,
                status='activated',
            ))
        return endpoints

    def create_sync_logs(self, account, integrations):
        for integration in integrations:
            for _ in range(3):
                SyncLog.objects.create(
                    name=f'sync {integration.integration_type}',
                    integration=integration,
                    direction=random.choice(['in', 'out']),
                    event_type=random.choice(['issue.created', 'push', 'message', 'deploy']),
                    payload={'sample': True},
                    result=random.choice(['success', 'success', 'success', 'error', 'skipped']),
                    duration_ms=random.randint(10, 3000),
                    account=account,
                    status='activated',
                )

    # ------------------------------------------------------------------
    def create_approval_tools(self, account, integrations):
        tools = []
        for integration in integrations[:2]:
            # email via integration
            tools.append(ApprovalTool.objects.create(
                name=f'Email via {integration.integration_type} ({account.slug[:10]})',
                tool_type='email',
                via='integration',
                integration=integration,
                account=account,
                status='activated',
            ))
            # message via outbound hook
            hook = WebhookEndpoint.objects.filter(
                integration=integration, direction='outbound', is_active=True
            ).first()
            if hook:
                tools.append(ApprovalTool.objects.create(
                    name=f'Message via {integration.integration_type} hook ({account.slug[:10]})',
                    tool_type='message',
                    via='hook',
                    webhook_endpoint=hook,
                    account=account,
                    status='activated',
                ))

        # VHRS-specific approval tools (manager email + HR Slack/Teams hook).
        vhrs = next((i for i in integrations if i.name.startswith('VHRS')), None)
        if vhrs:
            tools.append(ApprovalTool.objects.create(
                name=f'VHRS manager email ({account.slug[:10]})',
                tool_type='email',
                via='integration',
                integration=vhrs,
                account=account,
                status='activated',
            ))
            vhrs_hook = WebhookEndpoint.objects.filter(
                integration=vhrs, direction='outbound', is_active=True
            ).first()
            if vhrs_hook:
                tools.append(ApprovalTool.objects.create(
                    name=f'VHRS HR channel message ({account.slug[:10]})',
                    tool_type='message',
                    via='hook',
                    webhook_endpoint=vhrs_hook,
                    account=account,
                    status='activated',
                ))
        return tools

    def create_decision_maps(self, account, integrations, tools=None):
        tools = tools or []
        maps = []
        jira = next((i for i in integrations if i.integration_type == 'jira'), integrations[0])
        github = next((i for i in integrations if i.integration_type == 'github'), integrations[0])
        slack = next((i for i in integrations
                      if i.integration_type in ('slack', 'slack_app', 'teams')),
                     integrations[0])
        vhrs = next((i for i in integrations if i.name.startswith('VHRS')), None)

        specs = [
            {
                'name': 'Jira triage',
                'description': 'Classify, prioritize and route incoming Jira issues',
                'integration': jira,
                'trigger_source': 'webhook',
                'nodes': [
                    ('trigger', 'trigger', 'Jira webhook', {'event': 'issue.created'}, 0, 0),
                    ('classify', 'classification', 'Classify issue', {
                        'qtype': 'choice',
                        'instructions': 'Classify the incoming Jira issue',
                        'criteria': {
                            'options': ['bug', 'feature', 'task', 'incident'],
                            'keywords': {
                                'bug': ['bug', 'error', 'crash', 'fail', 'broken'],
                                'feature': ['feature', 'request', 'enhancement', 'add'],
                                'task': ['task', 'chore', 'cleanup', 'docs'],
                                'incident': ['incident', 'outage', 'urgent', 'critical', 'down'],
                            },
                        },
                    }, 220, 0),
                    ('prioritize', 'prioritization', 'Prioritize issue', {
                        'qtype': 'score',
                        'instructions': 'Score issue priority',
                        'rubric': {
                            'weights': {'impact': 0.5, 'urgency': 0.3, 'scope': 0.2},
                            'keywords': {
                                'impact': ['outage', 'blocked', 'critical'],
                                'urgency': ['urgent', 'asap', 'immediately'],
                                'scope': ['multiple', 'several', 'all'],
                            },
                            'levels': [[80, 'high'], [50, 'medium'], [0, 'low']],
                        },
                    }, 440, 0),
                    ('decide', 'decision', 'Decide handling', {
                        'qtype': 'choice',
                        'instructions': 'Decide how to handle the issue',
                        'criteria': {
                            'options': ['auto_fix', 'assign_team', 'escalate'],
                            'keywords': {
                                'auto_fix': ['typo', 'docs', 'minor'],
                                'assign_team': ['feature', 'task'],
                                'escalate': ['critical', 'outage', 'security'],
                            },
                        },
                    }, 660, 0),
                    ('act', 'action', 'Comment on Jira', {
                        'action': 'http_post',
                        'method': 'POST',
                        'url': 'https://jira.example.com/rest/api/3/issue/{{trigger.issue.key}}/comment',
                        'headers': {'Content-Type': 'application/json'},
                        'body': {'body': 'Auto-triaged as *{{answers.classify}}* '
                                         'with priority *{{answers.prioritize}}*. '
                                         'Route: {{answers._route}}.'},
                        'dry_run': True,
                    }, 880, 0),
                ],
                'edges': [
                    ('trigger', 'classify', 'on-issue'),
                    ('classify', 'prioritize', 'classified'),
                    ('prioritize', 'decide', 'scored'),
                    ('decide', 'act', 'route'),
                ],
            },
            {
                'name': 'Manual review router',
                'description': 'Route manual requests via guard + decision',
                'integration': None,
                'trigger_source': 'manual',
                'nodes': [
                    ('trigger', 'trigger', 'Manual trigger', {}, 0, 0),
                    ('eligible', 'rule', 'Eligibility rule',
                     {'qtype': 'noul', 'instructions': 'Request is approved and ready'}, 220, 0),
                    ('approve', 'action', 'Approve action',
                     {'action': 'approve_request'}, 440, 0),
                ],
                'edges': [
                    ('trigger', 'eligible', 'start'),
                    ('eligible', 'approve', 'eligible'),
                ],
            },
            {
                'name': 'PR auto-review',
                'description': 'Classify pull requests, branch on risk, approve or request changes',
                'integration': github,
                'trigger_source': 'webhook',
                'nodes': [
                    ('trigger', 'trigger', 'PR opened', {'event': 'pull_request.opened'}, 0, 0),
                    ('classify', 'classification', 'Classify change', {
                        'qtype': 'choice',
                        'instructions': 'Classify the pull request',
                        'criteria': {
                            'options': ['docs', 'feature', 'hotfix'],
                            'keywords': {
                                'docs': ['docs', 'readme', 'typo', 'comment'],
                                'hotfix': ['hotfix', 'urgent', 'critical', 'outage'],
                                'feature': ['feature', 'add', 'refactor'],
                            },
                        },
                    }, 220, 0),
                    ('risk', 'branch', 'Risk branch', {'on': 'classify'}, 440, 0),
                    ('decide', 'decision', 'Decide review path', {
                        'qtype': 'choice',
                        'instructions': 'Decide review path for risky change',
                        'criteria': {
                            'options': ['auto_approve', 'request_changes', 'assign_reviewer'],
                            'keywords': {
                                'auto_approve': ['docs', 'minor', 'typo'],
                                'request_changes': ['breaking', 'security'],
                                'assign_reviewer': ['feature', 'large'],
                            },
                        },
                    }, 660, -130),
                    ('approve', 'approval', 'Human approval',
                     {'approvers': ['tech-lead'], 'qtype': 'noul',
                      'instructions': 'Change is safe to merge'}, 660, 130),
                    ('merge', 'action', 'Merge PR', {
                        'action': 'http_post',
                        'method': 'PUT',
                        'url': 'https://api.github.example.com/repos/acme/app/pulls/{{trigger.pr.number}}/merge',
                        'headers': {'Content-Type': 'application/json'},
                        'body': {'commit_title': 'Auto-merge {{trigger.pr.title}}',
                                 'merge_method': 'squash'},
                        'dry_run': True,
                    }, 880, -130),
                    ('notify', 'action', 'Notify channel', {
                        'action': 'http_post',
                        'method': 'POST',
                        'url': 'https://hooks.slack.example/pr',
                        'headers': {'Content-Type': 'application/json'},
                        'body': {'channel': '#eng',
                                 'text': 'PR #{{trigger.pr.number}} {{answers.decide}} '
                                         '(route {{answers._route}})'},
                        'dry_run': True,
                    }, 880, 130),
                ],
                'edges': [
                    ('trigger', 'classify', 'on-pr'),
                    ('classify', 'risk', 'classified'),
                    ('risk', 'approve', 'needs-eyes', {'equals': {'classify': 'hotfix'}}),
                    ('risk', 'decide', 'risky'),
                    ('decide', 'merge', 'approved'),
                    ('approve', 'notify', 'announce'),
                ],
            },
            {
                'name': 'Incident escalation',
                'description': 'Score incoming incidents and escalate critical ones',
                'integration': slack,
                'trigger_source': 'event',
                'nodes': [
                    ('trigger', 'trigger', 'Alert fired', {'event': 'alert.firing'}, 0, 0),
                    ('prioritize', 'prioritization', 'Score severity', {
                        'qtype': 'score',
                        'instructions': 'Score incident severity',
                        'rubric': {
                            'weights': {'blast_radius': 0.6, 'customer_impact': 0.4},
                            'keywords': {
                                'blast_radius': ['outage', 'all regions', 'down'],
                                'customer_impact': ['checkout', 'payments', 'login'],
                            },
                            'levels': [[80, 'critical'], [50, 'major'], [0, 'minor']],
                        },
                    }, 220, 0),
                    ('decide', 'decision', 'Decide response', {
                        'qtype': 'choice',
                        'instructions': 'Decide incident response',
                        'criteria': {
                            'options': ['page_oncall', 'open_bridge', 'log_only'],
                            'keywords': {
                                'page_oncall': ['critical', 'outage'],
                                'open_bridge': ['major', 'payments'],
                                'log_only': ['minor', 'flaky'],
                            },
                        },
                    }, 440, 0),
                    ('approve', 'approval', 'Confirm page',
                     {'approvers': ['incident-commander']}, 660, -120),
                    ('page', 'action', 'Page on-call', {
                        'action': 'http_post',
                        'method': 'POST',
                        'url': 'https://pager.example.com/api/v2/incidents',
                        'headers': {'Content-Type': 'application/json'},
                        'body': {'title': '{{trigger.alert.title}}',
                                 'urgency': 'high',
                                 'severity': '{{answers.prioritize}}'},
                        'dry_run': True,
                    }, 880, -120),
                    ('log', 'action', 'Log only', {
                        'action': 'http_post',
                        'method': 'POST',
                        'url': 'https://logs.example.com/api/incidents',
                        'headers': {'Content-Type': 'application/json'},
                        'body': {'title': '{{trigger.alert.title}}',
                                 'severity': '{{answers.prioritize}}'},
                        'dry_run': True,
                    }, 660, 120),
                ],
                'edges': [
                    ('trigger', 'prioritize', 'on-alert'),
                    ('prioritize', 'decide', 'scored'),
                    ('decide', 'approve', 'critical', {'equals': {'prioritize': 'critical'}}),
                    ('decide', 'log', 'minor'),
                    ('approve', 'page', 'confirmed'),
                ],
            },
            # ------------------------------------------------------------------
            # VHRS integrations: fake data that assumes JevFlow is wired to VHRS.
            # ------------------------------------------------------------------
            {
                'name': 'VHRS Leave Approval',
                'description': 'Receive a leave request from VHRS, check eligibility, route to manager',
                'integration': vhrs,
                'trigger_source': 'webhook',
                'nodes': [
                    ('trigger', 'trigger', 'Leave requested', {'event': 'leave.requested'}, 0, 0),
                    ('eligible', 'rule', 'Balance sufficient', {
                        'qtype': 'noul',
                        'instructions': 'Employee has enough accrued leave balance',
                    }, 220, 0),
                    ('approve', 'approval', 'Manager approval', {
                        'approvers': ['manager'],
                        'qtype': 'noul',
                        'instructions': 'Manager approves the leave request',
                    }, 440, 0),
                    ('act', 'action', 'Update VHRS leave', {
                        'action': 'http_post',
                        'method': 'PATCH',
                        'url': 'http://localhost:8080/api/leave/{{trigger.leave.id}}/',
                        'headers': {'Content-Type': 'application/json'},
                        'body': {
                            'status': 'approved',
                            'approved_by': '{{answers.approve}}',
                            'notes': 'Approved via JevFlow (route: {{answers._route}})',
                        },
                        'dry_run': True,
                    }, 660, 0),
                ],
                'edges': [
                    ('trigger', 'eligible', 'on-leave'),
                    ('eligible', 'approve', 'eligible'),
                    ('approve', 'act', 'approved'),
                ],
            },
            {
                'name': 'VHRS New Hire Onboarding',
                'description': 'When VHRS records a new hire, classify the department and open onboarding tasks',
                'integration': vhrs,
                'trigger_source': 'webhook',
                'nodes': [
                    ('trigger', 'trigger', 'Employee hired', {'event': 'employee.hired'}, 0, 0),
                    ('classify', 'classification', 'Department', {
                        'qtype': 'choice',
                        'instructions': 'Classify the new hire by department',
                        'criteria': {
                            'options': ['engineering', 'sales', 'people', 'finance'],
                            'keywords': {
                                'engineering': ['engineer', 'developer', 'dev', 'sre'],
                                'sales': ['sales', 'account executive', 'ae'],
                                'people': ['hr', 'people', 'recruiter'],
                                'finance': ['finance', 'accountant', 'payroll'],
                            },
                        },
                    }, 220, 0),
                    ('act', 'action', 'Create onboarding record', {
                        'action': 'http_post',
                        'method': 'POST',
                        'url': 'http://localhost:8080/api/staff/',
                        'headers': {'Content-Type': 'application/json'},
                        'body': {
                            'employee_id': '{{trigger.employee.id}}',
                            'name': '{{trigger.employee.name}}',
                            'department': '{{answers.classify}}',
                            'source': 'jevflow',
                        },
                        'dry_run': True,
                    }, 440, 0),
                ],
                'edges': [
                    ('trigger', 'classify', 'on-hire'),
                    ('classify', 'act', 'route'),
                ],
            },
        ]

        for spec in specs:
            decision_map = DecisionMap.objects.create(
                name=spec['name'],
                description=spec['description'],
                integration=spec['integration'],
                version='1.0.0',
                is_active=True,
                trigger_source=spec['trigger_source'],
                layout={'nodes': [], 'edges': []},
                account=account,
                status='activated',
            )
            node_objs = {}
            inbound_hook = WebhookEndpoint.objects.filter(
                integration=spec['integration'], direction='inbound', is_active=True).first()
            outbound_hook = WebhookEndpoint.objects.filter(
                integration=spec['integration'], direction='outbound', is_active=True).first()
            # For VHRS maps, prefer the dedicated outbound hook that points at
            # the local VHRS API rather than the generic customer hook.
            if spec['integration'] and spec['integration'].name.startswith('VHRS'):
                vhrs_api_hook = WebhookEndpoint.objects.filter(
                    integration=spec['integration'],
                    direction='outbound',
                    target_url__startswith='http://localhost:8080',
                    is_active=True,
                ).first()
                if vhrs_api_hook:
                    outbound_hook = vhrs_api_hook
            approval_tool = next((t for t in tools if t.status == 'activated'), None)
            for key, ntype, title, config, x, y in spec['nodes']:
                cfg = dict(config)
                if ntype == 'trigger' and inbound_hook is not None:
                    cfg['webhook_endpoint'] = inbound_hook.id
                if ntype == 'action' and outbound_hook is not None:
                    cfg['webhook_endpoint'] = outbound_hook.id
                if ntype == 'approval' and approval_tool is not None:
                    cfg['approval_tool'] = approval_tool.id
                node_objs[key] = DecisionNode.objects.create(
                    name=title,
                    map=decision_map,
                    node_key=key,
                    node_type=ntype,
                    title=title,
                    config=cfg,
                    position_x=x,
                    position_y=y,
                    status='activated',
                )
            for prio, edge in enumerate(spec['edges']):
                src, tgt, label = edge[0], edge[1], edge[2]
                condition = edge[3] if len(edge) > 3 else {}
                DecisionEdge.objects.create(
                    name=f'{src}->{tgt}',
                    map=decision_map,
                    source=node_objs[src],
                    target=node_objs[tgt],
                    label=label,
                    condition=condition,
                    priority=prio,
                    status='activated',
                )
            decision_map.refresh_spec_yaml()
            maps.append(decision_map)
        return maps

    def create_decision_runs(self, maps):
        # Runs go through the real execution path (not canned rows) so seeded
        # data is coherent end to end: answers from the engine, action_results
        # from bound outbound hooks (dry_run in seeds: rendered, not sent),
        # ApprovalRequests + SyncLogs wherever a trace visits approval nodes.
        from jev_engine.views import run_map_for_trigger

        runs = []
        samples = [
            {'summary': 'Critical outage in payment service, urgent fix needed',
             'labels': ['outage', 'critical', 'production']},
            {'summary': 'Add dark mode feature request from customer',
             'labels': ['feature', 'request']},
            {'summary': 'Fix typo in docs page',
             'labels': ['docs', 'minor']},
            {'summary': 'Intermittent login error on mobile app',
             'labels': ['bug', 'error']},
            # Jira-webhook shaped payload (nested issue object for {{trigger.issue.key}}).
            {'issue': {'key': 'PROJ-123', 'type': 'bug',
                       'url': 'https://jira.example.com/browse/PROJ-123'},
             'summary': 'Login button broken on checkout page',
             'labels': ['bug', 'error', 'checkout']},
            # GitHub PR webhook shaped payload.
            {'pr': {'number': 42, 'title': 'Fix login redirect',
                    'url': 'https://github.example.com/acme/app/pull/42'},
             'summary': 'Fix login redirect loop',
             'labels': ['bug', 'minor']},
            # VHRS-shaped payloads.
            {'event': 'leave.requested',
             'leave': {'id': 101, 'days': 5, 'type': 'annual'},
             'employee': {'id': 201, 'name': 'Alice Engineer', 'department': 'engineering'},
             'summary': 'Alice Engineer requested 5 days of annual leave',
             'labels': ['leave', 'annual']},
            {'event': 'employee.hired',
             'employee': {'id': 301, 'name': 'Bob Sales', 'department': 'sales'},
             'summary': 'New hire Bob Sales joined the sales team',
             'labels': ['new-hire', 'sales', 'onboarding']},
        ]
        for decision_map in maps:
            for sample in samples:
                summary = run_map_for_trigger(decision_map, dict(sample))
                DecisionRun.objects.filter(id=summary['run']).update(
                    name=f'run {decision_map.name}')
                runs.append(summary['run'])
        return runs

    # ------------------------------------------------------------------
    def create_engine_presets_and_calls(self, account, users, maps):
        for preset_type in ['route', 'tool-guard', 'research', 'completion', 'custom']:
            preset = EnginePreset.objects.create(
                name=f'{preset_type} preset',
                description=f'Default {preset_type} preset',
                preset_type=preset_type,
                model='jev-latest',
                config={'questions': [
                    {'key': 'triage', 'qtype': 'choice',
                     'criteria': {'options': ['auto_fix', 'assign_team', 'escalate'],
                                  'keywords': {'escalate': ['critical', 'outage']}}},
                ]},
                status='activated',
            )
            for decision_map in maps[:1]:
                EngineCall.objects.create(
                    name=f'call {preset_type}',
                    preset=preset,
                    map=decision_map,
                    state={'summary': self.faker.sentence()},
                    questions=preset.config.get('questions', []),
                    answers={'triage': 'assign_team', '_route': 'proceed_fast'},
                    latency_ms=random.randint(5, 500),
                    created_by=random.choice(users),
                    status='activated',
                )

    # ------------------------------------------------------------------
    def create_audit_logs(self, users):
        for _ in range(20):
            user = random.choice(users)
            model_name = random.choice(['Integration', 'DecisionMap', 'DecisionRun', 'EngineCall'])
            AuditLog.objects.create(
                user=user,
                action=random.choice(['CREATE', 'UPDATE', 'VIEW', 'WEBHOOK', 'DECISION']),
                model_name=model_name,
                object_id=random.randint(1, 50),
                object_repr=f'{model_name} #{random.randint(1, 50)}',
                changes={'before': {}, 'after': {'status': 'activated'}},
                ip_address=self.faker.ipv4(),
                user_agent=self.faker.user_agent(),
            )

    def create_notifications(self, users, maps, integrations):
        for user in users:
            Notification.objects.create(
                recipient=user,
                title='Decision made',
                message=f'Decision map "{maps[0].name}" completed a run.',
                notification_type='decision_made',
                related_object_type='decisions.DecisionRun',
                related_object_id=1,
                action_url='/decisions/runs/1',
            )
            Notification.objects.create(
                recipient=user,
                title='Integration connected',
                message=f'"{integrations[0].name}" is connected.',
                notification_type='integration_connected',
                related_object_type='integrations.Integration',
                related_object_id=integrations[0].id,
                action_url=f'/integrations/{integrations[0].id}',
            )
