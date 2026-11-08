from django.db import migrations

IMAGE_PAR_DEFAUT = '/heistal_fish.jpg'


def reprendre_images(apps, schema_editor):
    """
    Retire l'image de poisson imposée par défaut à tous les produits : sans photo, c'est l'image
    de la famille qui s'affiche. Une image choisie à la main devient la première photo du produit.
    """
    Product = apps.get_model('api', 'Product')
    ProductImage = apps.get_model('api', 'ProductImage')

    Product.objects.filter(image=IMAGE_PAR_DEFAUT).update(image='')
    for produit in Product.objects.exclude(image=''):
        ProductImage.objects.create(produit=produit, image=produit.image)


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0015_photos_produits'),
    ]

    operations = [
        migrations.RunPython(reprendre_images, migrations.RunPython.noop),
    ]
