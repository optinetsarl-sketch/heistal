from django.db import migrations, models


class Migration(migrations.Migration):
    """Séparée de 0017 : PostgreSQL refuse de modifier une table juste après y avoir écrit dans la même transaction."""

    dependencies = [
        ('api', '0017_stock_par_boutique'),
    ]

    operations = [
        migrations.RemoveField(model_name='product', name='stock_tokoin'),
        migrations.RemoveField(model_name='product', name='stock_adidogome'),
        migrations.AlterField(
            model_name='sale',
            name='boutique',
            field=models.CharField(default='Tokoin Wuiti', help_text='Nom de la boutique de vente, sans le mot « Boutique »', max_length=150),
        ),
    ]
