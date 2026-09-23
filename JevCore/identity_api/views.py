from base.views import BaseViewSet, CreateListMixin
from django.utils.text import slugify
from django.utils.dateparse import parse_datetime
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
import logging
from identity_api.models import (
    CustomUser as User, App, Role, Login, Account, SocialAccount,
    OAuthProvider,
)
from identity_api.serializers import (
    UserSerializer, AppSerializer, RoleSerializer, LoginSerializer,
    AccountSerializer, LoginRecordSerializer, SocialAccountSerializer,
    OAuthProviderSerializer,
)
from .filters import (
    AccountFilter, AppFilter, CustomUserFilter,
    LoginFilter, OAuthProviderFilter, RoleFilter, SocialAccountFilter,
)

logger = logging.getLogger(__name__)


class UserViewSet(CreateListMixin, BaseViewSet):
    queryset = User.objects.order_by('pk')
    serializer_class = UserSerializer
    filterset_class = CustomUserFilter
    search_fields = ["username", "email", "first_name", "last_name"]
    ordering_fields = ["id", "username", "email", "date_joined", "auth_provider"]


class AppViewSet(CreateListMixin, BaseViewSet):
    queryset = App.objects.order_by('pk')
    serializer_class = AppSerializer
    filterset_class = AppFilter
    search_fields = ["title", "entity_name", "pathUrl"]
    ordering_fields = ["id", "title", "entity_name"]


class RoleViewSet(CreateListMixin, BaseViewSet):
    queryset = Role.objects.order_by('pk')
    serializer_class = RoleSerializer
    filterset_class = RoleFilter
    search_fields = ["title"]
    ordering_fields = ["id", "title", "permission"]


class AccountViewSet(CreateListMixin, BaseViewSet):
    queryset = Account.objects.order_by('pk')
    serializer_class = AccountSerializer
    filterset_class = AccountFilter
    search_fields = ["name", "slug"]
    ordering_fields = ["id", "name", "slug"]


class LoginViewSet(CreateListMixin, BaseViewSet):
    """Login history records."""
    queryset = Login.objects.order_by('pk')
    serializer_class = LoginRecordSerializer
    filterset_class = LoginFilter
    search_fields = ["ip"]
    ordering_fields = ["id", "timestamp", "provider"]


class SocialAccountViewSet(CreateListMixin, BaseViewSet):
    queryset = SocialAccount.objects.order_by('pk')
    serializer_class = SocialAccountSerializer
    filterset_class = SocialAccountFilter
    search_fields = ["provider_uid"]
    ordering_fields = ["id", "provider", "expires_at"]


class OAuthProviderViewSet(CreateListMixin, BaseViewSet):
    """OAuth client keys live in Django (single source of truth)."""
    queryset = OAuthProvider.objects.order_by('pk')
    serializer_class = OAuthProviderSerializer
    filterset_class = OAuthProviderFilter
    search_fields = ["provider"]
    ordering_fields = ["id", "provider", "is_active"]


class PublicProvidersView(APIView):
    """Public (no secret) provider list for the login page + macaco boot.

    Only exposes client_id + flags — never client_secret.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        return Response([
            {'provider': p.provider, 'client_id': p.client_id, 'configured': p.configured}
            for p in OAuthProvider.objects.filter(is_active=True).order_by('provider')
        ])


class SocialLoginView(APIView):
    """Server-to-server social login (called by macaco with its service token).

    The proxy already verified the profile with the provider. First login
    creates the user + SocialAccount link + tenant Account + Owner RWD roles;
    returning users (by provider_uid, else email) just log in.
    """
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['provider', 'provider_uid', 'email'],
            properties={
                'provider': openapi.Schema(type=openapi.TYPE_STRING),
                'provider_uid': openapi.Schema(type=openapi.TYPE_STRING),
                'email': openapi.Schema(type=openapi.TYPE_STRING),
                'first_name': openapi.Schema(type=openapi.TYPE_STRING),
                'last_name': openapi.Schema(type=openapi.TYPE_STRING),
                'avatar_url': openapi.Schema(type=openapi.TYPE_STRING),
                'access_token': openapi.Schema(type=openapi.TYPE_STRING),
                'refresh_token': openapi.Schema(type=openapi.TYPE_STRING),
                'expires_at': openapi.Schema(type=openapi.TYPE_STRING),
            },
        ),
        tags=['auth'],
        operation_id='auth_social',
        operation_description='Social login (proxy-verified profile)',
    )
    def post(self, request):
        from base.constants import AUTH_PROVIDER_CHOICES

        data = request.data or {}
        provider = (data.get('provider') or '').lower()
        provider_uid = str(data.get('provider_uid') or '')
        email = (data.get('email') or '').strip().lower()
        valid = {c for c, _ in AUTH_PROVIDER_CHOICES} - {'local'}
        if provider not in valid or not provider_uid or not email:
            return Response(
                {'detail': 'provider, provider_uid and email are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        account = None
        social = SocialAccount.objects.filter(
            provider=provider, provider_uid=provider_uid
        ).select_related('user').first()
        if social is not None:
            user = social.user
            account = user.account
        else:
            user = User.objects.filter(email=email).first()
            if user is None:
                base = slugify(data.get('first_name') or email.split('@')[0] or provider) or provider
                slug, i = base[:60], 1
                while Account.objects.filter(slug=slug).exists():
                    i += 1
                    slug = f"{base[:55]}-{i}"
                account = Account.objects.create(
                    name=f"{data.get('first_name') or email} workspace",
                    slug=slug,
                    is_active=True,
                    status='activated',
                )
                user = User.objects.create_user(
                    username=email,
                    email=email,
                    password=None,
                    first_name=data.get('first_name') or '',
                    last_name=data.get('last_name') or '',
                    auth_provider=provider,
                    avatar_url=data.get('avatar_url') or None,
                    account=account,
                    is_active=True,
                    status='activated',
                )
                for app in App.objects.all():
                    Role.objects.get_or_create(
                        user=user,
                        app=app,
                        account=account,
                        defaults={
                            'title': 'Owner RWD',
                            'permission': 'RWD',
                            'status': 'activated',
                        },
                    )
            social, _ = SocialAccount.objects.get_or_create(
                provider=provider,
                provider_uid=provider_uid,
                defaults={'user': user, 'status': 'activated'},
            )
            if social.user_id != user.id:
                social.user = user

        expires_at = data.get('expires_at')
        social.access_token = data.get('access_token') or social.access_token
        social.refresh_token = data.get('refresh_token') or social.refresh_token
        social.expires_at = parse_datetime(expires_at) if expires_at else social.expires_at
        social.extra_data = {
            'email': email,
            'first_name': data.get('first_name') or '',
            'last_name': data.get('last_name') or '',
            'avatar_url': data.get('avatar_url') or '',
        }
        social.status = 'activated'
        social.save()

        if account is None:
            account = user.account
        if user.account_id is None and account is not None:
            user.account = account
            user.save(update_fields=['account'])

        token, _ = Token.objects.get_or_create(user=user)
        Login.objects.create(
            user=user,
            provider=provider,
            ip=request.META.get('REMOTE_ADDR'),
            status='activated',
        )
        return Response({
            'message': 'Login successful',
            'token': token.key,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
            },
        }, status=201)


class LoginTokenView(ObtainAuthToken):
    """Token login at /auth/login/ — validates via LoginSerializer,
    returns token + user, and records a Login row."""

    @swagger_auto_schema(
        request_body=LoginSerializer,
        responses={
            201: openapi.Response(
                description="Login successful",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'message': openapi.Schema(type=openapi.TYPE_STRING),
                        'token': openapi.Schema(type=openapi.TYPE_STRING),
                        'user': openapi.Schema(type=openapi.TYPE_OBJECT),
                    }
                )
            )
        },
        tags=['auth'],
        operation_id='auth_login',
        operation_description='User login endpoint'
    )
    def post(self, request, *args, **kwargs):
        logger.debug("Login request received with data: %s", request.data)
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            logger.debug("Login validation failed: %s", serializer.errors)
            return Response(serializer.errors, status=401)

        user = serializer.validated_data['user']
        token, _ = Token.objects.get_or_create(user=user)

        Login.objects.create(
            user=user,
            provider='local',
            ip=request.META.get('REMOTE_ADDR'),
            status='activated',
        )

        return Response({
            'message': 'Login successful',
            'token': token.key,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
            }
        }, status=201)
