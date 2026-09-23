from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ('id', 'recipient', 'title', 'message', 'notification_type',
                  'is_read', 'read_at', 'related_object_type',
                  'related_object_id', 'action_url', 'created_at')
        read_only_fields = ('id', 'created_at')
