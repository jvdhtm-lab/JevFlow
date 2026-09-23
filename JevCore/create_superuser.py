# Import necessary modules
import os
import django
import time
from django.db import connections
from django.db.utils import OperationalError

# Set the Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'JevCore.settings')
django.setup()

# Function to wait for database to be ready
def wait_for_db(retries=20, delay=5):
    for _ in range(retries):
        try:
            # Attempt to connect to the database
            with connections['default'].cursor() as cursor:
                cursor.execute('SELECT 1')
            print('Database connection established.')
            return
        except OperationalError:
            print(f'Database connection failed. Retrying in {delay} seconds...')
            time.sleep(delay)
    raise OperationalError('Exceeded maximum retries. Unable to establish database connection.')


# Define function to create superuser
def create_superuser():
    from django.contrib.auth import get_user_model
    from rest_framework.authtoken.models import Token
    User = get_user_model()
    if not User.objects.filter(username='root@local.com').exists():
        User.objects.create_superuser('root@local.com', 'root@local.com', 'admin')
        print('Superuser created successfully.')
    else:
        print('Superuser already exists.')
    admin = User.objects.filter(username='root@local.com').first()
    if admin:
        # Service token for macaco server-to-server calls (provider keys,
        # social login). Copy into apps/macaco/.env as API_TOKEN.
        token, _ = Token.objects.get_or_create(user=admin)
        print(f'Service API_TOKEN={token.key}')

    # Seed one OAuthProvider row per login provider (inactive until keys are
    # added on the Settings page) so macaco + login UI can discover them.
    try:
        from identity_api.models import OAuthProvider
        from base.constants import AUTH_PROVIDER_CHOICES
        for provider, _label in AUTH_PROVIDER_CHOICES:
            if provider == 'local':
                continue
            OAuthProvider.objects.get_or_create(
                provider=provider,
                defaults={'status': 'activated'},
            )
        print('OAuth providers seeded.')
    except Exception as exc:
        print(f'OAuth provider seeding skipped: {exc}')


def discover_models():
    """Dynamically discover all models from installed apps (mirrors VHRS pattern)."""
    from django.apps import apps as django_apps
    discovered = []
    for app_config in django_apps.get_app_configs():
        # Skip Django contrib / third-party apps; only JevFlow project apps
        if app_config.name.startswith('django.') or '.' in app_config.name:
            continue
        for model in app_config.get_models():
            discovered.append(model)
    return discovered


def create_default_roles():
    from django.contrib.auth import get_user_model
    from identity_api.models import App, Role

    User = get_user_model()
    admin = User.objects.filter(username='root@local.com').first()
    if not admin:
        print('Admin user not found, skipping role creation.')
        return

    created_apps = {}
    for model in discover_models():
        entity_name = f"{model._meta.app_label}_{model._meta.model_name}"
        app, _ = App.objects.get_or_create(
            entity_name=entity_name,
            defaults={
                'title': model._meta.model_name,
                'pathUrl': f'/{model._meta.model_name}/',
                'status': 'activated',
            }
        )
        created_apps[entity_name] = app

    # Default role templates: Superadmin (RWD everywhere),
    # Manager (RW on operational models), Employee (R on own models)
    role_templates = {
        'Superadmin': {
            'apps': list(created_apps.keys()),
            'permission': 'RWD',
        },
        'Manager': {
            'apps': [e for e in created_apps.keys()
                     if any(k in e for k in ('integration', 'webhook', 'decision', 'engine', 'notification'))],
            'permission': 'RW',
        },
        'Employee': {
            'apps': [e for e in created_apps.keys()
                     if any(k in e for k in ('decision', 'notification', 'integration'))],
            'permission': 'R',
        },
    }

    for role_name, template in role_templates.items():
        for entity_name in template['apps']:
            Role.objects.get_or_create(
                user=admin,
                app=created_apps[entity_name],
                account=None,
                defaults={
                    'title': f'{role_name} {template["permission"]}',
                    'permission': template['permission'],
                    'status': 'activated',
                }
            )

    print(f'Default roles created for admin user ({len(role_templates)} role templates, '
          f'{len(created_apps)} app entities).')


# Call the functions
if __name__ == '__main__':
    wait_for_db()
    create_superuser()
    create_default_roles()
