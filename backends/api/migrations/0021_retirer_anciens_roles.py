from django.db import migrations, models


class Migration(migrations.Migration):
    """Séparée de 0020 : PostgreSQL refuse de modifier une table juste après y avoir écrit dans la même transaction."""

    dependencies = [
        ('api', '0020_roles_et_mouvements'),
    ]

    operations = [
        migrations.RemoveField(model_name='staffprofile', name='boutique_texte'),
        migrations.AlterField(
            model_name='staffprofile',
            name='role',
            field=models.CharField(choices=[('SUPER_ADMIN', 'Super admin'), ('SERVICE_COMMERCIAL', 'Service commercial'), ('CONTROLEUR', 'Contrôleur'), ('CAISSIERE', 'Caissière')], default='CAISSIERE', max_length=40),
        ),
        migrations.AlterField(
            model_name='staffprofile',
            name='statut',
            field=models.CharField(choices=[('Actif', 'Actif'), ('Inactif', 'Inactif')], default='Actif', max_length=20),
        ),
        migrations.AlterModelOptions(
            name='staffprofile',
            options={'ordering': ['id'], 'verbose_name': 'Profil Employé / Organigramme', 'verbose_name_plural': 'Profils Employés / Organigramme'},
        ),
    ]
