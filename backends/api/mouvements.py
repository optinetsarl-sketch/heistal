"""Écriture du journal des mouvements. Il n'y a pas d'autre chemin : l'API ne permet que de le lire."""
from .models import Mouvement


def nom_employe(user):
    profil = getattr(user, 'staff_profile', None)
    return profil.nom_complet if profil else user.get_username()


def noter(type_mouvement, user, boutique=None, produit=None, produit_nom='', **champs):
    compte = user if getattr(user, 'pk', None) else None
    return Mouvement.objects.create(
        type=type_mouvement,
        utilisateur=compte,
        utilisateur_nom=nom_employe(compte) if compte else '',
        boutique=boutique,
        boutique_nom=boutique.nom if boutique else '',
        produit=produit,
        produit_nom=produit_nom or (produit.nom if produit else ''),
        **champs,
    )
