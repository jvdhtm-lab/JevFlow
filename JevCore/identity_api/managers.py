from django.contrib.auth.models import BaseUserManager


class CustomUserManager(BaseUserManager):
    """Manager for CustomUser (email + username based)."""

    def create_user(self, username, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email must be set')
        email = self.normalize_email(email)
        user = self.model(username=username, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('is_admin', True)
        extra_fields.setdefault('status', 'activated')

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(username, email, password, **extra_fields)

    def register_app(self, title, pathUrl, entity_name=None):
        from .models import App
        new_app, _ = App.objects.get_or_create(
            title=title,
            defaults={
                'pathUrl': pathUrl,
                'entity_name': entity_name or title,
                'status': 'activated',
            },
        )
        return new_app

    def create_role(self, title, user, permission, app, account=None):
        from .models import Role
        new_role, _ = Role.objects.get_or_create(
            title=title,
            user=user,
            permission=permission,
            app=app,
            account=account,
        )
        return new_role
