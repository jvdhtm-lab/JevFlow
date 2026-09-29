# Generated manually

from django.db import migrations, models
import base.constants


class Migration(migrations.Migration):

    dependencies = [
        ('decisions', '0010_alter_decisionnode_node_type'),
    ]

    operations = [
        migrations.RenameField(
            model_name='decisionmap',
            old_name='trigger_source',
            new_name='category',
        ),
    ]
