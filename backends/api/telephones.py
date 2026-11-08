"""
Numéros de téléphone des clients. Le même numéro s'écrit de bien des façons
(« +228 90 12 34 56 », « 90123456 », « 00228 90-12-34-56 ») : on les compare
toujours par leurs seuls chiffres, sans l'indicatif du Togo.
"""
import re


def normaliser_telephone(valeur):
    chiffres = re.sub(r'\D', '', str(valeur or ''))
    if chiffres.startswith('00'):
        chiffres = chiffres[2:]
    if chiffres.startswith('228') and len(chiffres) == 11:
        chiffres = chiffres[3:]
    return chiffres


def telephone_valide(valeur):
    return 8 <= len(normaliser_telephone(valeur)) <= 15


def formater_telephone(valeur):
    """« 90123456 » devient « +228 90 12 34 56 » ; un numéro étranger garde son indicatif."""
    chiffres = normaliser_telephone(valeur)
    if len(chiffres) == 8:
        return '+228 ' + ' '.join(chiffres[i:i + 2] for i in range(0, 8, 2))
    return f'+{chiffres}' if chiffres else ''


def masquer_telephone(valeur):
    """Assez pour que le client reconnaisse son numéro, pas assez pour l'appeler."""
    chiffres = normaliser_telephone(valeur)
    if len(chiffres) < 4:
        return ''
    return f'•• •• {chiffres[-4:-2]} {chiffres[-2:]}'
