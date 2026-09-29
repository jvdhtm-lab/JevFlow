from rest_framework.viewsets import ModelViewSet, ViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from identity_api.permissions import EntityPermission
from identity_api.models import Account


def resolve_session_account_id(request, user=None):
    """Resolve the active tenant account id for a request.

    Priority:
      1. request.session['account_id'] (explicit tenant switch)
      2. user.account_id
      3. For superusers/admins, the earliest Account (auto-defaulted and persisted)
    """
    session = getattr(request, 'session', None)
    account_id = session.get('account_id') if session else None
    if account_id is not None:
        return account_id

    if user is None:
        user = getattr(request, 'user', None)
    if user is None or not getattr(user, 'is_authenticated', False):
        return None

    account_id = getattr(user, 'account_id', None)
    if account_id is not None:
        if session is not None:
            session['account_id'] = account_id
            session.modified = True
        return account_id

    if user.is_superuser or getattr(user, 'is_admin', False):
        account = Account.objects.order_by('id').first()
        if account:
            account_id = account.id
            if session is not None:
                session['account_id'] = account_id
                session.modified = True
            return account_id

    return None


class BaseViewSetNoPermission(ModelViewSet):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.schema.view = self


class BaseViewSet(ModelViewSet):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, EntityPermission]
    # All three backends are introspected by drf-yasg, so every filter,
    # ?search= and ?ordering= appears as an annotated Swagger parameter.
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    ordering_fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.schema.view = self

    def _tenant_account_id(self):
        request = getattr(self, 'request', None)
        if request is None:
            return None
        return resolve_session_account_id(request)

    def get_queryset(self):
        qs = super().get_queryset()
        account_id = self._tenant_account_id()
        if account_id:
            field_names = {f.name for f in qs.model._meta.get_fields()}
            if 'account' in field_names:
                qs = qs.filter(account_id=account_id)
        return qs

    def perform_create(self, serializer):
        # Tenant account is never client-supplied — always derived from the
        # authenticated user/session. Only stamp it when the model actually has
        # an `account` field to avoid crashes on standalone models.
        account_id = self._tenant_account_id()
        model = serializer.Meta.model
        has_account = 'account' in {f.name for f in model._meta.get_fields()}
        if account_id and has_account:
            serializer.save(account_id=account_id)
        else:
            serializer.save()


class BaseViewSetNoSerializer(ViewSet):
    permission_classes = [IsAuthenticated, EntityPermission]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.schema.view = self


class CreateListMixin:
    def get_serializer(self, *args, **kwargs):
        if isinstance(kwargs.get('data', {}), list):
            kwargs['many'] = True

        return super().get_serializer(*args, **kwargs)
