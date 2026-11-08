from django.contrib.auth.hashers import identify_hasher, make_password
from django.db import migrations

ROLES_DIRECTION = ('PDG', 'DG')

# Ces valeurs figuraient dans le code source : elles ne protègent plus aucun compte client.
MOTS_DE_PASSE_PAR_DEFAUT = ('1234', '123456', 'admin', 'heistal2026')


def _est_empreinte(valeur):
    try:
        identify_hasher(valeur)
    except ValueError:
        return False
    return True


def securiser_mots_de_passe(apps, schema_editor):
    """
    Retire tous les mots de passe en clair de la base et aligne les droits Django sur les profils.
    Irréversible par nature : les valeurs en clair ne sont conservées nulle part.
    """
    StaffProfile = apps.get_model('api', 'StaffProfile')
    Client = apps.get_model('api', 'Client')

    for profil in StaffProfile.objects.select_related('user').exclude(user__isnull=True):
        compte = profil.user
        # Le compte Django reste la référence, sauf s'il n'a aucun mot de passe exploitable.
        if profil.mot_de_passe and (not compte.password or compte.password.startswith('!')):
            compte.password = make_password(profil.mot_de_passe)
        est_direction = profil.role in ROLES_DIRECTION
        compte.is_staff = est_direction
        compte.is_superuser = est_direction
        compte.is_active = profil.statut != 'Inactif'
        compte.save(update_fields=['password', 'is_staff', 'is_superuser', 'is_active'])

    StaffProfile.objects.update(mot_de_passe='')

    for client in Client.objects.exclude(mot_de_passe=''):
        if client.mot_de_passe in MOTS_DE_PASSE_PAR_DEFAUT:
            client.mot_de_passe = ''
        elif not _est_empreinte(client.mot_de_passe):
            client.mot_de_passe = make_password(client.mot_de_passe)
        else:
            continue
        client.save(update_fields=['mot_de_passe'])


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0013_securite_api'),
    ]

    operations = [
        migrations.RunPython(securiser_mots_de_passe, migrations.RunPython.noop),
    ]
