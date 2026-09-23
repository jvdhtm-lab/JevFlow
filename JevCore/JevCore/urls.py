"""JevCore URL Configuration."""
from django.contrib import admin
from django.urls import include, path, re_path
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

from identity_api.views import LoginTokenView, PublicProvidersView, SocialLoginView

schema_view = get_schema_view(
    openapi.Info(
        title="JevFlow API",
        default_version='v2',
        description="JevFlow decision-engine backend API",
        terms_of_service="https://www.google.com/policies/terms/",
        contact=openapi.Contact(email="contact@jevflow.local"),
        license=openapi.License(name="BSD License"),
    ),
    public=True,
    permission_classes=[permissions.AllowAny],
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('auth/login/', LoginTokenView.as_view(), name='auth-login'),
    path('auth/social/', SocialLoginView.as_view(), name='auth-social'),
    path('auth/providers/', PublicProvidersView.as_view(), name='auth-providers'),
    # Apps mount at ROOT (VHRS shape): the SPA calls /api/<route>/ and the
    # macaco proxy strips /api before forwarding to Django.
    path('', include('identity_api.urls')),
    path('', include('integrations.urls')),
    path('', include('decisions.urls')),
    path('', include('jev_engine.urls')),
    path('', include('audit.urls')),
    path('', include('notifications.urls')),
    re_path(r'^swagger(?P<format>\.json|\.yaml)$', schema_view.without_ui(cache_timeout=0), name='schema-json'),
    re_path(r'^swagger/$', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    re_path(r'^redoc/$', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
]
