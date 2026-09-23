# identity_api/models.py
from django.conf import settings
from django.db import models
from django.contrib.auth.models import AbstractUser
from base.models import BaseModel
from base.constants import AUTH_PROVIDER_CHOICES, PERMISSION_CHOICES
from .managers import CustomUserManager


class CustomUser(AbstractUser, BaseModel):
    email = models.EmailField(unique=True)
    is_admin = models.BooleanField(default=False)
    account = models.ForeignKey(
        'Account',
        on_delete=models.CASCADE,
        related_name='users',
        null=True,
        blank=True
    )
    auth_provider = models.CharField(
        max_length=20, choices=AUTH_PROVIDER_CHOICES, default='local'
    )
    avatar_url = models.URLField(max_length=500, null=True, blank=True)

    objects = CustomUserManager()

    def __str__(self):
        return self.username


class Account(BaseModel):
    """Company/Organization account (name inherited from BaseModel)."""
    slug = models.SlugField(unique=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'identity_api_account'

    def __str__(self):
        return self.name or self.slug


class App(BaseModel):
    title = models.CharField(max_length=30, unique=True)
    pathUrl = models.CharField(max_length=100)
    entity_name = models.CharField(max_length=100, default='default_entity_name')
    is_global = models.BooleanField(default=False)  # Global apps visible to all

    class Meta:
        db_table = 'identity_api_app'

    def __str__(self):
        return self.title


class Role(BaseModel):
    title = models.CharField(max_length=30)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    permission = models.CharField(max_length=3, choices=PERMISSION_CHOICES, default='R')
    app = models.ForeignKey(App, on_delete=models.CASCADE)
    account = models.ForeignKey(
        Account,
        on_delete=models.CASCADE,
        related_name='roles',
        null=True,
        blank=True
    )

    class Meta:
        db_table = 'identity_api_role'
        unique_together = ['user', 'app', 'account']  # One role per user per app per account

    def __str__(self):
        return f"{self.title} - {self.user.username}"


class Login(BaseModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    timestamp = models.DateTimeField(auto_now_add=True)
    provider = models.CharField(max_length=20, choices=AUTH_PROVIDER_CHOICES, default='local')
    ip = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        db_table = 'identity_api_login'


class SocialAccount(BaseModel):
    """OAuth account linkage (google / github / x / outlook / slack)."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='social_accounts'
    )
    provider = models.CharField(max_length=20, choices=AUTH_PROVIDER_CHOICES)
    provider_uid = models.CharField(max_length=200)
    extra_data = models.JSONField(null=True, blank=True)
    access_token = models.TextField(null=True, blank=True)
    refresh_token = models.TextField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'identity_api_socialaccount'
        unique_together = ['provider', 'provider_uid']

    def __str__(self):
        return f"{self.user} - {self.provider}"


class OAuthProvider(BaseModel):
    """OAuth client keys stored in Django (single source of truth).

    One row per login provider (google / github / x / outlook / slack).
    Global (no account scoping) — macaco fetches these server-to-server at
    boot to configure Passport, so user-identity login never depends on
    proxy env vars. Secrets are write-only over the API; the public
    ``/auth/providers/`` endpoint only exposes client_id + flags.
    """
    provider = models.CharField(
        max_length=20, choices=AUTH_PROVIDER_CHOICES, unique=True
    )
    client_id = models.CharField(max_length=500, blank=True, default='')
    client_secret = models.TextField(blank=True, default='')
    is_active = models.BooleanField(default=False)
    config = models.JSONField(null=True, blank=True)

    class Meta:
        db_table = 'identity_api_oauthprovider'

    def __str__(self):
        return f"oauth:{self.provider}"

    @property
    def configured(self):
        return bool(self.is_active and self.client_id and self.client_secret)
