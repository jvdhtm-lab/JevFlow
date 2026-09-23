from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('decisions', '0002_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='decisionmap',
            name='spec_yaml',
            field=models.TextField(blank=True, default=''),
        ),
    ]
