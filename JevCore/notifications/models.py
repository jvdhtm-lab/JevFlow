from django.db import models
from django.conf import settings


class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('integration_connected', 'Integration Connected'),
        ('integration_error', 'Integration Error'),
        ('webhook_received', 'Webhook Received'),
        ('decision_made', 'Decision Made'),
        ('decision_escalated', 'Decision Escalated'),
        ('approval_needed', 'Approval Needed'),
        ('system', 'System Notification'),
    ]

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    # Link to related object (polymorphic-like)
    related_object_type = models.CharField(max_length=100, null=True, blank=True)
    related_object_id = models.IntegerField(null=True, blank=True)

    # Action URL for frontend navigation
    action_url = models.CharField(max_length=500, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        indexes = [
            models.Index(fields=['recipient', 'is_read', '-created_at']),
            models.Index(fields=['notification_type', 'created_at']),
        ]

    def __str__(self):
        return f"{self.title} - {self.recipient}"
