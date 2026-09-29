"""
Django settings for JevCore project.

JevFlow backend — mirrors VHRS VectorHRS settings with Postgres + Redis,
social auth (Google/Outlook/Slack) and CORS enabled.
"""

import os
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/3.2/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get(
    'DJANGO_SECRET_KEY',
    'django-insecure-jevflow-dev-secret-key-change-in-production',
)

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get('DJANGO_DEBUG', 'True').lower() in ('1', 'true', 'yes')

ALLOWED_HOSTS = ['*']  # Adjust to your production domain(s)

AUTH_USER_MODEL = 'identity_api.CustomUser'

# SWAGGER (OpenAPI) Settings — same as VHRS
SWAGGER_SETTINGS = {
    "DEFAULT_FIELD_INSPECTORS": [
        # Pass-through inspectors registered FIRST so their process_result runs
        # last and can annotate the final schema (mirrors VHRS pattern).
        "api_doc.inspectors.sortableFieldInspector",
        "drf_yasg.inspectors.CamelCaseJSONFilter",
        "drf_yasg.inspectors.ReferencingSerializerInspector",
        "api_doc.inspectors.relatedResourceFieldInspector",
        "api_doc.inspectors.sortableFieldInspector",
        "drf_yasg.inspectors.ChoiceFieldInspector",
        "drf_yasg.inspectors.FileFieldInspector",
        "drf_yasg.inspectors.DictFieldInspector",
        "drf_yasg.inspectors.JSONFieldInspector",
        "drf_yasg.inspectors.HiddenFieldInspector",
        "drf_yasg.inspectors.RecursiveFieldInspector",
        "drf_yasg.inspectors.SerializerMethodFieldInspector",
        "drf_yasg.inspectors.SimpleFieldInspector",
        "drf_yasg.inspectors.StringDefaultFieldInspector",
    ]
}

# Application definition
INSTALLED_APPS = [
    'drf_yasg',
    'rest_framework',
    'rest_framework.authtoken',
    'django_filters',
    'social_django',
    'corsheaders',
    'utils.apps.UtilsConfig',
    'base.apps.BaseConfig',
    'identity_api.apps.IdentityApiConfig',
    'integrations.apps.IntegrationsConfig',
    'decisions.apps.DecisionsConfig',
    'jev_engine.apps.JevEngineConfig',
    'audit.apps.AuditConfig',
    'notifications.apps.NotificationsConfig',
    'api_doc.apps.ApiDocConfig',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django_seed',
]

# Faker Settings
FAKER_LOCALE = None     # settings.LANGUAGE_CODE is loaded
FAKER_PROVIDERS = None  # faker.DEFAULT_PROVIDERS is loaded (all)

# Middleware Settings
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'social_django.middleware.SocialAuthExceptionMiddleware',
]

# CORS — open for local dev (tighten in production)
CORS_ALLOW_ALL_ORIGINS = True

# Root URL Configuration
ROOT_URLCONF = 'JevCore.urls'

# Template Configuration
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'social_django.context_processors.backends',
                'social_django.context_processors.login_redirect',
            ],
        },
    },
]

# Authentication backends (local + social)
AUTHENTICATION_BACKENDS = [
    'social_core.backends.google.GoogleOAuth2',
    'social_core.backends.azuread.AzureADOAuth2',
    'social_core.backends.slack.SlackOAuth2',
    'django.contrib.auth.backends.ModelBackend',
]

# Social auth credentials (read from env, dummy defaults for local dev)
SOCIAL_AUTH_GOOGLE_OAUTH2_KEY = os.environ.get('GOOGLE_OAUTH2_KEY', 'dummy-google-client-id')
SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET = os.environ.get('GOOGLE_OAUTH2_SECRET', 'dummy-google-client-secret')
SOCIAL_AUTH_AZUREAD_OAUTH2_KEY = os.environ.get('AZUREAD_OAUTH2_KEY', 'dummy-azure-client-id')
SOCIAL_AUTH_AZUREAD_OAUTH2_SECRET = os.environ.get('AZUREAD_OAUTH2_SECRET', 'dummy-azure-client-secret')
SOCIAL_AUTH_SLACK_KEY = os.environ.get('SLACK_OAUTH2_KEY', 'dummy-slack-client-id')
SOCIAL_AUTH_SLACK_SECRET = os.environ.get('SLACK_OAUTH2_SECRET', 'dummy-slack-client-secret')

# Rest Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_FILTER_BACKENDS': ['django_filters.rest_framework.DjangoFilterBackend'],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PAGINATION_CLASS': 'utils.pagination.MycustomPagination',
    'PAGE_SIZE': 20
}

# WSGI Application
WSGI_APPLICATION = 'JevCore.wsgi.application'

# Static and Media Files Settings
STATIC_ROOT = os.path.join(BASE_DIR, 'static')
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
MEDIA_URL = '/media/'

# Redis cache
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://{}:6379/1'.format(os.environ.get('REDIS_HOST', 'localhost')),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
    }
}

# Database Configuration (Postgres)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'jevflow',
        'USER': 'user',
        'PASSWORD': 'admin',
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': '5432',
    }
}

# Password Validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_L10N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'file': {
            'level': 'DEBUG',
            'class': 'logging.FileHandler',
            'filename': os.path.join(BASE_DIR, 'django.log'),
            'formatter': 'verbose',
        },
    },
    'formatters': {
        'verbose': {
            'format': '%(asctime)s [%(levelname)s] %(name)s: %(message)s'
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
            'propagate': True,
        },
        'identity_api': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
            'propagate': True,
        },
    },
}
