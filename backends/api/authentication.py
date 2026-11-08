"""
Authentification de l'API Heistal par jetons aléatoires stockés en base.

Ces jetons ne dépendent pas de SECRET_KEY et se révoquent un par un : déconnexion,
changement de mot de passe ou compte désactivé.
"""
import secrets

from django.contrib.auth.models import AnonymousUser
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.utils import timezone, translation
from rest_framework import authentication, exceptions
from rest_framework.throttling import AnonRateThrottle

from .models import ApiToken


def erreurs_mot_de_passe(mot_de_passe, user=None):
    """Retourne les raisons (en français) de refuser ce mot de passe, ou une liste vide."""
    with translation.override('fr'):
        try:
            validate_password(mot_de_passe, user)
        except ValidationError as exc:
            return list(exc.messages)
    return []


def mot_de_passe_temporaire(user=None):
    """Mot de passe à dicter à un employé : sans 0, O, 1 ni I, pour éviter les confusions."""
    alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
    while True:
        candidat = 'HST-' + '-'.join(''.join(secrets.choice(alphabet) for _ in range(4)) for _ in range(2))
        if not erreurs_mot_de_passe(candidat, user):
            return candidat


class ConnexionRateThrottle(AnonRateThrottle):
    """Limite les essais de mot de passe par adresse IP."""
    scope = 'connexion'


class ApiTokenAuthentication(authentication.BaseAuthentication):
    """Lit l'en-tête `Authorization: Bearer <jeton>` envoyé par le frontend."""
    keyword = 'Bearer'

    def authenticate(self, request):
        header = authentication.get_authorization_header(request).split()
        if not header or header[0].lower() != self.keyword.lower().encode():
            return None
        if len(header) != 2:
            raise exceptions.AuthenticationFailed("En-tête d'authentification invalide.")
        try:
            cle = header[1].decode()
        except UnicodeError:
            raise exceptions.AuthenticationFailed('Jeton invalide.')

        jeton = (
            ApiToken.objects.select_related('user', 'client')
            .filter(empreinte=ApiToken.empreinte_de(cle))
            .first()
        )
        if jeton is None or jeton.expires_at <= timezone.now():
            raise exceptions.AuthenticationFailed('Session expirée. Veuillez vous reconnecter.')

        if jeton.user is not None and jeton.user.is_active:
            return jeton.user, jeton
        if jeton.client is not None and jeton.client.est_actif:
            return AnonymousUser(), jeton
        raise exceptions.AuthenticationFailed('Ce compte a été désactivé.')

    def authenticate_header(self, request):
        # Sans cette valeur, DRF répondrait 403 au lieu de 401 aux visiteurs non connectés.
        return self.keyword


class CommandeRateThrottle(AnonRateThrottle):
    """Limite les commandes envoyées depuis une même adresse IP."""
    scope = 'commande'


class SuiviRateThrottle(AnonRateThrottle):
    """Limite les essais de codes de commande depuis une même adresse IP."""
    scope = 'suivi'


class VisiteRateThrottle(AnonRateThrottle):
    """Limite les pages vues comptées depuis une même adresse IP."""
    scope = 'visite'
