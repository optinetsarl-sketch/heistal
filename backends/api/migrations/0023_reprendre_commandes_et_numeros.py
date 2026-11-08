"""
Reprise des données existantes :
- chaque numéro de téléphone (clients et commandes) reçoit sa forme « chiffres seuls » ;
- chaque commande est reliée à sa boutique de retrait, retrouvée d'après le nom saisi à l'époque.
"""
import re
import unicodedata

from django.db import migrations


def chiffres(valeur):
    # Copie figée de api.telephones.normaliser_telephone : une migration ne doit pas changer après coup.
    resultat = re.sub(r'\D', '', str(valeur or ''))
    if resultat.startswith('00'):
        resultat = resultat[2:]
    if resultat.startswith('228') and len(resultat) == 11:
        resultat = resultat[3:]
    return resultat


def simplifier(texte):
    sans_accents = unicodedata.normalize('NFD', str(texte or '')).encode('ascii', 'ignore').decode()
    return ' '.join(re.sub(r'[^a-z0-9]+', ' ', sans_accents.lower()).split())


def reprendre(apps, schema_editor):
    Client = apps.get_model('api', 'Client')
    CommandeDirecte = apps.get_model('api', 'CommandeDirecte')
    Boutique = apps.get_model('api', 'Boutique')

    for client in Client.objects.all():
        client.telephone_normalise = chiffres(client.telephone)
        client.save(update_fields=['telephone_normalise'])

    # Le nom le plus long d'abord : « Boutique Tokoin Wuiti » passe avant un éventuel « Boutique Tokoin ».
    boutiques = sorted(((simplifier(b.nom), b) for b in Boutique.objects.all()), key=lambda paire: -len(paire[0]))
    for commande in CommandeDirecte.objects.all():
        commande.telephone_normalise = chiffres(commande.client_telephone)
        texte = simplifier(commande.boutique_retrait)
        commande.boutique = next((b for nom, b in boutiques if nom and texte.startswith(nom)), None)
        commande.save(update_fields=['telephone_normalise', 'boutique'])


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0022_commandes_par_code'),
    ]

    operations = [
        migrations.RunPython(reprendre, migrations.RunPython.noop),
    ]
