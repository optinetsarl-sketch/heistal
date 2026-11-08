from django.db import migrations, models
from django.db.models import Q
import django.db.models.deletion


def rattacher_ventes(apps, schema_editor):
    """Une vente portait le nom de sa boutique, souvent sans le mot « Boutique ». Sans correspondance, seul le nom reste."""
    Sale = apps.get_model('api', 'Sale')
    Boutique = apps.get_model('api', 'Boutique')
    for nom in Sale.objects.values_list('boutique_nom', flat=True).distinct():
        boutique = Boutique.objects.filter(Q(nom__iexact=nom) | Q(nom__iexact=f'Boutique {nom}')).first()
        if boutique:
            Sale.objects.filter(boutique_nom=nom).update(boutique=boutique)


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0018_retirer_colonnes_stock'),
    ]

    operations = [
        migrations.RenameField(model_name='sale', old_name='boutique', new_name='boutique_nom'),
        migrations.AlterField(
            model_name='sale',
            name='boutique_nom',
            field=models.CharField(blank=True, default='', help_text="Nom de la boutique au moment de la vente, pour l'historique", max_length=150),
        ),
        migrations.AddField(
            model_name='sale',
            name='boutique',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='ventes', to='api.boutique'),
        ),
        migrations.RunPython(rattacher_ventes, migrations.RunPython.noop),
    ]
