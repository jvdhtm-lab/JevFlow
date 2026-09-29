from rest_framework import serializers
from identity_api.models import (
    CustomUser as User, App, Role, Login, Account, SocialAccount,
    OAuthProvider,
)
import logging

logger = logging.getLogger(__name__)


def custom_authenticate(email, password):
    try:
        user = User.objects.get(email=email)
        logger.debug("identity user: %s", user)
        logger.debug("identity user is_active: %s", user.is_active)
        logger.debug("identity user check_password: %s", user.check_password(password))
        if user.check_password(password) and user.is_active:
            return user
    except User.DoesNotExist:
        return None
    return None


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password', 'first_name', 'last_name',
                  'auth_provider', 'avatar_url',
                  'is_active', 'is_staff', 'status')
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        # Tenant account is never client-supplied — derive from the
        # authenticated user creating this record.
        request = self.context.get('request')
        account = getattr(request.user, 'account', None) if request else None
        user = User(account=account, **validated_data)
        if password:
            user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        validated_data.pop('account', None)  # never allow account reassignment
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(write_only=True)
    password = serializers.CharField(write_only=True)
    user = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Login
        fields = ('id', 'email', 'password', 'timestamp', 'provider')
        read_only_fields = ('id', 'timestamp')

    def validate(self, data):
        email = data.get('email')
        password = data.get('password')
        logger.debug("identity email: %s", email)
        if email and password:
            user = custom_authenticate(email=email, password=password)
            logger.debug("User found: %s", user)
            if user:
                data['user'] = user
            else:
                raise serializers.ValidationError("Invalid email or password")
        else:
            raise serializers.ValidationError("Must include 'email' and 'password'")

        return data


class AppSerializer(serializers.ModelSerializer):
    class Meta:
        model = App
        fields = ('id', 'title', 'pathUrl', 'entity_name', 'is_global', 'status')


class RoleSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    app = serializers.PrimaryKeyRelatedField(queryset=App.objects.all())

    class Meta:
        model = Role
        fields = ('id', 'title', 'user', 'permission', 'app')
        read_only_fields = ('id',)

    def validate(self, data):
        user = data.get('user')
        app = data.get('app')
        request = self.context.get('request')
        account = getattr(request.user, 'account', None) if request else None

        if user and app:
            existing_roles = Role.objects.filter(user=user, app=app, account=account)
            if self.instance:
                existing_roles = existing_roles.exclude(pk=self.instance.pk)
            if existing_roles.exists():
                raise serializers.ValidationError("Role for this user and app already exists.")

        data['account'] = account
        return data


class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = ('id', 'name', 'slug', 'description', 'is_active', 'status')


class LoginRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = Login
        fields = ('id', 'user', 'timestamp', 'provider', 'ip', 'status')
        read_only_fields = ('id', 'timestamp')


class SocialAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = SocialAccount
        fields = ('id', 'user', 'provider', 'provider_uid', 'extra_data',
                  'access_token', 'refresh_token', 'expires_at', 'status')
        read_only_fields = ('id',)


class OAuthProviderSerializer(serializers.ModelSerializer):
    configured = serializers.ReadOnlyField()

    class Meta:
        model = OAuthProvider
        fields = ('id', 'provider', 'client_id', 'client_secret', 'is_active',
                  'configured', 'config', 'status')
        read_only_fields = ('id', 'configured')
        extra_kwargs = {'client_secret': {'write_only': True}}
