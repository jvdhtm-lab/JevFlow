from rest_framework import serializers
from .models import Integration, WebhookEndpoint, SyncLog


class IntegrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Integration
        fields = ('id', 'name', 'description', 'purpose', 'integration_type', 'base_url',
                  'connection_status', 'config', 'credentials_hint', 'owner',
                  'last_sync_at', 'last_error', 'account', 'status',
                  'created_date_time', 'updated_date_time')
        read_only_fields = ('id', 'created_date_time', 'updated_date_time')


class WebhookEndpointSerializer(serializers.ModelSerializer):
    integration_name = serializers.CharField(source='integration.name', read_only=True)
    integration_type = serializers.CharField(source='integration.integration_type', read_only=True)
    integration_base_url = serializers.CharField(source='integration.base_url', read_only=True)
    inbound_url = serializers.SerializerMethodField()
    outbound_url = serializers.SerializerMethodField()
    auth_required = serializers.SerializerMethodField()
    outbound_auth = serializers.SerializerMethodField()

    class Meta:
        model = WebhookEndpoint
        fields = ('id', 'name', 'description', 'integration', 'integration_name',
                  'integration_type', 'integration_base_url', 'direction', 'secret',
                  'source', 'target_path', 'target_url', 'auth_scheme',
                  'auth_username', 'is_active', 'last_received_at',
                  'inbound_url', 'outbound_url', 'auth_required', 'outbound_auth',
                  'account', 'status', 'created_date_time', 'updated_date_time')
        read_only_fields = ('id', 'created_date_time', 'updated_date_time')
        extra_kwargs = {'auth_token': {'write_only': True}}

    def get_inbound_url(self, obj):
        """The ONE fixed inbound hook URL shared by every inbound hook.

        Goes through macaco like the rest of the SPA, but the receiver is
        public (secret/HMAC-checked). The per-customer secret identifies
        whose call it is."""
        if obj.direction != 'inbound':
            return ''
        return "/api/webhook-endpoint/receive/"

    def get_outbound_url(self, obj):
        """Customer-provided outbound destination — outbound hooks only."""
        if obj.direction != 'outbound':
            return ''
        return obj.target_url or ''

    def get_auth_required(self, obj):
        """True when inbound calls must authenticate (secret or HMAC)."""
        return obj.direction == 'inbound' and bool(obj.secret)

    def get_outbound_auth(self, obj):
        """Which credential the customer provided for outbound calls.

        Endpoint-level auth wins; falls back to Integration.config so older
        rows keep working. The UI shows e.g. 'bearer from Jira hook' vs
        'basic from Jira integration' vs 'no credentials configured'.
        """
        if obj.direction != 'outbound':
            return 'none'
        if obj.auth_scheme in ('bearer', 'basic') and obj.auth_token:
            return obj.auth_scheme
        cfg = (obj.integration.config if obj.integration else None) or {}
        if cfg.get('access_token') or cfg.get('bearer_token') or cfg.get('bot_token'):
            return 'bearer'
        if (cfg.get('api_token') or cfg.get('token')) and (cfg.get('username') or cfg.get('email')):
            return 'basic'
        if cfg.get('username') and cfg.get('password'):
            return 'basic'
        return 'none'


class SyncLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SyncLog
        fields = ('id', 'name', 'description', 'integration', 'direction',
                  'event_type', 'payload', 'result', 'error_msg', 'duration_ms',
                  'account', 'status', 'created_date_time', 'updated_date_time')
        read_only_fields = ('id', 'created_date_time', 'updated_date_time')
