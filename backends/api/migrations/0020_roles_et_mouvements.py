from django.conf import settings
from django.db import migrations, models
from django.db.models import Q
import django.db.models.deletion
import django.utils.timezone

NOUVEAUX_ROLES = {
    'PDG': 'SUPER_ADMIN',
    'DG': 'SUPER_ADMIN',
    'SERVICE_COMMERCIAL': 'SERVICE_COMMERCIAL',
    'CAISSE': 'CAISSIERE',
    'CAISSIERE': 'CAISSIERE',
}
ANCIENS_ROLES = {'SUPER_ADMIN': 'PDG', 'SERVICE_COMMERCIAL': 'SERVICE_COMMERCIAL', 'CONTROLEUR': 'DAF', 'CAISSIERE': 'CAISSE'}


def reprendre_comptes(apps, schema_editor):
    """Tout rôle sans équivalent devient contrôleur : c'est le rôle qui ne peut rien modifier."""
    StaffProfile = apps.get_model('api', 'StaffProfile')
    Boutique = apps.get_model('api', 'Boutique')
    for profil in StaffProfile.objects.all():
        profil.role = NOUVEAUX_ROLES.get(profil.role, 'CONTROLEUR')
        if profil.statut != 'Inactif':
            profil.statut = 'Actif'
        if profil.role == 'CAISSIERE':
            nom = profil.boutique_texte.strip()
            profil.boutique = Boutique.objects.filter(Q(nom__iexact=nom) | Q(nom__iexact=f'Boutique {nom}')).first()
        profil.save(update_fields=['role', 'statut', 'boutique'])


def reprendre_ventes(apps, schema_editor):
    """Les ventes déjà enregistrées entrent au journal, à leur date d'origine."""
    Mouvement = apps.get_model('api', 'Mouvement')
    SaleItem = apps.get_model('api', 'SaleItem')
    Mouvement.objects.bulk_create([
        Mouvement(
            type='VENTE', date=ligne.vente.date_vente, utilisateur_nom=ligne.vente.caissier,
            boutique=ligne.vente.boutique, boutique_nom=ligne.vente.boutique_nom,
            produit=ligne.produit, produit_nom=ligne.nom_produit, quantite=-int(ligne.quantite),
            montant=ligne.total_ligne, reference=ligne.vente.reference,
        )
        for ligne in SaleItem.objects.select_related('vente')
    ])


def restaurer_comptes(apps, schema_editor):
    StaffProfile = apps.get_model('api', 'StaffProfile')
    for profil in StaffProfile.objects.select_related('boutique'):
        profil.role = ANCIENS_ROLES.get(profil.role, profil.role)
        profil.boutique_texte = profil.boutique.nom if profil.boutique else 'Siège'
        profil.save(update_fields=['role', 'boutique_texte'])


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('api', '0019_ventes_par_boutique'),
    ]

    operations = [
        migrations.RenameField(model_name='staffprofile', old_name='boutique', new_name='boutique_texte'),
        migrations.AddField(
            model_name='staffprofile',
            name='boutique',
            field=models.ForeignKey(blank=True, help_text="Boutique d'une caissière", null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='caissieres', to='api.boutique'),
        ),
        migrations.AddField(
            model_name='staffprofile',
            name='mot_de_passe_provisoire',
            field=models.BooleanField(default=False, help_text='Le mot de passe donné par le super admin doit être changé à la prochaine connexion'),
        ),
        migrations.CreateModel(
            name='Mouvement',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('type', models.CharField(choices=[('VENTE', 'Vente'), ('ENTREE', 'Entrée de stock'), ('SORTIE', 'Sortie de stock'), ('STOCK_DEPART', 'Stock de départ'), ('PRODUIT', 'Produit'), ('COMPTE', 'Compte'), ('CONNEXION', 'Connexion')], max_length=20)),
                ('date', models.DateTimeField(db_index=True, default=django.utils.timezone.now)),
                ('utilisateur_nom', models.CharField(blank=True, default='', max_length=150)),
                ('boutique_nom', models.CharField(blank=True, default='', max_length=150)),
                ('produit_nom', models.CharField(blank=True, default='', max_length=200)),
                ('quantite', models.IntegerField(blank=True, help_text='Positive pour une entrée, négative pour une sortie', null=True)),
                ('stock_apres', models.IntegerField(blank=True, null=True)),
                ('montant', models.PositiveIntegerField(blank=True, null=True)),
                ('reference', models.CharField(blank=True, default='', max_length=60)),
                ('description', models.CharField(blank=True, default='', max_length=255)),
                ('boutique', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='mouvements', to='api.boutique')),
                ('produit', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='mouvements', to='api.product')),
                ('utilisateur', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='mouvements', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Mouvement',
                'verbose_name_plural': 'Mouvements',
                'ordering': ['-date', '-id'],
            },
        ),
        migrations.RunPython(reprendre_comptes, restaurer_comptes),
        migrations.RunPython(reprendre_ventes, migrations.RunPython.noop),
    ]
