"""
Le formulaire « Nouveau produit » de l'admin n'envoyait pas le champ is_active : le serveur le
comprenait comme « masqué ». Les produits concernés n'apparaissaient ni sur le site ni à la
commande. Ils réapparaissent tous : l'admin du site ne permet pas de masquer un produit.
"""
from django.db import migrations


def reafficher(apps, schema_editor):
    apps.get_model('api', 'Product').objects.filter(is_active=False).update(is_active=True)


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0024_visites_du_site'),
    ]

    operations = [
        migrations.RunPython(reafficher, migrations.RunPython.noop),
    ]
