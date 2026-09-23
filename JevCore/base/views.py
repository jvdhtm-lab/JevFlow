from rest_framework.viewsets import ModelViewSet, ViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from identity_api.permissions import EntityPermission


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

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.schema.view = self


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
