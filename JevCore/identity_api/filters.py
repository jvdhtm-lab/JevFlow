"""Explicit backend filters for identity_api.

Every filter carries label/help_text so drf-yasg renders it as a
documented Swagger query parameter (exact, icontains and range lookups).
"""
import django_filters

from base.constants import AUTH_PROVIDER_CHOICES, PERMISSION_CHOICES, STATUS_CHOICES
from .models import Account, App, CustomUser, Login, OAuthProvider, Role, SocialAccount


class CustomUserFilter(django_filters.FilterSet):
    username = django_filters.CharFilter(
        lookup_expr='icontains', label='Username contains',
        help_text='Case-insensitive substring match on username.')
    email = django_filters.CharFilter(
        lookup_expr='icontains', label='Email contains',
        help_text='Case-insensitive substring match on email.')
    first_name = django_filters.CharFilter(
        lookup_expr='icontains', label='First name contains',
        help_text='Case-insensitive substring match on first name.')
    last_name = django_filters.CharFilter(
        lookup_expr='icontains', label='Last name contains',
        help_text='Case-insensitive substring match on last name.')
    auth_provider = django_filters.ChoiceFilter(
        choices=AUTH_PROVIDER_CHOICES, label='Auth provider',
        help_text='Exact match: local, google, github, x, outlook or slack.')
    is_active = django_filters.BooleanFilter(label='Is active', help_text='Exact boolean match.')
    is_staff = django_filters.BooleanFilter(label='Is staff', help_text='Exact boolean match.')
    status = django_filters.ChoiceFilter(
        choices=STATUS_CHOICES, label='Status', help_text='Exact status match.')
    date_joined_after = django_filters.DateTimeFilter(
        field_name='date_joined', lookup_expr='gte', label='Joined after',
        help_text='Users who joined at or after this ISO datetime.')
    date_joined_before = django_filters.DateTimeFilter(
        field_name='date_joined', lookup_expr='lte', label='Joined before',
        help_text='Users who joined at or before this ISO datetime.')

    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'first_name', 'last_name',
                  'auth_provider', 'is_active', 'is_staff',
                  'status', 'date_joined_after', 'date_joined_before']


class AccountFilter(django_filters.FilterSet):
    name = django_filters.CharFilter(
        lookup_expr='icontains', label='Name contains',
        help_text='Case-insensitive substring match on account name.')
    slug = django_filters.CharFilter(
        lookup_expr='exact', label='Slug', help_text='Exact slug match.')
    is_active = django_filters.BooleanFilter(label='Is active', help_text='Exact boolean match.')
    status = django_filters.ChoiceFilter(
        choices=STATUS_CHOICES, label='Status', help_text='Exact status match.')

    class Meta:
        model = Account
        fields = ['id', 'name', 'slug', 'is_active', 'status']


class AppFilter(django_filters.FilterSet):
    title = django_filters.CharFilter(
        lookup_expr='icontains', label='Title contains',
        help_text='Case-insensitive substring match on title.')
    entity_name = django_filters.CharFilter(
        lookup_expr='exact', label='Entity name', help_text='Exact entity (model) name.')
    is_global = django_filters.BooleanFilter(label='Is global', help_text='Exact boolean match.')

    class Meta:
        model = App
        fields = ['id', 'title', 'entity_name', 'is_global']


class RoleFilter(django_filters.FilterSet):
    title = django_filters.CharFilter(
        lookup_expr='icontains', label='Title contains',
        help_text='Case-insensitive substring match on role title.')
    user = django_filters.NumberFilter(
        field_name='user', lookup_expr='exact', label='User ID',
        help_text='Exact user ID.')
    app = django_filters.NumberFilter(
        field_name='app', lookup_expr='exact', label='App ID',
        help_text='Exact app (entity) ID.')
    permission = django_filters.ChoiceFilter(
        choices=PERMISSION_CHOICES, label='Permission',
        help_text='Exact permission tier: R, W, RW or RWD.')

    class Meta:
        model = Role
        fields = ['id', 'title', 'user', 'app', 'permission']


class LoginFilter(django_filters.FilterSet):
    user = django_filters.NumberFilter(
        field_name='user', lookup_expr='exact', label='User ID',
        help_text='Exact user ID.')
    provider = django_filters.ChoiceFilter(
        choices=AUTH_PROVIDER_CHOICES, label='Provider',
        help_text='Exact provider: local, google, github, x, outlook or slack.')
    timestamp_after = django_filters.DateTimeFilter(
        field_name='timestamp', lookup_expr='gte', label='Logged in after',
        help_text='Logins at or after this ISO datetime.')
    timestamp_before = django_filters.DateTimeFilter(
        field_name='timestamp', lookup_expr='lte', label='Logged in before',
        help_text='Logins at or before this ISO datetime.')

    class Meta:
        model = Login
        fields = ['id', 'user', 'provider', 'timestamp_after', 'timestamp_before']


class SocialAccountFilter(django_filters.FilterSet):
    user = django_filters.NumberFilter(
        field_name='user', lookup_expr='exact', label='User ID',
        help_text='Exact user ID.')
    provider = django_filters.ChoiceFilter(
        choices=AUTH_PROVIDER_CHOICES, label='Provider',
        help_text='Exact provider: google, github, x, outlook or slack.')
    provider_uid = django_filters.CharFilter(
        lookup_expr='exact', label='Provider UID',
        help_text='Exact upstream provider user ID.')

    class Meta:
        model = SocialAccount
        fields = ['id', 'user', 'provider', 'provider_uid']


class OAuthProviderFilter(django_filters.FilterSet):
    provider = django_filters.ChoiceFilter(
        choices=AUTH_PROVIDER_CHOICES, label='Provider',
        help_text='Exact provider: google, github, x, outlook or slack.')
    is_active = django_filters.BooleanFilter(label='Is active', help_text='Exact boolean match.')
    status = django_filters.ChoiceFilter(
        choices=STATUS_CHOICES, label='Status', help_text='Exact status match.')

    class Meta:
        model = OAuthProvider
        fields = ['id', 'provider', 'is_active', 'status']
