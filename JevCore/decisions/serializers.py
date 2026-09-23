from rest_framework import serializers
from .models import (
    DecisionMap, DecisionNode, DecisionEdge, DecisionRun,
    ApprovalTool, ApprovalRequest,
)


class DecisionMapSerializer(serializers.ModelSerializer):
    class Meta:
        model = DecisionMap
        fields = ('id', 'name', 'description', 'integration', 'version',
                  'is_active', 'layout', 'spec_yaml', 'trigger_source', 'account',
                  'status', 'created_date_time', 'updated_date_time')
        read_only_fields = ('id', 'spec_yaml', 'created_date_time', 'updated_date_time')


class DecisionNodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DecisionNode
        fields = ('id', 'name', 'description', 'map', 'node_key', 'node_type',
                  'title', 'config', 'position_x', 'position_y',
                  'status', 'created_date_time', 'updated_date_time')
        read_only_fields = ('id', 'created_date_time', 'updated_date_time')


class DecisionEdgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DecisionEdge
        fields = ('id', 'name', 'description', 'map', 'source', 'target',
                  'label', 'condition', 'priority',
                  'status', 'created_date_time', 'updated_date_time')
        read_only_fields = ('id', 'created_date_time', 'updated_date_time')


class DecisionRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = DecisionRun
        fields = ('id', 'name', 'description', 'map', 'trigger_event', 'status',
                  'answers', 'decided_route', 'confidence', 'executed_action',
                  'action_results',
                  'error', 'started_at', 'finished_at',
                  'created_date_time', 'updated_date_time')
        read_only_fields = ('id', 'created_date_time', 'updated_date_time')


class ApprovalToolSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApprovalTool
        fields = ('id', 'name', 'description', 'tool_type', 'target', 'config',
                  'is_active', 'account', 'status',
                  'created_date_time', 'updated_date_time')
        read_only_fields = ('id', 'created_date_time', 'updated_date_time')


class ApprovalRequestSerializer(serializers.ModelSerializer):
    review_url = serializers.SerializerMethodField()

    class Meta:
        model = ApprovalRequest
        fields = ('id', 'name', 'description', 'map', 'run', 'node_key',
                  'approval_tool', 'token', 'status', 'payload',
                  'decided_by', 'decided_at', 'review_url', 'account',
                  'created_date_time', 'updated_date_time')
        read_only_fields = ('id', 'token', 'decided_by', 'decided_at',
                            'created_date_time', 'updated_date_time')

    def get_review_url(self, obj):
        return f"/approvals/{obj.token}/"
