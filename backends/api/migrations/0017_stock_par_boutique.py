from django.db import migrations, models
import django.db.models.deletion

# Chaque ancienne colonne de stock et la boutique à laquelle elle correspond.
BOUTIQUES_HISTORIQUES = (
    ('stock_tokoin', 'BQT-TOK-01', 'Boutique Tokoin Wuiti', 'Tokoin'),
    ('stock_adidogome', 'BQT-ADI-02', 'Boutique Adidogomé', 'Adidogom'),
)


def boutique_historique(Boutique, code, mot):
    return Boutique.objects.filter(code=code).first() or Boutique.objects.filter(nom__icontains=mot).first()


def reprendre_stocks(apps, schema_editor):
    Product = apps.get_model('api', 'Product')
    Boutique = apps.get_model('api', 'Boutique')
    StockBoutique = apps.get_model('api', 'StockBoutique')
    if not Product.objects.exists():
        return
    for champ, code, nom, mot in BOUTIQUES_HISTORIQUES:
        boutique = boutique_historique(Boutique, code, mot) or Boutique.objects.create(nom=nom, code=code, telephone='', localisation=nom)
        StockBoutique.objects.bulk_create([
            StockBoutique(produit=produit, boutique=boutique, quantite=max(0, getattr(produit, champ)))
            for produit in Product.objects.all()
        ])


def restaurer_colonnes(apps, schema_editor):
    """Retour arrière : seules Tokoin et Adidogomé ont une colonne, les autres boutiques ne sont pas reprises."""
    Product = apps.get_model('api', 'Product')
    Boutique = apps.get_model('api', 'Boutique')
    StockBoutique = apps.get_model('api', 'StockBoutique')
    for champ, code, _nom, mot in BOUTIQUES_HISTORIQUES:
        boutique = boutique_historique(Boutique, code, mot)
        for stock in StockBoutique.objects.filter(boutique=boutique):
            Product.objects.filter(pk=stock.produit_id).update(**{champ: stock.quantite})


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0016_reprendre_images_produits'),
    ]

    operations = [
        migrations.CreateModel(
            name='StockBoutique',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('quantite', models.IntegerField(default=0)),
                ('boutique', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='stocks', to='api.boutique')),
                ('produit', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='stocks', to='api.product')),
            ],
            options={
                'verbose_name': 'Stock en boutique',
                'verbose_name_plural': 'Stocks en boutique',
                'ordering': ['boutique__nom'],
                'constraints': [models.UniqueConstraint(fields=('produit', 'boutique'), name='un_stock_par_produit_et_boutique')],
            },
        ),
        migrations.RunPython(reprendre_stocks, restaurer_colonnes),
    ]
