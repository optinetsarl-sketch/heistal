"""
Tableau de bord : visiteurs du site, commandes, et ventes de chaque boutique produit par produit.

Les semaines vont du lundi au dimanche. Lomé vit à l'heure UTC toute l'année : les journées
du serveur sont celles des boutiques.
"""
import re
from datetime import timedelta

from django.db import IntegrityError, transaction
from django.db.models import Count, F, Q, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.decorators import api_view, authentication_classes, permission_classes, throttle_classes
from rest_framework.response import Response

from .authentication import VisiteRateThrottle
from .models import Boutique, CommandeDirecte, Product, Sale, SaleItem, StockBoutique, Visite
from .permissions import PeutVoirStatistiques

JOURS_AFFICHES = 14
SEMAINES_AFFICHEES = 8
A_RETIRER = ('EN_ATTENTE', 'PRETE')
# Les robots qui lisent le site comme un navigateur ne sont pas des clients.
ROBOTS = re.compile(r'bot[/;]|spider|crawl|slurp|headless|lighthouse', re.IGNORECASE)
VISITEUR = re.compile(r'[A-Za-z0-9-]{8,64}')


@api_view(['POST'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
@throttle_classes([VisiteRateThrottle])
def compter_visite(request):
    """Une page du site public vient d'être ouverte : {"visiteur": "<identifiant tiré au hasard>"}."""
    visiteur = str(request.data.get('visiteur', ''))
    if not VISITEUR.fullmatch(visiteur):
        return Response({'detail': 'Visiteur invalide.'}, status=status.HTTP_400_BAD_REQUEST)
    agent = request.META.get('HTTP_USER_AGENT', '')
    if not agent or ROBOTS.search(agent):
        return Response(status=status.HTTP_204_NO_CONTENT)

    jour = timezone.localdate()
    try:
        with transaction.atomic():
            Visite.objects.create(jour=jour, visiteur=visiteur)
    except IntegrityError:
        Visite.objects.filter(jour=jour, visiteur=visiteur).update(pages_vues=F('pages_vues') + 1, derniere_visite=timezone.now())
    return Response(status=status.HTTP_204_NO_CONTENT)


def lundi_de(jour):
    return jour - timedelta(days=jour.weekday())


def visiteurs_entre(debut, fin):
    """Visiteurs différents sur la période : celui qui revient trois jours ne compte qu'une fois."""
    return Visite.objects.filter(jour__gte=debut, jour__lte=fin).values('visiteur').distinct().count()


def commandes_entre(debut, fin):
    return CommandeDirecte.objects.filter(date_commande__date__gte=debut, date_commande__date__lte=fin).count()


@api_view(['GET'])
@permission_classes([PeutVoirStatistiques])
def frequentation(request):
    aujourdhui = timezone.localdate()
    hier = aujourdhui - timedelta(days=1)
    lundi = lundi_de(aujourdhui)
    lundi_dernier = lundi - timedelta(weeks=1)

    premier_jour = aujourdhui - timedelta(days=JOURS_AFFICHES - 1)
    visites = (
        Visite.objects.filter(jour__gte=premier_jour).values('jour')
        .annotate(visiteurs=Count('visiteur', distinct=True), pages=Sum('pages_vues'))
    )
    visites = {ligne['jour']: ligne for ligne in visites}
    commandes = (
        CommandeDirecte.objects.filter(date_commande__date__gte=premier_jour)
        .annotate(jour=TruncDate('date_commande')).values('jour').annotate(nombre=Count('id'))
    )
    commandes = {ligne['jour']: ligne['nombre'] for ligne in commandes}

    jours = []
    for decalage in range(JOURS_AFFICHES - 1, -1, -1):
        jour = aujourdhui - timedelta(days=decalage)
        jours.append({
            'date': jour,
            'visiteurs': visites.get(jour, {}).get('visiteurs', 0),
            'pages_vues': visites.get(jour, {}).get('pages', 0) or 0,
            'commandes': commandes.get(jour, 0),
        })

    semaines = []
    for decalage in range(SEMAINES_AFFICHEES - 1, -1, -1):
        debut = lundi - timedelta(weeks=decalage)
        fin = min(debut + timedelta(days=6), aujourdhui)
        semaines.append({'debut': debut, 'fin': fin, 'visiteurs': visiteurs_entre(debut, fin), 'commandes': commandes_entre(debut, fin)})

    return Response({
        'aujourdhui': aujourdhui,
        'visiteurs': {
            'aujourdhui': jours[-1]['visiteurs'],
            'hier': jours[-2]['visiteurs'],
            'semaine': semaines[-1]['visiteurs'],
            'semaine_derniere': semaines[-2]['visiteurs'],
            'pages_vues_aujourdhui': jours[-1]['pages_vues'],
        },
        'commandes': {
            'aujourdhui': jours[-1]['commandes'],
            'hier': commandes_entre(hier, hier),
            'semaine': semaines[-1]['commandes'],
            'semaine_derniere': commandes_entre(lundi_dernier, lundi - timedelta(days=1)),
            'a_retirer': CommandeDirecte.objects.filter(statut__in=A_RETIRER).count(),
        },
        'jours': jours,
        'semaines': semaines,
    })


PERIODES = {
    'jour': lambda jour: jour,
    'semaine': lundi_de,
    'mois': lambda jour: jour.replace(day=1),
}


@api_view(['GET'])
@permission_classes([PeutVoirStatistiques])
def boutiques(request):
    """Pour chaque boutique : ses ventes de la période, produit par produit, et le stock qui reste."""
    periode = request.query_params.get('periode', 'semaine')
    if periode not in PERIODES:
        return Response({'detail': 'Période inconnue : jour, semaine ou mois.'}, status=status.HTTP_400_BAD_REQUEST)
    aujourdhui = timezone.localdate()
    debut = PERIODES[periode](aujourdhui)

    ventes = Sale.objects.filter(date_vente__date__gte=debut, boutique__isnull=False)
    totaux = {ligne['boutique']: ligne for ligne in ventes.values('boutique').annotate(montant=Sum('total_ttc'), tickets=Count('id'))}
    lignes = SaleItem.objects.filter(vente__in=ventes)
    # Un produit encore au catalogue est regroupé par produit ; un produit supprimé, par le nom gardé sur le ticket.
    par_produit = lignes.filter(produit__isnull=False).values('vente__boutique', 'produit').annotate(quantite=Sum('quantite'), montant=Sum('total_ligne'))
    sans_produit = lignes.filter(produit__isnull=True).values('vente__boutique', 'nom_produit').annotate(quantite=Sum('quantite'), montant=Sum('total_ligne'))
    stocks = StockBoutique.objects.values_list('boutique_id', 'produit_id', 'quantite')
    commandes = CommandeDirecte.objects.filter(boutique__isnull=False)
    commandes_periode = dict(commandes.filter(date_commande__date__gte=debut).values('boutique').annotate(n=Count('id')).values_list('boutique', 'n'))
    commandes_a_retirer = dict(commandes.filter(statut__in=A_RETIRER).values('boutique').annotate(n=Count('id')).values_list('boutique', 'n'))
    catalogue = {p.id: p for p in Product.objects.all()}

    retenues = Boutique.objects.filter(Q(statut='Active', is_siege=False) | Q(pk__in=list(totaux))).order_by('nom')
    resultat = []
    for boutique in retenues:
        stock = {produit: quantite for b, produit, quantite in stocks if b == boutique.id}
        produits = {}
        for ligne in par_produit:
            if ligne['vente__boutique'] == boutique.id:
                produit = catalogue.get(ligne['produit'])
                produits[('p', ligne['produit'])] = {
                    'produit': ligne['produit'], 'nom': produit.nom, 'unite': produit.unite,
                    'quantite': float(ligne['quantite'] or 0), 'montant': ligne['montant'] or 0, 'stock': stock.get(ligne['produit']),
                }
        for ligne in sans_produit:
            if ligne['vente__boutique'] == boutique.id:
                produits[('n', ligne['nom_produit'])] = {
                    'produit': None, 'nom': ligne['nom_produit'], 'unite': '',
                    'quantite': float(ligne['quantite'] or 0), 'montant': ligne['montant'] or 0, 'stock': None,
                }
        # Les produits en stock qui ne se sont pas vendus comptent aussi : ce sont ceux à surveiller.
        for produit_id, quantite in stock.items():
            produit = catalogue.get(produit_id)
            if ('p', produit_id) not in produits and produit is not None and quantite > 0:
                produits[('p', produit_id)] = {
                    'produit': produit_id, 'nom': produit.nom, 'unite': produit.unite, 'quantite': 0, 'montant': 0, 'stock': quantite,
                }

        total = totaux.get(boutique.id, {})
        resultat.append({
            'id': boutique.id,
            'nom': boutique.nom,
            'statut': boutique.statut,
            'ventes': total.get('montant') or 0,
            'tickets': total.get('tickets', 0),
            'articles': sum(p['quantite'] for p in produits.values()),
            'commandes': commandes_periode.get(boutique.id, 0),
            'commandes_a_retirer': commandes_a_retirer.get(boutique.id, 0),
            'produits': sorted(produits.values(), key=lambda p: (-p['montant'], -p['quantite'], p['nom'].lower())),
        })

    return Response({'periode': periode, 'debut': debut, 'fin': aujourdhui, 'boutiques': resultat})
