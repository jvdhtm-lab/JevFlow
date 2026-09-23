from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('decisions', '0003_decisionmap_spec_yaml'),
    ]

    operations = [
        migrations.AddField(
            model_name='decisionrun',
            name='action_results',
            field=models.JSONField(blank=True, null=True),
        ),
    ]
