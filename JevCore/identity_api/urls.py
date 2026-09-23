from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'user', views.UserViewSet)
router.register(r'account', views.AccountViewSet)
router.register(r'app', views.AppViewSet)
router.register(r'role', views.RoleViewSet)
router.register(r'login', views.LoginViewSet)
router.register(r'social-account', views.SocialAccountViewSet)
router.register(r'oauth-provider', views.OAuthProviderViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
