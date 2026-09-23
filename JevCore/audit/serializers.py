from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = ('id', 'user', 'action', 'model_name', 'object_id',
                  'object_repr', 'changes', 'timestamp',
                  'ip_address', 'user_agent')
        read_only_fields = ('id', 'timestamp')
