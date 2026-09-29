from rest_framework.permissions import BasePermission
from identity_api.models import Role, App


# EntityPermission for per-model permissions (mirrors VHRS)
class EntityPermission(BasePermission):
    METHOD_PERMISSION_MAP = {
        'GET': 'R',
        'HEAD': 'R',
        'OPTIONS': 'R',
        'POST': 'W',
        'PUT': 'W',
        'PATCH': 'W',
        'DELETE': 'D',
    }

    PERMISSION_WEIGHTS = {
        'R': 1,
        'W': 2,
        'RW': 3,
        'RWD': 4,
    }

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.user.is_superuser or getattr(request.user, 'is_admin', False):
            return True

        entity_names = self._get_entity_names(view)
        if not entity_names:
            return True

        user_permission = self._get_user_permission(request.user, entity_names)
        if not user_permission:
            return False

        required = self.METHOD_PERMISSION_MAP.get(request.method, 'RWD')
        return self._has_sufficient_permission(user_permission, required)

    def _get_entity_names(self, view):
        """Extract all plausible entity names from the viewset's queryset model."""
        if hasattr(view, 'queryset') and view.queryset is not None:
            model = view.queryset.model
            app_label = model._meta.app_label
            model_name = model._meta.model_name
            class_name = model.__name__
            return [
                model_name,
                f"{app_label}_{model_name}",
                class_name,
                f"{app_label}.{class_name}",
            ]

        # Fallback to module parsing
        if hasattr(view, '__class__'):
            module = view.__class__.__module__
            if '.' in module:
                return [module.split('.')[0]]

        return []

    def _get_user_permission(self, user, entity_names):
        if isinstance(entity_names, str):
            entity_names = [entity_names]
        roles = Role.objects.filter(
            user=user,
            app__entity_name__in=entity_names
        ).select_related('app')
        account_id = getattr(user, 'account_id', None)
        if account_id is not None:
            role = roles.filter(account_id=account_id).first()
            if role:
                return role.permission
        role = roles.filter(account__isnull=True).first() or roles.first()
        return role.permission if role else None

    def _has_sufficient_permission(self, user_perm, required):
        user_level = self.PERMISSION_WEIGHTS.get(user_perm, 0)

        if required == 'D':
            return user_level >= 4
        return user_level >= self.PERMISSION_WEIGHTS.get(required, 0)


class EntityPermissionMixin:
    """
    Mixin to add entity permission checking to viewsets.
    Usage:
        class MyViewSet(EntityPermissionMixin, BaseViewSet):
            permission_classes = [IsAuthenticated, EntityPermission]
    """

    def get_queryset(self):
        """Optionally filter queryset based on user's roles"""
        return super().get_queryset()
