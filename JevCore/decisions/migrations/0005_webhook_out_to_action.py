"""Merge webhook_out into action (node types)."""
from django.db import migrations


def forwards(apps, schema_editor):
    DecisionNode = apps.get_model('decisions', 'DecisionNode')
    DecisionMap = apps.get_model('decisions', 'DecisionMap')
    affected = set(
        DecisionNode.objects.filter(node_type='webhook_out').values_list('map_id', flat=True)
    )
    DecisionNode.objects.filter(node_type='webhook_out').update(node_type='action')
    for map_id in affected:
        try:
            m = DecisionMap.objects.get(pk=map_id)
        except DecisionMap.DoesNotExist:
            continue
        if m.spec_yaml:
            m.spec_yaml = m.spec_yaml.replace('type: webhook_out', 'type: action')
            m.save(update_fields=['spec_yaml'])


def backwards(apps, schema_editor):
    # Converted rows are indistinguishable; leave them as action.
    pass


class Migration(migrations.Migration):
    dependencies = [('decisions', '0004_decisionrun_action_results')]
    operations = [migrations.RunPython(forwards, backwards)]
