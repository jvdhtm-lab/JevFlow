from rest_framework import serializers
from .models import EnginePreset, EngineCall


class EnginePresetSerializer(serializers.ModelSerializer):
    class Meta:
        model = EnginePreset
        fields = ('id', 'name', 'description', 'preset_type', 'model',
                  'config', 'status', 'created_date_time', 'updated_date_time')
        read_only_fields = ('id', 'created_date_time', 'updated_date_time')


class EngineCallSerializer(serializers.ModelSerializer):
    class Meta:
        model = EngineCall
        fields = ('id', 'name', 'description', 'preset', 'map', 'state',
                  'questions', 'answers', 'latency_ms', 'created_by',
                  'status', 'created_date_time', 'updated_date_time')
        read_only_fields = ('id', 'answers', 'latency_ms',
                            'created_date_time', 'updated_date_time')
