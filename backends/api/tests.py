import importlib
import json
import os
import shutil
import tempfile
from datetime import date, datetime, timedelta, timezone as dt_timezone
from unittest import mock

from django.apps import apps as django_apps
from django.contrib.auth.models import User
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase, override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from .telephones import formater_telephone, masquer_telephone, normaliser_telephone

from .models import ApiToken, Boutique, Client, CommandeDirecte, CommandeItem, Famille, SaleItem, Visite, Mouvement, Product, ProductImage, Sale, StaffProfile, StockBoutique, TypeStock

MOT_DE_PASSE_FORT = 'Surgele-Lome-2026!'
AUTRE_MOT_DE_PASSE_FORT = 'Capitaine-Tokoin-77!'
MOTS_DE_PASSE_UNIVERSELS = ['1234', '123456', 'heistal2026', 'admin']
PNG_VALIDE = b'\x89PNG\r\n\x1a\n' + b'\x00' * 32


@override_settings(PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class ApiTestCase(APITestCase):
    def setUp(self):
        cache.clear()  # remet à zéro la limite d'essais de connexion

    def creer_employe(self, username, role='SERVICE_COMMERCIAL', mot_de_passe=MOT_DE_PASSE_FORT, **champs):
        return StaffProfile.objects.create(
            nom_complet=f'{username.title()} Test', username=username, role=role, mot_de_passe=mot_de_passe, **champs
        )

    def connexion(self, identifiant, mot_de_passe=MOT_DE_PASSE_FORT):
        return self.client.post('/api/login/', {'identifiant': identifiant, 'password': mot_de_passe}, format='json')

    def se_connecter(self, identifiant, mot_de_passe=MOT_DE_PASSE_FORT):
        reponse = self.connexion(identifiant, mot_de_passe)
        self.assertEqual(reponse.status_code, 200, reponse.content)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {reponse.data["token"]}')
        return reponse.data

    def se_deconnecter(self):
        self.client.credentials()

    def creer_produit(self):
        return Product.objects.create(nom='Tilapia', reference='TIL-1', prix_vente=2800, prix_gros=25000, cout_achat=2000)

    def creer_boutique(self, nom, statut='Active'):
        return Boutique.objects.create(nom=nom, telephone='+228 90 00 00 00', localisation=nom, statut=statut)

    def commande_publique(self, **champs):
        if not hasattr(self, 'boutique_commande'):
            self.boutique_commande = self.creer_boutique('Boutique Commande Test')
            self.produit_commande = Product.objects.create(nom='Capitaine', reference='CAP-T', prix_vente=3500)
            StockBoutique.objects.create(produit=self.produit_commande, boutique=self.boutique_commande, quantite=50)
        return {
            'client_nom': 'Ama', 'client_telephone': '+228 90 00 00 09', 'boutique': self.boutique_commande.id,
            'items': [{'produit': self.produit_commande.id, 'quantite': 1}], **champs,
        }


class AccesAnonymeTests(ApiTestCase):
    def test_les_ressources_internes_refusent_les_anonymes(self):
        for ressource in ['users', 'profiles', 'clients', 'customers', 'commandes', 'orders', 'sales',
                          'boutiques', 'stores', 'rayons', 'categories', 'types-stock']:
            with self.subTest(ressource=ressource):
                self.assertEqual(self.client.get(f'/api/{ressource}/').status_code, 401)

    def test_un_anonyme_ne_peut_pas_se_creer_un_compte_pdg(self):
        reponse = self.client.post('/api/users/', {
            'nom_complet': 'Pirate', 'username': 'evil', 'role': 'PDG', 'mot_de_passe': MOT_DE_PASSE_FORT
        }, format='json')
        self.assertEqual(reponse.status_code, 401)
        self.assertFalse(User.objects.filter(username='evil').exists())

    def test_le_seed_est_ferme(self):
        self.assertEqual(self.client.post('/api/seed/').status_code, 401)
        self.assertEqual(self.client.post('/api/users/seed_default/').status_code, 401)
        self.assertFalse(StaffProfile.objects.exists())

    def test_un_employe_ordinaire_ne_peut_pas_lancer_le_seed(self):
        self.creer_employe('yao')
        self.se_connecter('yao')
        self.assertEqual(self.client.post('/api/seed/').status_code, 403)

    def test_un_ancien_jeton_previsible_est_refuse(self):
        self.client.credentials(HTTP_AUTHORIZATION='Bearer heistal_token_1_PDG')
        self.assertEqual(self.client.get('/api/users/').status_code, 401)

    def test_le_catalogue_reste_public_sans_le_cout_d_achat(self):
        self.creer_produit()
        self.assertEqual(self.client.get('/api/familles/').status_code, 200)
        reponse = self.client.get('/api/products/')
        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(reponse.data[0]['prix_gros'], 25000)
        self.assertNotIn('cout_achat', reponse.data[0])

    def test_le_personnel_voit_le_cout_d_achat(self):
        self.creer_produit()
        self.creer_employe('yao')
        self.se_connecter('yao')
        self.assertEqual(self.client.get('/api/products/').data[0]['cout_achat'], 2000)

    def test_un_anonyme_ne_peut_pas_modifier_le_catalogue(self):
        produit = self.creer_produit()
        self.assertEqual(self.client.delete(f'/api/products/{produit.id}/').status_code, 401)
        self.assertEqual(self.client.post(f'/api/products/{produit.id}/adjust_stock/', {'delta': -5}).status_code, 401)
        self.assertEqual(self.client.post('/api/familles/', {'nom': 'X', 'code': 'X'}).status_code, 401)

    def test_une_commande_publique_ne_choisit_ni_son_statut_ni_son_numero(self):
        reponse = self.client.post('/api/commandes/', self.commande_publique(
            statut='RECUPEREE', numero_commande='PIRATE'
        ), format='json')
        self.assertEqual(reponse.status_code, 201, reponse.content)
        self.assertEqual(reponse.data['statut'], 'EN_ATTENTE')
        self.assertRegex(reponse.data['code'], r'^[A-HJKMNP-Z2-9]{3}-[A-HJKMNP-Z2-9]{3}$')

    def test_un_anonyme_ne_lit_pas_les_commandes_et_ne_change_pas_leur_statut(self):
        commande = CommandeDirecte.objects.create(client_nom='Ama', client_telephone='+228 90 00 00 09')
        self.assertEqual(self.client.get(f'/api/commandes/{commande.id}/').status_code, 401)
        reponse = self.client.post(f'/api/commandes/{commande.id}/changer_statut/', {'statut': 'ANNULEE'})
        self.assertEqual(reponse.status_code, 401)


class ConnexionEmployeTests(ApiTestCase):
    def test_les_mots_de_passe_universels_sont_refuses(self):
        self.creer_employe('hugues', role='SUPER_ADMIN')
        for mot_de_passe in MOTS_DE_PASSE_UNIVERSELS:
            with self.subTest(mot_de_passe=mot_de_passe):
                self.assertEqual(self.connexion('hugues', mot_de_passe).status_code, 401)

    def test_le_message_d_erreur_ne_revele_pas_si_le_compte_existe(self):
        self.creer_employe('hugues')
        mauvais_mot_de_passe = self.connexion('hugues', 'mauvais')
        compte_inconnu = self.connexion('personne', 'mauvais')
        self.assertEqual(mauvais_mot_de_passe.status_code, compte_inconnu.status_code)
        self.assertEqual(mauvais_mot_de_passe.data, compte_inconnu.data)

    def test_le_jeton_est_aleatoire_et_stocke_sous_forme_d_empreinte(self):
        self.creer_employe('yao')
        jeton = self.connexion('yao').data['token']
        self.assertNotIn('yao', jeton)
        self.assertNotIn('CAISSE', jeton)
        self.assertFalse(ApiToken.objects.filter(empreinte=jeton).exists())
        self.assertTrue(ApiToken.objects.filter(empreinte=ApiToken.empreinte_de(jeton)).exists())

    def test_un_jeton_expire_est_refuse(self):
        self.creer_employe('yao')
        self.se_connecter('yao')
        ApiToken.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
        self.assertEqual(self.client.get('/api/users/').status_code, 401)

    def test_la_verification_de_session_distingue_jeton_valide_et_perime(self):
        self.creer_employe('yao')
        self.assertEqual(self.client.get('/api/session/').status_code, 401)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer heistal_token_2_PDG')
        self.assertEqual(self.client.get('/api/session/').status_code, 401)
        self.se_connecter('yao')
        reponse = self.client.get('/api/session/')
        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(reponse.data['user']['role'], 'SERVICE_COMMERCIAL')

    def test_la_deconnexion_revoque_le_jeton(self):
        self.creer_employe('yao')
        self.se_connecter('yao')
        self.assertEqual(self.client.post('/api/logout/').status_code, 204)
        self.assertEqual(self.client.get('/api/users/').status_code, 401)

    def test_un_compte_sans_profil_n_entre_pas_et_ne_devient_pas_pdg(self):
        User.objects.create_user('ancien', password=MOT_DE_PASSE_FORT)
        self.assertEqual(self.connexion('ancien').status_code, 401)

    def test_un_vrai_superutilisateur_sans_profil_garde_l_acces(self):
        User.objects.create_superuser('admin', password=MOT_DE_PASSE_FORT)
        self.assertEqual(self.se_connecter('admin')['user']['role'], 'SUPER_ADMIN')
        self.assertEqual(self.client.get('/api/users/').status_code, 200)

    def test_un_identifiant_numerique_ne_plante_pas(self):
        reponse = self.client.post('/api/login/', {'identifiant': 12345, 'password': 'x'}, format='json')
        self.assertEqual(reponse.status_code, 401)

    def test_les_essais_de_connexion_sont_limites(self):
        statuts = [self.connexion('hugues', 'mauvais').status_code for _ in range(11)]
        self.assertEqual(statuts[:10], [401] * 10)
        self.assertEqual(statuts[10], 429)


class MotDePasseFaibleTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.creer_employe('yao', mot_de_passe='1234')
        self.session = self.se_connecter('yao', '1234')

    def changer(self, ancien='1234', nouveau=MOT_DE_PASSE_FORT):
        return self.client.post('/api/change-password/', {
            'ancien_mot_de_passe': ancien, 'nouveau_mot_de_passe': nouveau
        }, format='json')

    def test_la_session_est_limitee_au_changement_de_mot_de_passe(self):
        self.assertTrue(self.session['must_change_password'])
        reponse = self.client.get('/api/commandes/')
        self.assertEqual(reponse.status_code, 403)
        self.assertIn('mot de passe', reponse.data['detail'])

    def test_le_changement_ouvre_une_session_complete_et_ferme_les_autres(self):
        reponse = self.changer()
        self.assertEqual(reponse.status_code, 200, reponse.content)
        self.assertEqual(self.client.get('/api/commandes/').status_code, 401)

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {reponse.data["token"]}')
        self.assertEqual(self.client.get('/api/commandes/').status_code, 200)

        self.se_deconnecter()
        self.assertEqual(self.connexion('yao', '1234').status_code, 401)
        self.assertFalse(self.connexion('yao', MOT_DE_PASSE_FORT).data['must_change_password'])

    def test_le_nouveau_mot_de_passe_doit_etre_solide(self):
        for nouveau in ['1234', '12345678', 'motdepasse', '']:
            with self.subTest(nouveau=nouveau):
                reponse = self.changer(nouveau=nouveau)
                self.assertEqual(reponse.status_code, 400)
                self.assertFalse(reponse.data['success'])

    def test_l_ancien_mot_de_passe_est_exige(self):
        self.assertEqual(self.changer(ancien='mauvais').status_code, 400)

    def test_les_erreurs_sont_en_francais(self):
        self.assertIn('mot de passe', self.changer(nouveau='12').data['message'].lower())


class ComptesEmployesTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.tokoin = self.creer_boutique('Boutique Tokoin Wuiti')
        self.agoe = self.creer_boutique('Boutique Agoè Assiyéyé')
        self.chef = self.creer_employe('hugues', role='SUPER_ADMIN')
        self.commercial = self.creer_employe('paulin')
        self.controleur = self.creer_employe('kodjo', role='CONTROLEUR')
        self.caissiere = self.creer_employe('yao', role='CAISSIERE', boutique=self.tokoin)

    def nouveau_compte(self, **champs):
        return {'nom_complet': 'Sylvie Lawson', 'username': 'sylvie', 'role': 'CONTROLEUR', **champs}

    def patch(self, profil, **champs):
        return self.client.patch(f'/api/users/{profil.id}/', champs, format='json')

    def test_il_n_y_a_que_quatre_roles(self):
        self.assertEqual([role for role, _ in StaffProfile.ROLE_CHOICES], ['SUPER_ADMIN', 'SERVICE_COMMERCIAL', 'CONTROLEUR', 'CAISSIERE'])
        self.se_connecter('hugues')
        reponse = self.client.post('/api/users/', self.nouveau_compte(role='PDG'), format='json')
        self.assertEqual(reponse.status_code, 400, reponse.content)

    def test_aucun_mot_de_passe_n_est_conserve_ni_renvoye(self):
        self.se_connecter('hugues')
        reponse = self.client.get('/api/users/')
        self.assertEqual(reponse.status_code, 200)
        self.assertTrue(all('mot_de_passe' not in employe for employe in reponse.data))
        self.assertFalse(StaffProfile.objects.exclude(mot_de_passe='').exists())

    def test_seul_le_super_admin_gere_les_comptes(self):
        for identifiant in ['paulin', 'kodjo', 'yao']:
            with self.subTest(identifiant=identifiant):
                self.se_connecter(identifiant)
                self.assertEqual(self.client.get('/api/users/').status_code, 403)
                self.assertEqual(self.client.post('/api/users/', self.nouveau_compte(), format='json').status_code, 403)
                self.assertEqual(self.patch(self.caissiere, telephone='+228').status_code, 403)
                self.assertEqual(self.patch(self.caissiere, statut='Inactif').status_code, 403)
                self.assertEqual(self.client.post(f'/api/users/{self.caissiere.id}/reinitialiser_mot_de_passe/').status_code, 403)
                self.assertEqual(self.client.post(f'/api/users/{self.caissiere.id}/affecter_boutique/', {'boutique': self.agoe.id}, format='json').status_code, 403)
                self.se_deconnecter()

    def test_personne_ne_peut_se_donner_un_autre_role(self):
        self.se_connecter('yao')
        self.assertEqual(self.patch(self.caissiere, role='SUPER_ADMIN').status_code, 403)
        self.caissiere.refresh_from_db()
        self.assertEqual(self.caissiere.role, 'CAISSIERE')

    def test_un_compte_ne_se_supprime_jamais(self):
        self.se_connecter('hugues')
        for methode in [self.client.delete, self.client.put]:
            with self.subTest(methode=methode):
                self.assertEqual(methode(f'/api/users/{self.caissiere.id}/', {}, format='json').status_code, 405)
        self.assertTrue(StaffProfile.objects.filter(pk=self.caissiere.pk).exists())

    def test_la_creation_donne_un_mot_de_passe_provisoire_a_changer(self):
        self.se_connecter('hugues')
        reponse = self.client.post('/api/users/', self.nouveau_compte(), format='json')
        self.assertEqual(reponse.status_code, 201, reponse.content)
        provisoire = reponse.data['mot_de_passe_temporaire']
        self.assertTrue(provisoire.startswith('HST-'))
        self.se_deconnecter()
        connexion = self.connexion('sylvie', provisoire)
        self.assertEqual(connexion.status_code, 200, connexion.content)
        self.assertTrue(connexion.data['must_change_password'])

    def test_un_mot_de_passe_choisi_par_le_super_admin_n_existe_pas(self):
        self.se_connecter('hugues')
        reponse = self.client.post('/api/users/', self.nouveau_compte(mot_de_passe=MOT_DE_PASSE_FORT), format='json')
        self.assertEqual(reponse.status_code, 201, reponse.content)
        self.se_deconnecter()
        self.assertEqual(self.connexion('sylvie', MOT_DE_PASSE_FORT).status_code, 401)

    def test_un_nom_d_utilisateur_vide_ou_nul_est_genere(self):
        self.se_connecter('hugues')
        for valeur in ['', None]:
            with self.subTest(valeur=valeur):
                reponse = self.client.post('/api/users/', self.nouveau_compte(username=valeur, nom_complet='Hugues Autre'), format='json')
                self.assertEqual(reponse.status_code, 201, reponse.content)
                self.assertTrue(reponse.data['username'].startswith('hugues'))
                self.assertNotEqual(reponse.data['username'], 'hugues')

    def test_un_identifiant_deja_pris_est_refuse_en_francais(self):
        self.se_connecter('hugues')
        for valeur in ['yao', 'YAO']:
            with self.subTest(valeur=valeur):
                reponse = self.client.post('/api/users/', self.nouveau_compte(username=valeur), format='json')
                self.assertEqual(reponse.status_code, 400, reponse.content)
                self.assertEqual(str(reponse.data['username'][0]), "Ce nom d'utilisateur est déjà pris.")
        reponse = self.patch(self.controleur, username='yao')
        self.assertEqual(reponse.status_code, 400, reponse.content)

    def test_changer_l_identifiant_change_la_connexion(self):
        self.se_connecter('hugues')
        self.assertEqual(self.patch(self.controleur, username='kodjo.agbeko').status_code, 200)
        self.controleur.user.refresh_from_db()
        self.assertEqual(self.controleur.user.username, 'kodjo.agbeko')
        self.se_deconnecter()
        self.assertEqual(self.connexion('kodjo').status_code, 401)
        self.assertEqual(self.connexion('kodjo.agbeko').status_code, 200)

    def test_garder_son_identifiant_n_est_pas_un_doublon(self):
        self.se_connecter('hugues')
        self.assertEqual(self.patch(self.controleur, username='kodjo').status_code, 200)

    def test_le_nom_est_obligatoire(self):
        self.se_connecter('hugues')
        reponse = self.client.post('/api/users/', self.nouveau_compte(nom_complet=''), format='json')
        self.assertEqual(reponse.status_code, 400, reponse.content)
        self.assertEqual(str(reponse.data['nom_complet'][0]), "Saisissez le nom de l'utilisateur.")

    def test_une_caissiere_doit_avoir_une_boutique(self):
        self.se_connecter('hugues')
        reponse = self.client.post('/api/users/', self.nouveau_compte(role='CAISSIERE'), format='json')
        self.assertEqual(reponse.status_code, 400, reponse.content)
        self.assertEqual(str(reponse.data['boutique'][0]), 'Choisissez la boutique de la caissière.')
        reponse = self.client.post('/api/users/', self.nouveau_compte(role='CAISSIERE', boutique=self.agoe.id), format='json')
        self.assertEqual(reponse.status_code, 201, reponse.content)
        self.assertEqual(reponse.data['boutique_nom'], 'Boutique Agoè Assiyéyé')

    def test_seule_une_boutique_active_peut_etre_affectee(self):
        fermee = self.creer_boutique('Boutique Fermée', statut='Fermée')
        self.se_connecter('hugues')
        reponse = self.patch(self.caissiere, boutique=fermee.id)
        self.assertEqual(reponse.status_code, 400, reponse.content)
        self.assertEqual(str(reponse.data['boutique'][0]), "Cette boutique n'est pas ouverte.")

    def test_le_super_admin_change_le_role_et_la_boutique_part_avec_le_role(self):
        self.se_connecter('hugues')
        reponse = self.patch(self.caissiere, role='CONTROLEUR')
        self.assertEqual(reponse.status_code, 200, reponse.content)
        self.caissiere.refresh_from_db()
        self.assertEqual((self.caissiere.role, self.caissiere.boutique), ('CONTROLEUR', None))

    def test_devenir_caissiere_demande_une_boutique(self):
        self.se_connecter('hugues')
        self.assertEqual(self.patch(self.controleur, role='CAISSIERE').status_code, 400)
        self.assertEqual(self.patch(self.controleur, role='CAISSIERE', boutique=self.agoe.id).status_code, 200)

    def test_le_super_admin_affecte_une_caissiere_a_une_boutique(self):
        self.se_connecter('hugues')
        reponse = self.client.post(f'/api/users/{self.caissiere.id}/affecter_boutique/', {'boutique': self.agoe.id}, format='json')
        self.assertEqual(reponse.status_code, 200, reponse.content)
        self.caissiere.refresh_from_db()
        self.assertEqual(self.caissiere.boutique, self.agoe)

    def test_seule_une_caissiere_s_affecte_a_une_boutique(self):
        self.se_connecter('hugues')
        reponse = self.client.post(f'/api/users/{self.commercial.id}/affecter_boutique/', {'boutique': self.agoe.id}, format='json')
        self.assertEqual(reponse.status_code, 400, reponse.content)

    def test_devenir_super_admin_ouvre_les_droits_et_les_quitter_les_retire(self):
        self.se_connecter('hugues')
        self.assertEqual(self.patch(self.commercial, role='SUPER_ADMIN').status_code, 200)
        self.commercial.user.refresh_from_db()
        self.assertTrue(self.commercial.user.is_superuser)
        self.assertEqual(self.patch(self.commercial, role='CONTROLEUR').status_code, 200)
        self.commercial.user.refresh_from_db()
        self.assertFalse(self.commercial.user.is_superuser)

    def test_reinitialiser_donne_un_nouveau_mot_de_passe_et_ferme_les_sessions(self):
        self.se_connecter('yao')
        ancien_jeton = self.client._credentials['HTTP_AUTHORIZATION']
        self.se_connecter('hugues')
        reponse = self.client.post(f'/api/users/{self.caissiere.id}/reinitialiser_mot_de_passe/')
        self.assertEqual(reponse.status_code, 200, reponse.content)
        provisoire = reponse.data['mot_de_passe_temporaire']
        self.client.credentials(HTTP_AUTHORIZATION=ancien_jeton)
        self.assertEqual(self.client.get('/api/commandes/').status_code, 401)
        self.se_deconnecter()
        self.assertEqual(self.connexion('yao').status_code, 401)
        session = self.connexion('yao', provisoire)
        self.assertEqual(session.status_code, 200, session.content)
        self.assertTrue(session.data['must_change_password'])

    def test_un_mot_de_passe_provisoire_ne_sert_qu_a_en_choisir_un_autre(self):
        self.se_connecter('hugues')
        provisoire = self.client.post(f'/api/users/{self.caissiere.id}/reinitialiser_mot_de_passe/').data['mot_de_passe_temporaire']
        self.se_deconnecter()
        self.se_connecter('yao', provisoire)
        self.assertEqual(self.client.get('/api/products/').status_code, 200)
        self.assertEqual(self.client.get('/api/sales/').status_code, 403)
        reponse = self.client.post('/api/change-password/', {'ancien_mot_de_passe': provisoire, 'nouveau_mot_de_passe': AUTRE_MOT_DE_PASSE_FORT}, format='json')
        self.assertEqual(reponse.status_code, 200, reponse.content)
        self.se_deconnecter()
        session = self.connexion('yao', AUTRE_MOT_DE_PASSE_FORT)
        self.assertFalse(session.data['must_change_password'])

    def test_desactiver_un_compte_ferme_immediatement_son_acces(self):
        self.se_connecter('hugues')
        jeton_chef = self.client._credentials['HTTP_AUTHORIZATION']
        self.se_connecter('yao')
        jeton_caissiere = self.client._credentials['HTTP_AUTHORIZATION']

        self.client.credentials(HTTP_AUTHORIZATION=jeton_chef)
        self.patch(self.caissiere, statut='Inactif')

        self.client.credentials(HTTP_AUTHORIZATION=jeton_caissiere)
        self.assertEqual(self.client.get('/api/sales/').status_code, 401)
        self.se_deconnecter()
        self.assertEqual(self.connexion('yao').status_code, 403)

        self.client.credentials(HTTP_AUTHORIZATION=jeton_chef)
        self.patch(self.caissiere, statut='Actif')
        self.se_deconnecter()
        self.assertEqual(self.connexion('yao').status_code, 200)

    def test_il_reste_toujours_un_super_admin_actif(self):
        autre = self.creer_employe('david', role='SUPER_ADMIN')
        self.se_connecter('david')
        self.assertEqual(self.patch(self.chef, statut='Inactif').status_code, 200)
        self.chef.refresh_from_db()
        self.assertEqual(self.chef.statut, 'Inactif')
        User.objects.create_superuser('admin', password=MOT_DE_PASSE_FORT)
        self.se_connecter('admin')
        for champs in [{'statut': 'Inactif'}, {'role': 'CONTROLEUR'}]:
            with self.subTest(champs=champs):
                reponse = self.patch(autre, **champs)
                self.assertEqual(reponse.status_code, 400, reponse.content)
                self.assertIn('au moins un super admin actif', str(reponse.data))
        autre.refresh_from_db()
        self.assertEqual((autre.statut, autre.role), ('Actif', 'SUPER_ADMIN'))

    def test_on_ne_retire_pas_ses_propres_droits(self):
        self.creer_employe('david', role='SUPER_ADMIN')
        self.se_connecter('hugues')
        for champs in [{'statut': 'Inactif'}, {'role': 'CAISSIERE', 'boutique': self.agoe.id}]:
            with self.subTest(champs=champs):
                reponse = self.patch(self.chef, **champs)
                self.assertEqual(reponse.status_code, 400, reponse.content)
                self.assertIn('votre propre compte', str(reponse.data))

    def test_on_peut_modifier_ses_propres_coordonnees(self):
        self.se_connecter('hugues')
        self.assertEqual(self.patch(self.chef, telephone='+228 90 00 00 01').status_code, 200)

    def test_un_profil_ne_peut_pas_prendre_le_controle_du_superutilisateur_admin(self):
        admin = User.objects.create_superuser('admin', password=MOT_DE_PASSE_FORT)
        self.se_connecter('hugues')
        reponse = self.client.post('/api/users/', self.nouveau_compte(username='admin'), format='json')
        self.assertEqual(reponse.status_code, 400)
        self.assertIn('username', reponse.data)
        self.patch(self.caissiere, user=admin.id)
        self.caissiere.refresh_from_db()
        self.assertNotEqual(self.caissiere.user_id, admin.id)

    def test_la_session_donne_le_role_et_la_boutique(self):
        session = self.se_connecter('yao')
        self.assertEqual((session['user']['role'], session['user']['boutique']), ('CAISSIERE', self.tokoin.id))
        self.assertEqual(session['user']['boutique_nom'], 'Boutique Tokoin Wuiti')


class DroitsParRoleTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.tokoin = self.creer_boutique('Boutique Tokoin Wuiti')
        self.famille = Famille.objects.create(nom='POISSON', code='31130')
        self.produit = Product.objects.create(nom='Tilapia', reference='TIL-1', prix_vente=2800, famille=self.famille)
        StockBoutique.objects.create(produit=self.produit, boutique=self.tokoin, quantite=10)
        self.creer_employe('hugues', role='SUPER_ADMIN')
        self.creer_employe('paulin')
        self.creer_employe('kodjo', role='CONTROLEUR')
        self.creer_employe('yao', role='CAISSIERE', boutique=self.tokoin)

    def statuts(self, action):
        resultats = {}
        for identifiant in ['hugues', 'paulin', 'kodjo', 'yao']:
            cache.clear()  # ces essais répétés ne doivent pas toucher la limite de connexions
            self.se_connecter(identifiant)
            resultats[identifiant] = action().status_code
            self.se_deconnecter()
        return resultats

    def ajuster(self):
        return self.client.post(f'/api/products/{self.produit.id}/adjust_stock/', {'stocks': [{'boutique': self.tokoin.id, 'variation': 1}]}, format='json')

    def test_le_catalogue_se_gere_par_le_super_admin_et_le_commercial(self):
        self.assertEqual(self.statuts(self.ajuster), {'hugues': 200, 'paulin': 200, 'kodjo': 403, 'yao': 403})
        modifier = lambda: self.client.patch(f'/api/products/{self.produit.id}/', {'prix_vente': 3000}, format='json')
        self.assertEqual(self.statuts(modifier), {'hugues': 200, 'paulin': 200, 'kodjo': 403, 'yao': 403})
        famille = lambda: self.client.patch(f'/api/familles/{self.famille.id}/', {'description': 'x'}, format='json')
        self.assertEqual(self.statuts(famille), {'hugues': 200, 'paulin': 200, 'kodjo': 403, 'yao': 403})

    def test_tout_le_personnel_lit_le_catalogue(self):
        lire = lambda: self.client.get('/api/rayons/')
        self.assertEqual(self.statuts(lire), {'hugues': 200, 'paulin': 200, 'kodjo': 200, 'yao': 200})

    def test_les_boutiques_se_gerent_par_le_super_admin_seul(self):
        creer = lambda: self.client.patch(f'/api/boutiques/{self.tokoin.id}/', {'horaires': '8h-20h'}, format='json')
        self.assertEqual(self.statuts(creer), {'hugues': 200, 'paulin': 403, 'kodjo': 403, 'yao': 403})

    def test_le_controleur_ne_vend_pas(self):
        numero = iter(range(1, 9))
        vendre = lambda: self.client.post('/api/sales/', {'reference': f'V-{next(numero)}', 'boutique': self.tokoin.id}, format='json')
        self.assertEqual(self.statuts(vendre), {'hugues': 201, 'paulin': 201, 'kodjo': 403, 'yao': 201})

    def test_seul_le_super_admin_touche_a_une_vente_enregistree(self):
        vente = Sale.objects.create(reference='V-X', boutique=self.tokoin, boutique_nom=self.tokoin.nom)
        modifier = lambda: self.client.patch(f'/api/sales/{vente.id}/', {'notes': 'x'}, format='json')
        self.assertEqual(self.statuts(modifier), {'hugues': 200, 'paulin': 403, 'kodjo': 403, 'yao': 403})
        self.se_connecter('paulin')
        self.assertEqual(self.client.delete(f'/api/sales/{vente.id}/').status_code, 403)
        self.se_connecter('hugues')
        self.assertEqual(self.client.delete(f'/api/sales/{vente.id}/').status_code, 204)

    def test_commandes_et_clients_par_le_super_admin_et_le_commercial(self):
        commande = CommandeDirecte.objects.create(client_nom='Ama', client_telephone='+228', total=1000)
        changer = lambda: self.client.post(f'/api/commandes/{commande.id}/changer_statut/', {'statut': 'PRETE'}, format='json')
        self.assertEqual(self.statuts(changer), {'hugues': 200, 'paulin': 200, 'kodjo': 403, 'yao': 403})
        client = Client.objects.create(nom_complet='Ama', telephone='+228 90 00 00 09')
        modifier = lambda: self.client.patch(f'/api/clients/{client.id}/', {'ville': 'Lomé'}, format='json')
        self.assertEqual(self.statuts(modifier), {'hugues': 200, 'paulin': 200, 'kodjo': 403, 'yao': 403})


class MouvementsTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.tokoin = self.creer_boutique('Boutique Tokoin Wuiti')
        self.agoe = self.creer_boutique('Boutique Agoè Assiyéyé')
        self.famille = Famille.objects.create(nom='POISSON', code='31130')
        self.produit = Product.objects.create(nom='Tilapia', reference='TIL-1', prix_vente=2800, famille=self.famille)
        StockBoutique.objects.create(produit=self.produit, boutique=self.tokoin, quantite=10)
        StockBoutique.objects.create(produit=self.produit, boutique=self.agoe, quantite=5)
        self.chef = self.creer_employe('hugues', role='SUPER_ADMIN')
        self.commercial = self.creer_employe('paulin')
        self.controleur = self.creer_employe('kodjo', role='CONTROLEUR')
        self.yao = self.creer_employe('yao', role='CAISSIERE', boutique=self.tokoin)
        self.kafui = self.creer_employe('kafui', role='CAISSIERE', boutique=self.agoe)

    def vendre(self, boutique, reference, quantite=2):
        return self.client.post('/api/sales/', {
            'reference': reference, 'boutique': boutique.id, 'total_ttc': 5600,
            'items': [{'produit': self.produit.id, 'nom_produit': 'Tilapia', 'prix_unitaire': 2800, 'quantite': quantite, 'total_ligne': 5600}],
        }, format='json')

    def ajuster(self, boutique, variation):
        return self.client.post(f'/api/products/{self.produit.id}/adjust_stock/', {'stocks': [{'boutique': boutique.id, 'variation': variation}]}, format='json')

    def journal(self, requete=''):
        reponse = self.client.get(f'/api/mouvements/{requete}')
        self.assertEqual(reponse.status_code, 200, reponse.content)
        return reponse.data

    def test_une_vente_est_notee_avec_sa_boutique_son_auteur_et_le_stock_restant(self):
        self.se_connecter('yao')
        self.vendre(self.tokoin, 'V-1')
        mouvement = Mouvement.objects.get(type='VENTE')
        self.assertEqual(
            (mouvement.boutique, mouvement.utilisateur, mouvement.utilisateur_nom, mouvement.produit_nom, mouvement.quantite, mouvement.stock_apres, mouvement.montant, mouvement.reference),
            (self.tokoin, self.yao.user, 'Yao Test', 'Tilapia', -2, 8, 5600, 'V-1'),
        )

    def test_un_ajustement_est_note_en_entree_ou_en_sortie(self):
        self.se_connecter('paulin')
        self.ajuster(self.tokoin, 7)
        self.ajuster(self.agoe, -2)
        entree = Mouvement.objects.get(type='ENTREE')
        sortie = Mouvement.objects.get(type='SORTIE')
        self.assertEqual((entree.boutique, entree.quantite, entree.stock_apres), (self.tokoin, 7, 17))
        self.assertEqual((sortie.boutique, sortie.quantite, sortie.stock_apres), (self.agoe, -2, 3))

    def test_un_ajustement_note_ce_qui_a_vraiment_change(self):
        self.se_connecter('paulin')
        self.ajuster(self.agoe, -500)
        self.assertEqual(Mouvement.objects.get(type='SORTIE').quantite, -5)
        self.ajuster(self.agoe, -5)
        self.assertEqual(Mouvement.objects.filter(type='SORTIE').count(), 1)

    def test_un_nouveau_produit_note_son_stock_de_depart(self):
        self.se_connecter('paulin')
        reponse = self.client.post('/api/products/', {
            'nom': 'Capitaine', 'famille': self.famille.id, 'prix_vente': 3500, 'unite': 'kg',
            'stocks': json.dumps([{'boutique': self.agoe.id, 'quantite': 12}, {'boutique': self.tokoin.id, 'quantite': 0}]),
        }, format='multipart')
        self.assertEqual(reponse.status_code, 201, reponse.content)
        depart = Mouvement.objects.get(type='STOCK_DEPART')
        self.assertEqual((depart.boutique, depart.quantite, depart.stock_apres, depart.produit_nom), (self.agoe, 12, 12, 'Capitaine'))
        self.assertEqual(Mouvement.objects.get(type='PRODUIT').description, 'Produit créé')

    def test_une_modification_de_produit_dit_ce_qui_a_change(self):
        self.se_connecter('paulin')
        self.client.patch(f'/api/products/{self.produit.id}/', {'prix_vente': 3000}, format='json')
        self.assertEqual(Mouvement.objects.get(type='PRODUIT').description, 'Prix de vente : 2800 → 3000')

    def test_une_modification_sans_changement_ne_note_rien(self):
        self.se_connecter('paulin')
        self.client.patch(f'/api/products/{self.produit.id}/', {'prix_vente': 2800}, format='json')
        self.assertFalse(Mouvement.objects.filter(type='PRODUIT').exists())

    def test_une_suppression_de_produit_garde_son_nom_au_journal(self):
        self.se_connecter('paulin')
        self.assertEqual(self.client.delete(f'/api/products/{self.produit.id}/').status_code, 204)
        mouvement = Mouvement.objects.get(type='PRODUIT')
        self.assertEqual((mouvement.produit_nom, mouvement.description, mouvement.produit), ('Tilapia', 'Produit supprimé', None))

    def test_les_actions_sur_les_comptes_sont_notees(self):
        self.se_connecter('hugues')
        self.client.post('/api/users/', {'nom_complet': 'Sylvie Lawson', 'role': 'CONTROLEUR'}, format='json')
        self.client.patch(f'/api/users/{self.yao.id}/', {'role': 'CONTROLEUR'}, format='json')
        self.client.patch(f'/api/users/{self.commercial.id}/', {'statut': 'Inactif'}, format='json')
        self.client.post(f'/api/users/{self.controleur.id}/reinitialiser_mot_de_passe/')
        descriptions = list(Mouvement.objects.filter(type='COMPTE').order_by('id').values_list('description', flat=True))
        self.assertEqual(descriptions, [
            'Compte créé : Sylvie Lawson (Contrôleur)',
            'Yao Test — rôle : Caissière → Contrôleur',
            'Paulin Test — compte désactivé',
            'Kodjo Test — mot de passe réinitialisé',
        ])
        self.assertTrue(all(m.utilisateur == self.chef.user for m in Mouvement.objects.filter(type='COMPTE')))

    def test_aucun_mot_de_passe_n_apparait_au_journal(self):
        self.se_connecter('hugues')
        provisoire = self.client.post(f'/api/users/{self.yao.id}/reinitialiser_mot_de_passe/').data['mot_de_passe_temporaire']
        self.assertFalse(Mouvement.objects.filter(description__contains=provisoire).exists())

    def test_une_connexion_est_notee_mais_pas_un_echec(self):
        self.connexion('yao', 'mauvais-mot-de-passe')
        self.assertFalse(Mouvement.objects.filter(type='CONNEXION').exists())
        self.connexion('yao')
        mouvement = Mouvement.objects.get(type='CONNEXION')
        self.assertEqual((mouvement.utilisateur, mouvement.boutique), (self.yao.user, self.tokoin))

    def test_le_journal_se_filtre_par_boutique_utilisateur_et_type(self):
        self.se_connecter('yao')
        self.vendre(self.tokoin, 'V-1')
        self.se_connecter('kafui')
        self.vendre(self.agoe, 'V-2')
        self.se_connecter('paulin')
        self.ajuster(self.agoe, 4)
        self.se_connecter('kodjo')
        self.assertEqual(len(self.journal(f'?boutique={self.agoe.id}&type=VENTE')['resultats']), 1)
        par_yao = self.journal(f'?utilisateur={self.yao.user_id}&type=VENTE')['resultats']
        self.assertEqual([m['reference'] for m in par_yao], ['V-1'])
        agoe = self.journal(f'?boutique={self.agoe.id}&utilisateur={self.commercial.user_id}')['resultats']
        self.assertEqual([m['type'] for m in agoe], ['ENTREE'])

    def test_le_journal_donne_un_resume_de_ce_qui_est_affiche(self):
        self.se_connecter('paulin')
        self.vendre(self.tokoin, 'V-1', quantite=3)
        self.ajuster(self.tokoin, 7)
        self.ajuster(self.tokoin, -2)
        resume = self.journal(f'?boutique={self.tokoin.id}')['resume']
        self.assertEqual((resume['ventes'], resume['entrees'], resume['sorties']), (5600, 7, 5))

    def test_le_journal_se_filtre_par_date(self):
        self.se_connecter('paulin')
        self.ajuster(self.tokoin, 1)
        Mouvement.objects.filter(type='ENTREE').update(date=timezone.now() - timedelta(days=10))
        self.ajuster(self.tokoin, 1)
        depuis = (timezone.now() - timedelta(days=3)).date().isoformat()
        self.assertEqual(self.journal(f'?type=ENTREE&depuis={depuis}')['total'], 1)
        self.assertEqual(self.journal('?type=ENTREE')['total'], 2)
        self.assertEqual(self.journal('?type=ENTREE&depuis=pas-une-date')['total'], 2)

    def test_le_journal_se_lit_par_pages(self):
        Mouvement.objects.bulk_create([Mouvement(type='ENTREE', quantite=1, description=str(i)) for i in range(60)])
        self.se_connecter('kodjo')
        premiere = self.journal('?type=ENTREE')
        seconde = self.journal('?type=ENTREE&page=2')
        self.assertEqual((len(premiere['resultats']), premiere['total'], premiere['suite']), (50, 60, True))
        self.assertEqual((len(seconde['resultats']), seconde['suite']), (10, False))

    def test_une_caissiere_ne_lit_que_sa_boutique(self):
        self.se_connecter('kafui')
        self.vendre(self.agoe, 'V-2')
        self.se_connecter('yao')
        self.vendre(self.tokoin, 'V-1')
        Mouvement.objects.create(type='COMPTE', description='Sans boutique')
        references = {m['reference'] for m in self.journal()['resultats'] if m['reference']}
        self.assertEqual(references, {'V-1'})
        self.assertEqual(self.journal(f'?boutique={self.agoe.id}')['total'], 0)
        self.assertFalse(any(m['type'] == 'COMPTE' for m in self.journal()['resultats']))

    def test_le_journal_ne_se_modifie_pas(self):
        mouvement = Mouvement.objects.create(type='ENTREE', quantite=1)
        self.se_connecter('hugues')
        self.assertEqual(self.client.delete(f'/api/mouvements/{mouvement.id}/').status_code, 405)
        self.assertEqual(self.client.patch(f'/api/mouvements/{mouvement.id}/', {'quantite': 2}, format='json').status_code, 405)
        self.assertEqual(self.client.post('/api/mouvements/', {'type': 'ENTREE'}, format='json').status_code, 405)

    def test_le_journal_est_reserve_au_personnel(self):
        self.assertEqual(self.client.get('/api/mouvements/').status_code, 401)

    def test_les_filtres_listent_boutiques_et_utilisateurs(self):
        self.se_connecter('kodjo')
        filtres = self.client.get('/api/mouvements/filtres/').data
        self.assertEqual({b['nom'] for b in filtres['boutiques']}, {'Boutique Tokoin Wuiti', 'Boutique Agoè Assiyéyé'})
        self.assertIn({'id': self.yao.user_id, 'nom': 'Yao Test'}, filtres['utilisateurs'])

    def test_un_journal_survit_a_la_suppression_d_une_boutique(self):
        self.se_connecter('paulin')
        self.ajuster(self.agoe, -5)
        self.se_connecter('hugues')
        self.assertEqual(self.client.delete(f'/api/boutiques/{self.agoe.id}/').status_code, 204)
        mouvement = Mouvement.objects.get(type='SORTIE')
        self.assertEqual((mouvement.boutique, mouvement.boutique_nom), (None, 'Boutique Agoè Assiyéyé'))


class ConnexionClientTests(ApiTestCase):
    TELEPHONE = '+228 90 00 00 01'

    def setUp(self):
        super().setUp()
        self.fiche = Client.objects.create(nom_complet='Koffi', telephone=self.TELEPHONE, mot_de_passe=MOT_DE_PASSE_FORT)

    def connexion_client(self, **corps):
        return self.client.post('/api/clients/login/', corps, format='json')

    def inscription(self, **champs):
        return self.client.post('/api/clients/register/', {
            'telephone': self.TELEPHONE, 'nom_complet': 'Pirate', 'mot_de_passe': AUTRE_MOT_DE_PASSE_FORT, **champs
        }, format='json')

    def test_le_mot_de_passe_est_haché_en_base(self):
        self.assertNotEqual(self.fiche.mot_de_passe, MOT_DE_PASSE_FORT)
        self.assertTrue(self.fiche.verifier_mot_de_passe(MOT_DE_PASSE_FORT))

    def test_la_connexion_sans_mot_de_passe_est_refusee(self):
        self.assertEqual(self.connexion_client(telephone=self.TELEPHONE).status_code, 400)

    def test_les_mots_de_passe_universels_sont_refuses(self):
        for mot_de_passe in ['1234', '123456']:
            with self.subTest(mot_de_passe=mot_de_passe):
                self.assertEqual(self.connexion_client(telephone=self.TELEPHONE, password=mot_de_passe).status_code, 401)

    def test_la_bonne_connexion_ne_renvoie_jamais_le_mot_de_passe(self):
        reponse = self.connexion_client(telephone=self.TELEPHONE, password=MOT_DE_PASSE_FORT)
        self.assertEqual(reponse.status_code, 200, reponse.content)
        self.assertNotIn('mot_de_passe', reponse.data['client'])
        self.assertFalse(reponse.data['token'].startswith('client_token_'))

    def test_une_fiche_creee_par_une_commande_n_a_pas_de_mot_de_passe(self):
        self.client.post('/api/commandes/', self.commande_publique(), format='json')
        fiche = Client.objects.get(telephone='+228 90 00 00 09')
        self.assertEqual(fiche.mot_de_passe, '')
        self.assertEqual(self.connexion_client(telephone=fiche.telephone, password='1234').status_code, 401)

    def test_s_inscrire_avec_un_numero_existant_ne_vole_pas_le_compte(self):
        self.assertEqual(self.inscription().status_code, 409)
        self.fiche.refresh_from_db()
        self.assertEqual(self.fiche.nom_complet, 'Koffi')
        self.assertTrue(self.fiche.verifier_mot_de_passe(MOT_DE_PASSE_FORT))

    def test_l_inscription_exige_un_mot_de_passe_solide(self):
        for mot_de_passe in ['', '1234']:
            with self.subTest(mot_de_passe=mot_de_passe):
                self.assertEqual(self.inscription(telephone='+228 90 00 00 02', mot_de_passe=mot_de_passe).status_code, 400)
        self.assertFalse(Client.objects.filter(telephone='+228 90 00 00 02').exists())

    def test_l_inscription_fonctionne_puis_permet_la_connexion(self):
        self.assertEqual(self.inscription(telephone='+228 90 00 00 03').status_code, 201)
        reponse = self.connexion_client(telephone='+228 90 00 00 03', password=AUTRE_MOT_DE_PASSE_FORT)
        self.assertEqual(reponse.status_code, 200)

    def test_un_client_ne_voit_que_ses_propres_commandes(self):
        autre = Client.objects.create(nom_complet='Afiwa', telephone='+228 90 00 00 04')
        jeton = self.connexion_client(telephone=self.TELEPHONE, password=MOT_DE_PASSE_FORT).data['token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jeton}')
        self.assertEqual(self.client.get(f'/api/clients/{self.fiche.id}/commandes/').status_code, 200)
        self.assertEqual(self.client.get(f'/api/clients/{autre.id}/commandes/').status_code, 403)

    def test_un_client_n_accede_pas_a_l_espace_du_personnel(self):
        self.creer_produit()
        jeton = self.connexion_client(telephone=self.TELEPHONE, password=MOT_DE_PASSE_FORT).data['token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jeton}')
        for adresse in ['/api/clients/', '/api/users/', '/api/commandes/']:
            with self.subTest(adresse=adresse):
                self.assertEqual(self.client.get(adresse).status_code, 403)
        self.assertNotIn('cout_achat', self.client.get('/api/products/').data[0])

    def test_le_personnel_conserve_le_mot_de_passe_si_le_champ_est_vide(self):
        self.creer_employe('yao')
        self.se_connecter('yao')
        reponse = self.client.patch(f'/api/clients/{self.fiche.id}/', {'quartier': 'Bè', 'mot_de_passe': ''}, format='json')
        self.assertEqual(reponse.status_code, 200, reponse.content)
        self.assertNotIn('mot_de_passe', reponse.data)
        self.fiche.refresh_from_db()
        self.assertTrue(self.fiche.verifier_mot_de_passe(MOT_DE_PASSE_FORT))


class EnvoiImageTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.media = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.media, ignore_errors=True)
        reglage = override_settings(MEDIA_ROOT=self.media)
        reglage.enable()
        self.addCleanup(reglage.disable)
        self.creer_employe('yao')

    def envoyer(self, nom, contenu):
        return self.client.post('/api/familles/', {
            'nom': 'Famille test', 'code': 'FAM-T', 'image': SimpleUploadedFile(nom, contenu)
        }, format='multipart')

    def fichiers_envoyes(self):
        return [nom for _, _, noms in os.walk(self.media) for nom in noms]

    def test_un_anonyme_ne_peut_rien_envoyer(self):
        self.assertEqual(self.envoyer('x.png', PNG_VALIDE).status_code, 401)
        self.assertEqual(self.fichiers_envoyes(), [])

    def test_les_fichiers_actifs_sont_refuses(self):
        self.se_connecter('yao')
        for nom, contenu in [('x.html', b'<script>alert(1)</script>'),
                             ('x.svg', b'<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>'),
                             ('faux.png', b'<script>alert(1)</script>')]:
            with self.subTest(nom=nom):
                self.assertEqual(self.envoyer(nom, contenu).status_code, 400)
        self.assertEqual(self.fichiers_envoyes(), [])

    def test_une_vraie_image_est_acceptee_et_l_extension_vient_du_contenu(self):
        self.se_connecter('yao')
        reponse = self.envoyer('photo.html', PNG_VALIDE)
        self.assertEqual(reponse.status_code, 201, reponse.content)
        self.assertTrue(reponse.data['image'].endswith('.png'))
        self.assertTrue(all(nom.endswith('.png') for nom in self.fichiers_envoyes()))

    def test_une_image_trop_lourde_est_refusee(self):
        self.se_connecter('yao')
        self.assertEqual(self.envoyer('lourd.png', PNG_VALIDE + b'\x00' * (5 * 1024 * 1024)).status_code, 400)
        self.assertEqual(self.fichiers_envoyes(), [])

    def test_une_grosse_photo_de_famille_est_acceptee(self):
        self.se_connecter('yao')
        reponse = self.envoyer('grosse.png', PNG_VALIDE + b'\x00' * (3 * 1024 * 1024))
        self.assertEqual(reponse.status_code, 201, reponse.content)

    def test_une_famille_refusee_ne_laisse_aucun_fichier(self):
        self.se_connecter('yao')
        Famille.objects.create(nom='Famille test', code='AUTRE')
        self.assertEqual(self.envoyer('photo.png', PNG_VALIDE).status_code, 400)
        self.assertEqual(self.fichiers_envoyes(), [])

    def test_modifier_une_famille_avec_une_photo_garde_le_reste(self):
        self.se_connecter('yao')
        famille = Famille.objects.create(nom='Poisson', code='F-P', description='Du poisson')
        reponse = self.client.patch(f'/api/familles/{famille.id}/', {'image': SimpleUploadedFile('p.png', PNG_VALIDE)}, format='multipart')
        self.assertEqual(reponse.status_code, 200, reponse.content)
        famille.refresh_from_db()
        self.assertTrue(famille.image.endswith('.png'))
        self.assertEqual((famille.nom, famille.description), ('Poisson', 'Du poisson'))


class MigrationMotsDePasseTests(ApiTestCase):
    def appliquer(self):
        module = importlib.import_module('api.migrations.0014_securiser_mots_de_passe')
        module.securiser_mots_de_passe(django_apps, None)

    def test_les_mots_de_passe_clients_sont_haches_et_ceux_par_defaut_retires(self):
        Client.objects.create(nom_complet='A', telephone='1')
        Client.objects.create(nom_complet='B', telephone='2')
        Client.objects.filter(telephone='1').update(mot_de_passe='1234')
        Client.objects.filter(telephone='2').update(mot_de_passe='un-vrai-secret')

        self.appliquer()

        self.assertEqual(Client.objects.get(telephone='1').mot_de_passe, '')
        vrai = Client.objects.get(telephone='2')
        self.assertNotEqual(vrai.mot_de_passe, 'un-vrai-secret')
        self.assertTrue(vrai.verifier_mot_de_passe('un-vrai-secret'))

    def test_une_empreinte_existante_n_est_pas_hachee_deux_fois(self):
        fiche = Client.objects.create(nom_complet='A', telephone='1', mot_de_passe=MOT_DE_PASSE_FORT)
        self.appliquer()
        fiche.refresh_from_db()
        self.assertTrue(fiche.verifier_mot_de_passe(MOT_DE_PASSE_FORT))

    def test_les_mots_de_passe_employes_quittent_le_profil_sans_couper_l_acces(self):
        profil = self.creer_employe('yao', mot_de_passe='1234')
        StaffProfile.objects.filter(pk=profil.pk).update(mot_de_passe='1234')

        self.appliquer()

        profil.refresh_from_db()
        self.assertEqual(profil.mot_de_passe, '')
        self.assertTrue(profil.user.check_password('1234'))

    def test_un_compte_sans_mot_de_passe_exploitable_recupere_celui_du_profil(self):
        profil = self.creer_employe('yao')
        profil.user.set_unusable_password()
        profil.user.save()
        StaffProfile.objects.filter(pk=profil.pk).update(mot_de_passe='ancien-secret')

        self.appliquer()

        self.assertTrue(User.objects.get(pk=profil.user_id).check_password('ancien-secret'))

    def test_les_droits_sont_realignes_sur_les_profils(self):
        ancien_pdg = self.creer_employe('ancien', role='PDG')
        inactif = self.creer_employe('parti')
        StaffProfile.objects.filter(pk=ancien_pdg.pk).update(role='CAISSE')
        StaffProfile.objects.filter(pk=inactif.pk).update(statut='Inactif')

        self.appliquer()

        self.assertFalse(User.objects.get(pk=ancien_pdg.user_id).is_superuser)
        self.assertFalse(User.objects.get(pk=inactif.user_id).is_active)

    def test_un_superutilisateur_sans_profil_n_est_pas_touche(self):
        admin = User.objects.create_superuser('admin', password=MOT_DE_PASSE_FORT)
        self.appliquer()
        admin.refresh_from_db()
        self.assertTrue(admin.is_superuser)
        self.assertTrue(admin.check_password(MOT_DE_PASSE_FORT))


class FamilleApiTests(ApiTestCase):
    def test_le_personnel_garde_la_gestion_du_catalogue(self):
        self.creer_employe('paulin', role='SERVICE_COMMERCIAL')
        self.se_connecter('paulin')
        reponse = self.client.post('/api/familles/', {'nom': 'Volaille', 'code': 'F-1'}, format='json')
        self.assertEqual(reponse.status_code, 201, reponse.content)
        self.assertTrue(Famille.objects.filter(code='F-1').exists())

    def test_une_famille_du_meme_nom_est_refusee_sans_toucher_a_l_existante(self):
        self.creer_employe('yao')
        self.se_connecter('yao')
        existante = Famille.objects.create(nom='POISSON', code='31130', description='Originale', image='/familles/poisson.jpg')
        reponse = self.client.post('/api/familles/', {'nom': 'poisson', 'code': 'F-2', 'description': 'Écrasée', 'image': ''}, format='json')
        self.assertEqual(reponse.status_code, 400, reponse.content)
        self.assertEqual(str(reponse.data['nom'][0]), 'Une famille porte déjà ce nom.')
        existante.refresh_from_db()
        self.assertEqual((existante.description, existante.image), ('Originale', '/familles/poisson.jpg'))
        self.assertEqual(Famille.objects.count(), 1)

    def test_un_code_deja_utilise_est_refuse(self):
        self.creer_employe('yao')
        self.se_connecter('yao')
        Famille.objects.create(nom='Poisson', code='31130')
        reponse = self.client.post('/api/familles/', {'nom': 'Autre', 'code': '31130'}, format='json')
        self.assertEqual(reponse.status_code, 400, reponse.content)
        self.assertEqual(str(reponse.data['code'][0]), 'Ce code est déjà utilisé par une autre famille.')

    def test_une_famille_garde_son_nom_et_son_code_quand_on_la_modifie(self):
        self.creer_employe('yao')
        self.se_connecter('yao')
        famille = Famille.objects.create(nom='Poisson', code='31130')
        reponse = self.client.patch(f'/api/familles/{famille.id}/', {'nom': 'Poisson', 'code': '31130', 'description': 'Frais'}, format='json')
        self.assertEqual(reponse.status_code, 200, reponse.content)

    def test_le_nom_d_une_famille_est_obligatoire(self):
        self.creer_employe('yao')
        self.se_connecter('yao')
        reponse = self.client.post('/api/familles/', {'nom': '   '}, format='json')
        self.assertEqual(reponse.status_code, 400, reponse.content)
        self.assertEqual(str(reponse.data['nom'][0]), 'Saisissez le nom de la famille.')

    def test_le_code_se_cree_seul_et_ne_rentre_jamais_en_conflit(self):
        self.creer_employe('yao')
        self.se_connecter('yao')
        premiere = self.client.post('/api/familles/', {'nom': 'Épices douces'}, format='json')
        seconde = self.client.post('/api/familles/', {'nom': 'Épices fortes'}, format='json')
        self.assertEqual((premiere.status_code, seconde.status_code), (201, 201), seconde.content)
        self.assertNotEqual(premiere.data['code'], seconde.data['code'])
        Famille.objects.get(pk=premiere.data['id']).delete()
        troisieme = self.client.post('/api/familles/', {'nom': 'Épices rares'}, format='json')
        self.assertEqual(troisieme.status_code, 201, troisieme.content)


class TypesStockTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.creer_employe('yao')
        self.se_connecter('yao')

    def test_le_code_se_cree_seul(self):
        reponse = self.client.post('/api/types-stock/', {'nom': 'Chambre froide'}, format='json')
        self.assertEqual(reponse.status_code, 201, reponse.content)
        self.assertTrue(reponse.data['code'])

    def test_un_nom_deja_pris_est_refuse_en_francais(self):
        TypeStock.objects.create(nom='Chambre froide', code='STK-1')
        reponse = self.client.post('/api/types-stock/', {'nom': 'chambre FROIDE'}, format='json')
        self.assertEqual(reponse.status_code, 400, reponse.content)
        self.assertEqual(str(reponse.data['nom'][0]), 'Un type de stock porte déjà ce nom.')

    def test_le_nom_est_obligatoire(self):
        reponse = self.client.post('/api/types-stock/', {'nom': ''}, format='json')
        self.assertEqual(str(reponse.data['nom'][0]), 'Saisissez le nom du type de stock.')

    def test_un_type_se_renomme(self):
        type_stock = TypeStock.objects.create(nom='Réserve', code='STK-1')
        reponse = self.client.patch(f'/api/types-stock/{type_stock.id}/', {'nom': 'Réserve Tokoin', 'description': 'Au siège'}, format='json')
        self.assertEqual(reponse.status_code, 200, reponse.content)
        type_stock.refresh_from_db()
        self.assertEqual((type_stock.nom, type_stock.code), ('Réserve Tokoin', 'STK-1'))

    def test_supprimer_un_type_garde_les_produits(self):
        type_stock = TypeStock.objects.create(nom='Réserve', code='STK-1')
        produit = Product.objects.create(nom='Tilapia', reference='TIL-1', prix_vente=2800, type_stock=type_stock)
        self.assertEqual(self.client.delete(f'/api/types-stock/{type_stock.id}/').status_code, 204)
        produit.refresh_from_db()
        self.assertIsNone(produit.type_stock)


class AjustementStockTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.tokoin = self.creer_boutique('Boutique Tokoin Wuiti')
        self.adidogome = self.creer_boutique('Boutique Adidogomé')
        self.agoe = self.creer_boutique('Boutique Agoè Assiyéyé')
        self.produit = Product.objects.create(nom='Tilapia', reference='TIL-1', prix_vente=2800)
        StockBoutique.objects.create(produit=self.produit, boutique=self.tokoin, quantite=10)
        StockBoutique.objects.create(produit=self.produit, boutique=self.adidogome, quantite=20)
        self.creer_employe('yao')
        self.se_connecter('yao')

    def ajuster(self, *variations):
        lignes = [{'boutique': boutique.id, 'variation': variation} for boutique, variation in variations]
        return self.client.post(f'/api/products/{self.produit.id}/adjust_stock/', {'stocks': lignes}, format='json')

    def stock(self, boutique):
        ligne = StockBoutique.objects.filter(produit=self.produit, boutique=boutique).first()
        return ligne.quantite if ligne else None

    def test_plusieurs_boutiques_s_ajustent_ensemble(self):
        reponse = self.ajuster((self.tokoin, 5), (self.adidogome, -3))
        self.assertEqual(reponse.status_code, 200, reponse.content)
        self.assertEqual((self.stock(self.tokoin), self.stock(self.adidogome)), (15, 17))
        self.assertEqual(reponse.data['stock_total'], 32)
        self.assertEqual(
            sorted((ligne['boutique_nom'], ligne['quantite']) for ligne in reponse.data['stocks']),
            [('Boutique Adidogomé', 17), ('Boutique Tokoin Wuiti', 15)],
        )

    def test_ajuster_une_boutique_ne_touche_pas_aux_autres(self):
        self.assertEqual(self.ajuster((self.adidogome, 4)).status_code, 200)
        self.assertEqual((self.stock(self.tokoin), self.stock(self.adidogome)), (10, 24))

    def test_une_nouvelle_boutique_recoit_son_stock(self):
        self.assertEqual(self.ajuster((self.agoe, 7)).status_code, 200)
        self.assertEqual(self.stock(self.agoe), 7)

    def test_le_stock_ne_descend_jamais_sous_zero(self):
        self.assertEqual(self.ajuster((self.tokoin, -500), (self.agoe, -5)).status_code, 200)
        self.assertEqual((self.stock(self.tokoin), self.stock(self.agoe)), (0, 0))

    def test_une_vente_passee_entre_temps_n_est_pas_effacee(self):
        StockBoutique.objects.filter(produit=self.produit, boutique=self.tokoin).update(quantite=7)  # une vente pendant la saisie
        self.assertEqual(self.ajuster((self.tokoin, 10)).status_code, 200)
        self.assertEqual(self.stock(self.tokoin), 17)

    def test_une_quantite_invalide_est_refusee_sans_rien_changer(self):
        for valeur in ['abc', 1.5, None, True, '']:
            with self.subTest(valeur=valeur):
                reponse = self.ajuster((self.tokoin, 3), (self.adidogome, valeur))
                self.assertEqual(reponse.status_code, 400, reponse.content)
                self.assertEqual(str(reponse.data['detail']), 'Vérifiez les boutiques et les quantités.')
                self.assertEqual((self.stock(self.tokoin), self.stock(self.adidogome)), (10, 20))

    def test_une_quantite_demesuree_est_refusee(self):
        self.assertEqual(self.ajuster((self.tokoin, 10 ** 12)).status_code, 400)
        self.assertEqual(self.stock(self.tokoin), 10)

    def test_le_stock_ne_depasse_pas_la_capacite_de_la_colonne(self):
        StockBoutique.objects.filter(produit=self.produit, boutique=self.tokoin).update(quantite=2147483000)
        self.assertEqual(self.ajuster((self.tokoin, 1000000)).status_code, 200)
        self.assertEqual(self.stock(self.tokoin), 2147483647)

    def test_une_boutique_inconnue_est_refusee(self):
        reponse = self.client.post(f'/api/products/{self.produit.id}/adjust_stock/', {'stocks': [{'boutique': 999999, 'variation': 1}]}, format='json')
        self.assertEqual(reponse.status_code, 400, reponse.content)

    def test_une_demande_vide_est_refusee(self):
        for corps in [{}, {'stocks': []}, {'tokoin': 1}]:
            with self.subTest(corps=corps):
                self.assertEqual(self.client.post(f'/api/products/{self.produit.id}/adjust_stock/', corps, format='json').status_code, 400)

    def test_un_produit_inconnu_renvoie_404(self):
        reponse = self.client.post('/api/products/999999/adjust_stock/', {'stocks': [{'boutique': self.tokoin.id, 'variation': 1}]}, format='json')
        self.assertEqual(reponse.status_code, 404)


class EspacesDeVenteTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.tokoin = self.creer_boutique('Boutique Tokoin Wuiti')
        self.agoe = self.creer_boutique('Boutique Agoè Assiyéyé')
        self.fermee = self.creer_boutique('Boutique Fermée', statut='Fermée')
        self.produit = Product.objects.create(nom='Tilapia', reference='TIL-1', prix_vente=2800)
        StockBoutique.objects.create(produit=self.produit, boutique=self.tokoin, quantite=10)
        StockBoutique.objects.create(produit=self.produit, boutique=self.agoe, quantite=5)
        self.creer_employe('paulin', role='SERVICE_COMMERCIAL')
        self.creer_employe('hugues', role='SUPER_ADMIN')
        self.creer_employe('awa', role='CAISSIERE', boutique=self.tokoin)
        self.creer_employe('kafui', role='CAISSIERE', boutique=self.agoe)
        self.creer_employe('sena', role='CAISSIERE')

    def vendre(self, boutique, quantite=2, reference='VTE-1', total=5600):
        return self.client.post('/api/sales/', {
            'reference': reference, 'boutique': boutique.id, 'total_ttc': total, 'sous_total': total, 'caissier': 'Faux nom',
            'items': [{'produit': self.produit.id, 'nom_produit': 'Tilapia', 'prix_unitaire': 2800, 'quantite': quantite, 'total_ligne': total}],
        }, format='json')

    def stock(self, boutique):
        return StockBoutique.objects.get(produit=self.produit, boutique=boutique).quantite

    def espaces(self):
        reponse = self.client.get('/api/boutiques/espaces-de-vente/')
        self.assertEqual(reponse.status_code, 200, reponse.content)
        return reponse.data

    def test_une_vente_retire_le_stock_de_sa_boutique_seulement(self):
        self.se_connecter('paulin')
        reponse = self.vendre(self.agoe)
        self.assertEqual(reponse.status_code, 201, reponse.content)
        self.assertEqual((self.stock(self.agoe), self.stock(self.tokoin)), (3, 10))
        self.assertEqual(reponse.data['boutique_nom'], 'Boutique Agoè Assiyéyé')
        self.assertEqual(self.vendre(self.tokoin, quantite=1, reference='VTE-2').status_code, 201)
        self.assertEqual((self.stock(self.agoe), self.stock(self.tokoin)), (3, 9))

    def test_le_caissier_enregistre_est_celui_qui_est_connecte(self):
        self.se_connecter('awa')
        self.assertEqual(self.vendre(self.tokoin).data['caissier'], 'Awa Test')

    def test_une_vente_ne_fait_pas_passer_le_stock_sous_zero(self):
        self.se_connecter('paulin')
        self.assertEqual(self.vendre(self.agoe, quantite=50).status_code, 201)
        self.assertEqual(self.stock(self.agoe), 0)

    def test_une_vente_sans_boutique_ou_dans_une_boutique_fermee_est_refusee(self):
        self.se_connecter('paulin')
        sans_boutique = self.client.post('/api/sales/', {'reference': 'VTE-X'}, format='json')
        self.assertEqual(sans_boutique.status_code, 400, sans_boutique.content)
        self.assertEqual(str(sans_boutique.data['boutique'][0]), 'Choisissez la boutique de la vente.')
        fermee = self.vendre(self.fermee)
        self.assertEqual(fermee.status_code, 400, fermee.content)
        self.assertEqual(str(fermee.data['boutique'][0]), "Cette boutique n'est pas ouverte à la vente.")
        self.assertFalse(Sale.objects.exists())

    def test_une_caissiere_ne_vend_que_dans_sa_boutique(self):
        self.se_connecter('awa')
        reponse = self.vendre(self.agoe)
        self.assertEqual(reponse.status_code, 403, reponse.content)
        self.assertIn('Boutique Tokoin Wuiti', str(reponse.data['detail']))
        self.assertFalse(Sale.objects.exists())
        self.assertEqual(self.stock(self.agoe), 5)
        self.assertEqual(self.vendre(self.tokoin).status_code, 201)

    def test_une_caissiere_ne_voit_que_les_ventes_de_sa_boutique(self):
        self.se_connecter('paulin')
        self.vendre(self.tokoin, reference='VTE-T')
        self.vendre(self.agoe, reference='VTE-A')
        self.se_deconnecter()
        self.se_connecter('awa')
        ventes = self.client.get('/api/sales/').data
        self.assertEqual([vente['reference'] for vente in ventes], ['VTE-T'])
        demande_ailleurs = self.client.get(f'/api/sales/?boutique={self.agoe.id}').data
        self.assertEqual(demande_ailleurs, [])
        vente_agoe = Sale.objects.get(reference='VTE-A')
        self.assertEqual(self.client.get(f'/api/sales/{vente_agoe.id}/').status_code, 404)
        self.assertEqual(self.client.delete(f'/api/sales/{vente_agoe.id}/').status_code, 403)

    def test_chaque_espace_a_ses_propres_ventes(self):
        self.se_connecter('paulin')
        self.vendre(self.tokoin, reference='VTE-T')
        self.vendre(self.agoe, reference='VTE-A')
        ventes = self.client.get(f'/api/sales/?boutique={self.agoe.id}').data
        self.assertEqual([vente['reference'] for vente in ventes], ['VTE-A'])
        self.assertEqual(len(self.client.get('/api/sales/').data), 2)

    def test_la_direction_voit_tous_les_espaces_ouverts_avec_leurs_chiffres_du_jour(self):
        self.se_connecter('paulin')
        self.vendre(self.tokoin, reference='VTE-1', total=5600)
        self.vendre(self.tokoin, reference='VTE-2', total=1000)
        hier = self.vendre(self.tokoin, reference='VTE-3', total=9000)
        Sale.objects.filter(pk=hier.data['id']).update(date_vente=timezone.now() - timedelta(days=1))
        StockBoutique.objects.filter(boutique=self.agoe).update(quantite=0)
        espaces = {espace['id']: espace for espace in self.espaces()}
        self.assertEqual(set(espaces), {self.tokoin.id, self.agoe.id})
        self.assertEqual((espaces[self.tokoin.id]['ventes_du_jour'], espaces[self.tokoin.id]['tickets_du_jour']), (6600, 2))
        self.assertEqual(espaces[self.tokoin.id]['produits_en_stock'], 1)
        self.assertEqual((espaces[self.agoe.id]['ventes_du_jour'], espaces[self.agoe.id]['tickets_du_jour'], espaces[self.agoe.id]['produits_en_stock']), (0, 0, 0))

    def test_une_caissiere_n_a_que_son_espace(self):
        self.se_connecter('awa')
        self.assertEqual([espace['id'] for espace in self.espaces()], [self.tokoin.id])

    def test_une_caissiere_sans_boutique_ne_peut_pas_vendre(self):
        self.se_connecter('sena')
        self.assertEqual(self.espaces(), [])
        reponse = self.vendre(self.agoe)
        self.assertEqual(reponse.status_code, 403, reponse.content)
        self.assertIn('Aucune boutique', str(reponse.data['detail']))
        self.assertEqual(self.client.get('/api/sales/').data, [])

    def test_les_espaces_sont_reserves_au_personnel(self):
        self.assertEqual(self.client.get('/api/boutiques/espaces-de-vente/').status_code, 401)

    def test_une_boutique_avec_du_stock_ne_peut_pas_etre_supprimee(self):
        self.se_connecter('hugues')
        reponse = self.client.delete(f'/api/boutiques/{self.agoe.id}/')
        self.assertEqual(reponse.status_code, 400, reponse.content)
        self.assertIn('encore 5', str(reponse.data['detail']))
        self.assertTrue(Boutique.objects.filter(pk=self.agoe.pk).exists())

    def test_une_boutique_avec_des_ventes_ne_peut_pas_etre_supprimee(self):
        self.se_connecter('hugues')
        self.vendre(self.agoe)
        StockBoutique.objects.filter(boutique=self.agoe).update(quantite=0)
        reponse = self.client.delete(f'/api/boutiques/{self.agoe.id}/')
        self.assertEqual(reponse.status_code, 400, reponse.content)
        self.assertIn('Fermée', str(reponse.data['detail']))
        self.assertTrue(Boutique.objects.filter(pk=self.agoe.pk).exists())

    def test_une_boutique_vide_peut_etre_supprimee(self):
        self.se_connecter('hugues')
        StockBoutique.objects.filter(boutique=self.agoe).update(quantite=0)
        self.assertEqual(self.client.delete(f'/api/boutiques/{self.agoe.id}/').status_code, 204)
        self.assertFalse(StockBoutique.objects.filter(boutique_id=self.agoe.id).exists())


class MigrationStocksTests(TransactionTestCase):
    AVANT = [('api', '0016_reprendre_images_produits')]
    APRES = [('api', '0025_reafficher_produits_masques')]

    def migrer(self, cible):
        executeur = MigrationExecutor(connection)
        executeur.loader.build_graph()
        executeur.migrate(cible)
        return MigrationExecutor(connection).loader.project_state(cible).apps

    def tearDown(self):
        self.migrer(self.APRES)

    def test_les_stocks_existants_sont_repris_sans_perte(self):
        anciens = self.migrer(self.AVANT)
        Boutique_ = anciens.get_model('api', 'Boutique')
        Product_ = anciens.get_model('api', 'Product')
        tokoin = Boutique_.objects.create(nom='Boutique Tokoin Wuiti', code='BQT-TOK-01', telephone='1', localisation='Lomé')
        Boutique_.objects.create(nom='Boutique Agoè', code='BQT-AGO-01', telephone='1', localisation='Lomé')
        produit = Product_.objects.create(nom='Tilapia', reference='TIL-1', prix_vente=2800, stock_tokoin=83, stock_adidogome=60)

        nouveaux = self.migrer(self.APRES)
        lignes = nouveaux.get_model('api', 'StockBoutique').objects.filter(produit_id=produit.id)
        self.assertEqual(lignes.get(boutique_id=tokoin.id).quantite, 83)
        self.assertEqual(lignes.get(boutique__nom__icontains='Adidogom').quantite, 60)  # boutique créée si elle manque
        self.assertEqual(lignes.count(), 2)

    def test_les_ventes_existantes_sont_rattachees_a_leur_boutique(self):
        anciens = self.migrer([('api', '0018_retirer_colonnes_stock')])
        Boutique_ = anciens.get_model('api', 'Boutique')
        Sale_ = anciens.get_model('api', 'Sale')
        tokoin = Boutique_.objects.create(nom='Boutique Tokoin Wuiti', code='BQT-TOK-01', telephone='1', localisation='Lomé')
        Sale_.objects.create(reference='V-1', boutique='Tokoin Wuiti')
        Sale_.objects.create(reference='V-2', boutique='Boutique disparue')

        nouveaux = self.migrer(self.APRES)
        Sale_ = nouveaux.get_model('api', 'Sale')
        vente = Sale_.objects.get(reference='V-1')
        self.assertEqual((vente.boutique_id, vente.boutique_nom), (tokoin.id, 'Tokoin Wuiti'))
        orpheline = Sale_.objects.get(reference='V-2')
        self.assertEqual((orpheline.boutique_id, orpheline.boutique_nom), (None, 'Boutique disparue'))

    def test_les_comptes_passent_aux_quatre_roles_sans_perdre_leur_boutique(self):
        anciens = self.migrer([('api', '0019_ventes_par_boutique')])
        Boutique_ = anciens.get_model('api', 'Boutique')
        Profil = anciens.get_model('api', 'StaffProfile')
        tokoin = Boutique_.objects.create(nom='Boutique Tokoin Wuiti', code='BQT-TOK-01', telephone='1', localisation='Lomé')
        for nom, role, boutique in [('a', 'PDG', 'Siège'), ('b', 'DG', 'Siège'), ('c', 'DAF', 'Siège'), ('d', 'COMPTABILITE', 'Siège'), ('e', 'SECRETARIAT', 'Siège'),
                                    ('f', 'SERVICE_COMMERCIAL', 'Toutes'), ('g', 'CAISSE', 'Boutique Tokoin Wuiti'), ('h', 'CAISSE', 'Tokoin Wuiti'), ('i', 'CAISSE', 'Siège'), ('j', 'INCONNU', 'Siège')]:
            Profil.objects.create(nom_complet=nom, username=nom, role=role, boutique=boutique, statut='En congé' if nom == 'j' else 'Actif')

        nouveaux = self.migrer(self.APRES)
        Profil = nouveaux.get_model('api', 'StaffProfile')
        attendu = {'a': 'SUPER_ADMIN', 'b': 'SUPER_ADMIN', 'c': 'CONTROLEUR', 'd': 'CONTROLEUR', 'e': 'CONTROLEUR',
                   'f': 'SERVICE_COMMERCIAL', 'g': 'CAISSIERE', 'h': 'CAISSIERE', 'i': 'CAISSIERE', 'j': 'CONTROLEUR'}
        self.assertEqual(dict(Profil.objects.values_list('username', 'role')), attendu)
        self.assertEqual(Profil.objects.get(username='g').boutique_id, tokoin.id)
        self.assertEqual(Profil.objects.get(username='h').boutique_id, tokoin.id)
        self.assertIsNone(Profil.objects.get(username='i').boutique_id)
        self.assertIsNone(Profil.objects.get(username='a').boutique_id)
        self.assertEqual(Profil.objects.get(username='j').statut, 'Actif')

    def test_les_ventes_passees_entrent_au_journal(self):
        anciens = self.migrer([('api', '0019_ventes_par_boutique')])
        tokoin = anciens.get_model('api', 'Boutique').objects.create(nom='Boutique Tokoin Wuiti', code='BQT-TOK-01', telephone='1', localisation='Lomé')
        vente = anciens.get_model('api', 'Sale').objects.create(reference='V-9', boutique=tokoin, boutique_nom='Tokoin Wuiti', caissier='Yao')
        anciens.get_model('api', 'SaleItem').objects.create(vente=vente, nom_produit='Tilapia', prix_unitaire=2800, quantite=2, total_ligne=5600)
        nouveaux = self.migrer(self.APRES)
        mouvement = nouveaux.get_model('api', 'Mouvement').objects.get(reference='V-9')
        self.assertEqual((mouvement.type, mouvement.boutique_id, mouvement.utilisateur_nom, mouvement.produit_nom, mouvement.quantite, mouvement.montant),
                         ('VENTE', tokoin.id, 'Yao', 'Tilapia', -2, 5600))
        self.assertEqual(mouvement.date, vente.date_vente)

    def test_un_retour_arriere_restitue_les_colonnes(self):
        anciens = self.migrer(self.AVANT)
        produit = anciens.get_model('api', 'Product').objects.create(nom='Tilapia', reference='TIL-2', prix_vente=2800, stock_tokoin=7, stock_adidogome=9)
        self.migrer(self.APRES)
        anciens = self.migrer(self.AVANT)
        restaure = anciens.get_model('api', 'Product').objects.get(pk=produit.pk)
        self.assertEqual((restaure.stock_tokoin, restaure.stock_adidogome), (7, 9))


class ProduitsTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.media = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.media, ignore_errors=True)
        reglage = override_settings(MEDIA_ROOT=self.media)
        reglage.enable()
        self.addCleanup(reglage.disable)
        self.famille = Famille.objects.create(nom='POISSON', code='31130')
        self.creer_employe('paulin', role='SERVICE_COMMERCIAL')
        self.se_connecter('paulin')

    def photo(self, nom='photo.png', contenu=PNG_VALIDE):
        return SimpleUploadedFile(nom, contenu, content_type='image/png')

    def creer(self, **champs):
        corps = {'nom': 'Tilapia', 'famille': self.famille.id, 'prix_vente': 2800, 'unite': 'kg', **champs}
        return self.client.post('/api/products/', corps, format='multipart')

    def modifier(self, produit_id, **champs):
        return self.client.patch(f'/api/products/{produit_id}/', champs, format='multipart')

    def fichiers(self):
        return [nom for _, _, noms in os.walk(self.media) for nom in noms]

    def test_un_produit_sans_famille_est_refuse(self):
        reponse = self.client.post('/api/products/', {'nom': 'Tilapia', 'prix_vente': 2800}, format='multipart')
        self.assertEqual(reponse.status_code, 400)
        self.assertEqual(reponse.data['famille'], ["Choisissez la famille du produit."])
        self.assertFalse(Product.objects.exists())

    def test_on_ne_peut_pas_retirer_la_famille_d_un_produit(self):
        produit_id = self.creer().data['id']
        self.assertEqual(self.modifier(produit_id, famille='').status_code, 400)
        reponse = self.client.patch(f'/api/products/{produit_id}/', {'famille': None}, format='json')
        self.assertEqual(reponse.status_code, 400)
        self.assertEqual(Product.objects.get(pk=produit_id).famille, self.famille)

    def test_une_famille_utilisee_ne_peut_pas_etre_supprimee(self):
        self.creer()
        reponse = self.client.delete(f'/api/familles/{self.famille.id}/')
        self.assertEqual(reponse.status_code, 400)
        self.assertIn('1 produit', reponse.data['detail'])
        self.assertTrue(Famille.objects.filter(pk=self.famille.id).exists())

    def test_une_famille_vide_peut_etre_supprimee(self):
        self.assertEqual(self.client.delete(f'/api/familles/{self.famille.id}/').status_code, 204)

    def test_creation_avec_plusieurs_photos(self):
        reponse = self.creer(nouvelles_photos=[self.photo('a.png'), self.photo('b.png')])
        self.assertEqual(reponse.status_code, 201, reponse.content)
        self.assertEqual(len(reponse.data['photos']), 2)
        self.assertEqual(reponse.data['image'], reponse.data['photos'][0]['image'])
        self.assertEqual(len(self.fichiers()), 2)

    def test_un_produit_cree_depuis_le_formulaire_est_visible_sur_le_site(self):
        # Le formulaire envoie un multipart sans is_active : le produit ne doit pas naître masqué.
        for reponse in (self.creer(), self.creer(nom='Capitaine', nouvelles_photos=[self.photo()])):
            self.assertEqual(reponse.status_code, 201, reponse.content)
            self.assertTrue(reponse.data['is_active'])
            self.assertTrue(Product.objects.get(pk=reponse.data['id']).is_active)
        self.assertEqual([p['nom'] for p in self.client.get('/api/products/').data if p['is_active']], ['Capitaine', 'Tilapia'])

    def test_un_produit_masque_expres_reste_masque(self):
        reponse = self.creer(is_active='false')
        self.assertEqual(reponse.status_code, 201, reponse.content)
        self.assertFalse(Product.objects.get(pk=reponse.data['id']).is_active)

    def test_modifier_un_produit_ne_change_pas_sa_visibilite(self):
        produit_id = self.creer().data['id']
        Product.objects.filter(pk=produit_id).update(is_active=False)
        self.assertEqual(self.modifier(produit_id, prix_vente=3000).status_code, 200)
        self.assertFalse(Product.objects.get(pk=produit_id).is_active)
        Product.objects.filter(pk=produit_id).update(is_active=True)
        self.assertEqual(self.modifier(produit_id, nouvelles_photos=[self.photo()]).status_code, 200)
        self.assertTrue(Product.objects.get(pk=produit_id).is_active)

    def test_sans_photo_le_produit_n_impose_aucune_image(self):
        reponse = self.creer()
        self.assertEqual(reponse.status_code, 201, reponse.content)
        self.assertEqual(reponse.data['image'], '')
        self.assertEqual(reponse.data['photos'], [])

    def test_la_reference_est_creee_si_elle_reste_vide(self):
        premiere = self.creer(reference='').data['reference']
        seconde = self.creer(nom='Capitaine').data['reference']
        self.assertTrue(premiere.startswith('HST-'))
        self.assertNotEqual(premiere, seconde)

    def test_une_reference_en_double_est_expliquee(self):
        self.creer(reference='HST-TIL-001')
        reponse = self.creer(nom='Autre', reference='HST-TIL-001')
        self.assertEqual(reponse.status_code, 400)
        self.assertIn('déjà utilisée', reponse.data['reference'][0])

    def test_le_prix_est_obligatoire_et_positif(self):
        for prix in ['', '0', '-5']:
            with self.subTest(prix=prix):
                self.assertEqual(self.creer(prix_vente=prix).status_code, 400)

    def stocks_saisis(self, *lignes):
        return json.dumps([{'boutique': boutique.id, 'quantite': quantite} for boutique, quantite in lignes])

    def test_le_stock_ne_peut_pas_etre_negatif(self):
        boutique = self.creer_boutique('Boutique Tokoin Wuiti')
        reponse = self.creer(stocks=self.stocks_saisis((boutique, -1)))
        self.assertEqual(reponse.status_code, 400)
        self.assertEqual(str(reponse.data['stocks']), 'Vérifiez les boutiques et les quantités.')
        self.assertFalse(Product.objects.exists())

    def test_un_produit_se_cree_dans_plusieurs_boutiques(self):
        tokoin = self.creer_boutique('Boutique Tokoin Wuiti')
        agoe = self.creer_boutique('Boutique Agoè Assiyéyé')
        reponse = self.creer(stocks=self.stocks_saisis((tokoin, 12), (agoe, 3)))
        self.assertEqual(reponse.status_code, 201, reponse.content)
        self.assertEqual(reponse.data['stock_total'], 15)
        self.assertEqual(
            sorted((ligne['boutique'], ligne['quantite']) for ligne in reponse.data['stocks']),
            sorted([(tokoin.id, 12), (agoe.id, 3)]),
        )

    def test_un_produit_sans_boutique_n_a_aucun_stock(self):
        reponse = self.creer()
        self.assertEqual(reponse.status_code, 201, reponse.content)
        self.assertEqual((reponse.data['stocks'], reponse.data['stock_total'], reponse.data['statut_stock']), ([], 0, 'Rupture'))

    def test_une_boutique_fermee_ne_recoit_pas_de_stock(self):
        fermee = self.creer_boutique('Boutique Fermée', statut='Fermée')
        reponse = self.creer(stocks=self.stocks_saisis((fermee, 5)))
        self.assertEqual(reponse.status_code, 400, reponse.content)
        self.assertFalse(Product.objects.exists())

    def test_des_stocks_illisibles_sont_refuses(self):
        for valeur in ['pas du json', '{"boutique": 1}', '[{"boutique": 999999, "quantite": 1}]']:
            with self.subTest(valeur=valeur):
                reponse = self.creer(stocks=valeur)
                self.assertEqual(reponse.status_code, 400, reponse.content)
        self.assertFalse(Product.objects.exists())

    def test_la_description_et_le_prix_de_gros_s_enregistrent(self):
        reponse = self.creer(description='Chair ferme', prix_gros=26000)
        self.assertEqual(reponse.status_code, 201, reponse.content)
        self.assertEqual((reponse.data['description'], reponse.data['prix_gros']), ('Chair ferme', 26000))

    def test_un_prix_de_gros_vide_reste_vide(self):
        reponse = self.creer(prix_gros='')
        self.assertEqual(reponse.status_code, 201, reponse.content)
        self.assertIsNone(reponse.data['prix_gros'])

    def test_le_seuil_d_alerte_decide_du_stock_faible(self):
        tokoin = self.creer_boutique('Boutique Tokoin Wuiti')
        agoe = self.creer_boutique('Boutique Agoè Assiyéyé')
        reponse = self.creer(stocks=self.stocks_saisis((tokoin, 15), (agoe, 5)), seuil_alerte=25)
        self.assertEqual(reponse.status_code, 201, reponse.content)
        self.assertEqual(reponse.data['statut_stock'], 'Faible')

    def test_les_nombres_invalides_sont_refuses_en_francais(self):
        for champ, valeur, message in [
            ('prix_vente', '99999999999', 'Ce prix est trop grand.'),
            ('prix_gros', '0', 'Le prix de gros doit être supérieur à 0.'),
            ('prix_gros', 'abc', 'Le prix de gros doit être un nombre entier.'),
            ('seuil_alerte', '-1', "Le seuil d'alerte ne peut pas être négatif."),
            ('seuil_alerte', '1.5', "Le seuil d'alerte doit être un nombre entier."),
        ]:
            with self.subTest(champ=champ, valeur=valeur):
                reponse = self.creer(**{champ: valeur})
                self.assertEqual(reponse.status_code, 400, reponse.content)
                self.assertEqual(str(reponse.data[champ][0]), message)
        self.assertFalse(Product.objects.exists())

    def test_une_photo_refusee_ne_laisse_ni_produit_ni_fichier(self):
        reponse = self.creer(nouvelles_photos=[self.photo('ok.png'), self.photo('x.html', b'<script>alert(1)</script>')])
        self.assertEqual(reponse.status_code, 400)
        self.assertIn('image', reponse.data)
        self.assertFalse(Product.objects.exists())
        self.assertEqual(self.fichiers(), [])

    def test_le_nombre_de_photos_est_limite(self):
        reponse = self.creer(nouvelles_photos=[self.photo(f'{i}.png') for i in range(6)])
        self.assertEqual(reponse.status_code, 400)
        self.assertFalse(Product.objects.exists())
        self.assertEqual(self.fichiers(), [])

    def test_modifier_un_produit_conserve_le_stock_de_chaque_boutique(self):
        tokoin = self.creer_boutique('Boutique Tokoin Wuiti')
        agoe = self.creer_boutique('Boutique Agoè Assiyéyé')
        produit_id = self.creer(stocks=self.stocks_saisis((tokoin, 20), (agoe, 8))).data['id']
        self.assertEqual(self.modifier(produit_id, nom='Tilapia entier').status_code, 200)
        stocks = StockBoutique.objects.filter(produit_id=produit_id)
        self.assertEqual((stocks.get(boutique=tokoin).quantite, stocks.get(boutique=agoe).quantite), (20, 8))

    def test_modifier_ajoute_et_retire_des_photos(self):
        cree = self.creer(nouvelles_photos=[self.photo('a.png'), self.photo('b.png')]).data
        premiere, seconde = cree['photos']

        reponse = self.modifier(cree['id'], nouvelles_photos=[self.photo('c.png')], photos_a_supprimer=[premiere['id']])

        self.assertEqual(reponse.status_code, 200, reponse.content)
        self.assertEqual(len(reponse.data['photos']), 2)
        self.assertEqual(reponse.data['photos'][0]['id'], seconde['id'])
        self.assertEqual(reponse.data['image'], seconde['image'])
        self.assertEqual(len(self.fichiers()), 2)
        self.assertNotIn(os.path.basename(premiere['image']), self.fichiers())

    def test_retirer_toutes_les_photos_revient_a_l_image_de_la_famille(self):
        cree = self.creer(nouvelles_photos=[self.photo()]).data
        reponse = self.modifier(cree['id'], photos_a_supprimer=[cree['photos'][0]['id']])
        self.assertEqual(reponse.data['image'], '')
        self.assertEqual(self.fichiers(), [])

    def test_la_limite_compte_les_photos_retirees(self):
        cree = self.creer(nouvelles_photos=[self.photo(f'{i}.png') for i in range(5)]).data
        self.assertEqual(self.modifier(cree['id'], nouvelles_photos=[self.photo()]).status_code, 400)
        self.assertEqual(len(self.fichiers()), 5)
        reponse = self.modifier(cree['id'], nouvelles_photos=[self.photo()], photos_a_supprimer=[cree['photos'][0]['id']])
        self.assertEqual(reponse.status_code, 200, reponse.content)
        self.assertEqual(len(reponse.data['photos']), 5)

    def test_une_modification_refusee_ne_touche_pas_aux_photos(self):
        cree = self.creer(nouvelles_photos=[self.photo()]).data
        reponse = self.modifier(cree['id'], prix_vente='0', photos_a_supprimer=[cree['photos'][0]['id']])
        self.assertEqual(reponse.status_code, 400)
        self.assertEqual(len(self.fichiers()), 1)
        self.assertEqual(ProductImage.objects.count(), 1)

    def test_on_ne_peut_pas_supprimer_la_photo_d_un_autre_produit(self):
        autre = self.creer(nom='Autre', nouvelles_photos=[self.photo()]).data
        produit_id = self.creer().data['id']
        self.assertEqual(self.modifier(produit_id, photos_a_supprimer=[autre['photos'][0]['id']]).status_code, 200)
        self.assertEqual(ProductImage.objects.filter(produit_id=autre['id']).count(), 1)

    def test_un_identifiant_de_photo_invalide_ne_plante_pas(self):
        produit_id = self.creer().data['id']
        self.assertEqual(self.modifier(produit_id, photos_a_supprimer=['abc']).status_code, 200)

    def test_supprimer_un_produit_supprime_ses_fichiers(self):
        cree = self.creer(nouvelles_photos=[self.photo('a.png'), self.photo('b.png')]).data
        self.assertEqual(self.client.delete(f"/api/products/{cree['id']}/").status_code, 204)
        self.assertEqual(self.fichiers(), [])

    def test_la_photo_principale_ne_se_choisit_pas_directement(self):
        produit_id = self.creer().data['id']
        self.client.patch(f'/api/products/{produit_id}/', {'image': '/pirate.jpg'}, format='json')
        self.assertEqual(Product.objects.get(pk=produit_id).image, '')

    def test_un_anonyme_ne_peut_pas_enregistrer_de_produit(self):
        self.se_deconnecter()
        self.assertEqual(self.creer(nouvelles_photos=[self.photo()]).status_code, 401)
        self.assertEqual(self.fichiers(), [])

    def test_le_site_public_recoit_les_photos(self):
        self.creer(nouvelles_photos=[self.photo()])
        self.se_deconnecter()
        reponse = self.client.get('/api/products/')
        self.assertEqual(len(reponse.data[0]['photos']), 1)

    def test_la_migration_retire_l_image_de_poisson_et_garde_les_vraies_images(self):
        poisson = Product.objects.create(nom='A', reference='A', prix_vente=1, famille=self.famille)
        vraie = Product.objects.create(nom='B', reference='B', prix_vente=1, famille=self.famille)
        Product.objects.filter(pk=poisson.pk).update(image='/heistal_fish.jpg')
        Product.objects.filter(pk=vraie.pk).update(image='/media/ancienne.jpg')

        importlib.import_module('api.migrations.0016_reprendre_images_produits').reprendre_images(django_apps, None)

        self.assertEqual(Product.objects.get(pk=poisson.pk).image, '')
        self.assertEqual(ProductImage.objects.get(produit=vraie).image, '/media/ancienne.jpg')


class TelephonesTests(ApiTestCase):
    def test_un_meme_numero_ecrit_de_plusieurs_facons(self):
        for ecriture in ['+228 90 12 34 56', '90123456', '00228 90-12-34-56', '228 90 12 34 56', ' 90.12.34.56 ']:
            with self.subTest(ecriture=ecriture):
                self.assertEqual(normaliser_telephone(ecriture), '90123456')
                self.assertEqual(formater_telephone(ecriture), '+228 90 12 34 56')

    def test_un_numero_etranger_garde_son_indicatif(self):
        self.assertEqual(formater_telephone('+229 97 00 00 00'), '+22997000000')

    def test_le_numero_masque_ne_montre_que_la_fin(self):
        self.assertEqual(masquer_telephone('+228 90 12 34 56'), '•• •• 34 56')
        self.assertEqual(masquer_telephone(''), '')


class CommandesTests(ApiTestCase):
    """Commander avec ou sans compte, retrouver sa commande par son code, l'encaisser en boutique."""
    CODE = r'^[A-HJKMNP-Z2-9]{3}-[A-HJKMNP-Z2-9]{3}$'

    def setUp(self):
        super().setUp()
        self.tokoin = self.creer_boutique('Boutique Tokoin Wuiti')
        self.agoe = self.creer_boutique('Boutique Agoè Assiyéyé')
        self.siege = Boutique.objects.create(nom='Siège Direction Heistal', telephone='1', localisation='Lomé', is_siege=True)
        self.fermee = self.creer_boutique('Boutique Fermée', statut='Fermée')
        self.tilapia = Product.objects.create(nom='Tilapia', reference='TIL-1', prix_vente=2800, unite='kg')
        self.frites = Product.objects.create(nom='Frites', reference='FRI-1', prix_vente=3800, unite='sachet')
        self.retire = Product.objects.create(nom='Ancien produit', reference='OLD-1', prix_vente=1000, is_active=False)
        for produit, quantite in [(self.tilapia, 10), (self.frites, 4), (self.retire, 9)]:
            StockBoutique.objects.create(produit=produit, boutique=self.tokoin, quantite=quantite)
        StockBoutique.objects.create(produit=self.tilapia, boutique=self.agoe, quantite=1)
        self.creer_employe('paulin', role='SERVICE_COMMERCIAL')
        self.creer_employe('awa', role='CAISSIERE', boutique=self.tokoin)
        self.creer_employe('kafui', role='CAISSIERE', boutique=self.agoe)
        self.creer_employe('ines', role='CONTROLEUR')

    # --- outils
    def commander(self, items=None, boutique=None, **champs):
        corps = {
            'client_nom': 'Ama Sandra', 'client_telephone': '90 12 34 56', 'boutique': (boutique or self.tokoin).id,
            'items': items if items is not None else [{'produit': self.tilapia.id, 'quantite': 2}, {'produit': self.frites.id, 'quantite': 1}],
            **champs,
        }
        return self.client.post('/api/commandes/', corps, format='json')

    def commande_passee(self, **champs):
        reponse = self.commander(**champs)
        self.assertEqual(reponse.status_code, 201, reponse.content)
        return CommandeDirecte.objects.get(numero_commande=reponse.data['code'])

    def stock(self, produit, boutique=None):
        return StockBoutique.objects.get(produit=produit, boutique=boutique or self.tokoin).quantite

    def encaisser(self, commande, mode='Espèces'):
        return self.client.post(f'/api/commandes/{commande.id}/encaisser/', {'mode_paiement': mode}, format='json')

    def suivre(self, *codes):
        return self.client.get('/api/commandes/suivi/', {'codes': ','.join(codes)})

    # --- commander sans compte
    def test_une_commande_sans_compte_recoit_un_code_et_le_prix_du_catalogue(self):
        reponse = self.commander(total=1, items=[
            {'produit': self.tilapia.id, 'quantite': 2, 'prix_unitaire': 1}, {'produit': self.frites.id, 'quantite': 1, 'total_ligne': 1},
        ])
        self.assertEqual(reponse.status_code, 201, reponse.content)
        self.assertRegex(reponse.data['code'], self.CODE)
        self.assertEqual(reponse.data['total'], 2 * 2800 + 3800)
        self.assertEqual(reponse.data['statut'], 'EN_ATTENTE')
        self.assertEqual(reponse.data['boutique']['nom'], 'Boutique Tokoin Wuiti')
        self.assertEqual(reponse.data['client_telephone'], '+228 90 12 34 56')
        commande = CommandeDirecte.objects.get(numero_commande=reponse.data['code'])
        self.assertEqual(commande.boutique, self.tokoin)
        self.assertEqual(sorted(commande.items.values_list('nom_produit', 'prix_unitaire', 'quantite', 'total_ligne')),
                         [('Frites', 3800, 1, 3800), ('Tilapia', 2800, 2, 5600)])
        self.assertEqual(commande.client.telephone, '+228 90 12 34 56')
        self.assertEqual(self.stock(self.tilapia), 10)  # le stock ne bouge qu'au retrait

    def test_deux_commandes_n_ont_jamais_le_meme_code(self):
        codes = {self.commander(items=[{'produit': self.tilapia.id, 'quantite': 1}]).data['code'] for _ in range(15)}
        self.assertEqual(len(codes), 15)

    def test_la_meme_personne_garde_une_seule_fiche_quel_que_soit_l_ecriture_du_numero(self):
        self.commande_passee(client_telephone='90123456')
        self.commande_passee(client_telephone='+228 90-12-34-56')
        self.assertEqual(Client.objects.filter(telephone_normalise='90123456').count(), 1)
        self.assertEqual(Client.objects.get(telephone_normalise='90123456').commandes.count(), 2)

    def test_le_visiteur_ne_choisit_ni_statut_ni_code_ni_client(self):
        autre = Client.objects.create(nom_complet='Koffi', telephone='+228 91 00 00 00')
        reponse = self.commander(statut='RECUPEREE', numero_commande='AAA-AAA', code='AAA-AAA', client=autre.id, vente=1)
        self.assertEqual(reponse.status_code, 201, reponse.content)
        commande = CommandeDirecte.objects.get(numero_commande=reponse.data['code'])
        self.assertNotEqual(commande.numero_commande, 'AAA-AAA')
        self.assertEqual((commande.statut, commande.vente_id), ('EN_ATTENTE', None))
        self.assertNotEqual(commande.client_id, autre.id)

    def test_les_commandes_refusees_n_enregistrent_rien(self):
        cas = {
            'panier vide': dict(items=[]),
            'produit inconnu': dict(items=[{'produit': 99999, 'quantite': 1}]),
            'produit retiré': dict(items=[{'produit': self.retire.id, 'quantite': 1}]),
            'quantité nulle': dict(items=[{'produit': self.tilapia.id, 'quantite': 0}]),
            'quantité énorme': dict(items=[{'produit': self.tilapia.id, 'quantite': 1000}]),
            'quantité décimale': dict(items=[{'produit': self.tilapia.id, 'quantite': 2.5}]),
            'quantité texte': dict(items=[{'produit': self.tilapia.id, 'quantite': 'deux'}]),
            'siège': dict(boutique=self.siege),
            'boutique fermée': dict(boutique=self.fermee),
            'sans nom': dict(client_nom='  '),
            'numéro trop court': dict(client_telephone='91919'),
            'numéro absent': dict(client_telephone=''),
        }
        for nom, champs in cas.items():
            with self.subTest(nom):
                reponse = self.commander(**champs)
                self.assertEqual(reponse.status_code, 400, reponse.content)
        self.assertEqual(CommandeDirecte.objects.count(), 0)
        self.assertEqual(CommandeItem.objects.count(), 0)

    def test_on_ne_commande_ni_au_siege_ni_dans_une_boutique_fermee_meme_avec_du_stock(self):
        for boutique in [self.siege, self.fermee]:
            StockBoutique.objects.create(produit=self.tilapia, boutique=boutique, quantite=50)
            with self.subTest(boutique=boutique.nom):
                reponse = self.commander(boutique=boutique, items=[{'produit': self.tilapia.id, 'quantite': 1}])
                self.assertEqual(reponse.status_code, 400)
                self.assertIn('boutique', reponse.data)
        self.assertEqual(CommandeDirecte.objects.count(), 0)

    def test_on_ne_commande_pas_plus_que_le_stock_de_la_boutique(self):
        reponse = self.commander(items=[{'produit': self.frites.id, 'quantite': 3}, {'produit': self.frites.id, 'quantite': 2}])
        self.assertEqual(reponse.status_code, 400)
        self.assertIn('Frites (il en reste 4)', str(reponse.data['items']))
        reponse = self.commander(boutique=self.agoe, items=[{'produit': self.tilapia.id, 'quantite': 2}])
        self.assertIn('Boutique Agoè Assiyéyé', str(reponse.data['items']))
        self.assertEqual(CommandeDirecte.objects.count(), 0)
        # Deux lignes du même produit s'additionnent.
        commande = self.commande_passee(items=[{'produit': self.frites.id, 'quantite': 3}, {'produit': self.frites.id, 'quantite': 1}])
        self.assertEqual(list(commande.items.values_list('quantite', flat=True)), [4])

    # --- commander avec un compte
    def creer_compte(self, telephone='+228 93 00 00 01', nom='Koffi Mensah'):
        fiche = Client.objects.create(nom_complet=nom, telephone=telephone, mot_de_passe=MOT_DE_PASSE_FORT)
        jeton = self.client.post('/api/clients/login/', {'telephone': telephone, 'password': MOT_DE_PASSE_FORT}, format='json').data['token']
        return fiche, jeton

    def test_connecte_la_commande_est_au_nom_du_compte(self):
        fiche, jeton = self.creer_compte()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jeton}')
        reponse = self.commander(client_nom='Quelqu’un d’autre', client_telephone='90 00 00 00')
        self.assertEqual(reponse.status_code, 201, reponse.content)
        commande = CommandeDirecte.objects.get(numero_commande=reponse.data['code'])
        self.assertEqual((commande.client_id, commande.client_nom, commande.client_telephone), (fiche.id, 'Koffi Mensah', '+228 93 00 00 01'))

    def test_connecte_le_nom_et_le_numero_ne_sont_pas_demandes(self):
        _, jeton = self.creer_compte()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jeton}')
        self.assertEqual(self.commander(client_nom='', client_telephone='').status_code, 201)

    def test_un_employe_connecte_commande_comme_un_visiteur(self):
        self.se_connecter('paulin')
        commande = self.commande_passee()
        self.assertEqual(commande.client_nom, 'Ama Sandra')

    # --- retrouver sa commande avec le code
    def test_le_code_se_tape_comme_on_veut(self):
        code = self.commande_passee().numero_commande
        for ecriture in [code, code.lower(), code.replace('-', ''), f'  {code[:3]} {code[4:]}  '.lower()]:
            with self.subTest(ecriture=ecriture):
                reponse = self.suivre(ecriture)
                self.assertEqual(reponse.status_code, 200)
                self.assertEqual([c['code'] for c in reponse.data], [code])

    def test_le_suivi_par_code_cache_le_nom_complet_et_le_numero(self):
        code = self.commande_passee().numero_commande
        commande = self.suivre(code).data[0]
        self.assertEqual(commande['client_nom'], 'Ama S.')
        self.assertEqual(commande['client_telephone'], '•• •• 34 56')
        self.assertNotIn('90 12', json.dumps(commande, ensure_ascii=False))
        self.assertEqual(commande['total'], 9400)
        self.assertEqual([ligne['nom_produit'] for ligne in commande['items']], ['Tilapia', 'Frites'])
        self.assertEqual(commande['items'][0]['unite'], 'kg')
        self.assertNotIn('notes', commande)

    def test_le_suivi_de_plusieurs_codes_ignore_les_codes_inconnus(self):
        premier = self.commande_passee().numero_commande
        second = self.commande_passee(items=[{'produit': self.frites.id, 'quantite': 1}]).numero_commande
        reponse = self.suivre(second, 'ZZZ-ZZZ', premier, 'n importe quoi')
        self.assertEqual([c['code'] for c in reponse.data], [second, premier])
        self.assertEqual(self.suivre('').data, [])

    def test_le_suivi_fonctionne_meme_avec_une_session_perimee(self):
        code = self.commande_passee().numero_commande
        self.client.credentials(HTTP_AUTHORIZATION='Bearer jeton-perime')
        self.assertEqual(self.suivre(code).status_code, 200)

    def test_un_ancien_numero_de_commande_se_retrouve_aussi(self):
        CommandeDirecte.objects.create(numero_commande='CMD-261023-547', client_nom='Ama', client_telephone='', boutique=self.tokoin)
        self.assertEqual(len(self.suivre('cmd-261023-547').data), 1)

    def test_une_commande_non_retiree_en_24_heures_expire(self):
        commande = self.commande_passee()
        CommandeDirecte.objects.filter(pk=commande.pk).update(date_expiration=timezone.now() - timedelta(minutes=1))
        self.assertEqual(self.suivre(commande.numero_commande).data[0]['statut'], 'EXPIREE')

    # --- en boutique : taper le code
    def test_en_boutique_le_code_affiche_toute_la_commande(self):
        code = self.commande_passee().numero_commande
        self.se_connecter('awa')
        reponse = self.client.get(f'/api/commandes/code/{code.lower().replace("-", "")}/')
        self.assertEqual(reponse.status_code, 200, reponse.content)
        self.assertEqual((reponse.data['code'], reponse.data['client_nom'], reponse.data['client_telephone']), (code, 'Ama Sandra', '+228 90 12 34 56'))
        self.assertEqual(reponse.data['boutique_info']['nom'], 'Boutique Tokoin Wuiti')
        self.assertEqual(len(reponse.data['items']), 2)

    def test_un_code_inconnu_est_explique(self):
        self.se_connecter('awa')
        reponse = self.client.get('/api/commandes/code/ZZZ-ZZZ/')
        self.assertEqual(reponse.status_code, 404)
        self.assertIn('Aucune commande', reponse.data['detail'])

    def test_seul_le_personnel_affiche_une_commande_par_son_code(self):
        code = self.commande_passee().numero_commande
        self.assertEqual(self.client.get(f'/api/commandes/code/{code}/').status_code, 401)
        _, jeton = self.creer_compte()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jeton}')
        self.assertEqual(self.client.get(f'/api/commandes/code/{code}/').status_code, 403)

    # --- en boutique : encaisser la commande
    def test_encaisser_cree_la_vente_retire_le_stock_et_clot_la_commande(self):
        commande = self.commande_passee()
        self.se_connecter('awa')
        reponse = self.encaisser(commande, 'TMoney')
        self.assertEqual(reponse.status_code, 200, reponse.content)
        self.assertEqual(reponse.data['statut'], 'RECUPEREE')
        self.assertEqual(reponse.data['vente_reference'], f'VTE-{commande.numero_commande}')

        vente = Sale.objects.get(reference=f'VTE-{commande.numero_commande}')
        self.assertEqual((vente.boutique, vente.total_ttc, vente.mode_paiement, vente.caissier), (self.tokoin, 9400, 'TMoney', 'Awa Test'))
        self.assertEqual(sorted(vente.items.values_list('nom_produit', 'total_ligne')), [('Frites', 3800), ('Tilapia', 5600)])
        self.assertEqual((self.stock(self.tilapia), self.stock(self.frites)), (8, 3))
        self.assertEqual(self.stock(self.tilapia, self.agoe), 1)
        mouvements = Mouvement.objects.filter(type=Mouvement.VENTE, reference=vente.reference)
        self.assertEqual(sorted(mouvements.values_list('quantite', 'stock_apres')), [(-2, 8), (-1, 3)])

        commande.refresh_from_db()
        self.assertEqual((commande.statut, commande.vente_id), ('RECUPEREE', vente.id))
        self.assertIsNotNone(commande.date_retrait)
        espace = next(e for e in self.client.get('/api/boutiques/espaces-de-vente/').data if e['id'] == self.tokoin.id)
        self.assertEqual(espace['ventes_du_jour'], 9400)

    def test_une_commande_ne_s_encaisse_qu_une_fois(self):
        commande = self.commande_passee()
        self.se_connecter('awa')
        self.assertEqual(self.encaisser(commande).status_code, 200)
        reponse = self.encaisser(commande)
        self.assertEqual(reponse.status_code, 400)
        self.assertIn('déjà été remise', reponse.data['detail'])
        self.assertEqual(Sale.objects.count(), 1)
        self.assertEqual(self.stock(self.tilapia), 8)

    def test_la_caissiere_d_une_autre_boutique_ne_l_encaisse_pas(self):
        commande = self.commande_passee()
        self.se_connecter('kafui')
        reponse = self.encaisser(commande)
        self.assertEqual(reponse.status_code, 403)
        self.assertIn('Boutique Tokoin Wuiti', reponse.data['detail'])
        commande.refresh_from_db()
        self.assertEqual((commande.statut, Sale.objects.count(), self.stock(self.tilapia)), ('EN_ATTENTE', 0, 10))

    def test_qui_peut_encaisser(self):
        commande = self.commande_passee()
        self.assertEqual(self.encaisser(commande).status_code, 401)
        self.se_connecter('ines')
        self.assertEqual(self.encaisser(commande).status_code, 403)
        self.se_connecter('paulin')
        self.assertEqual(self.encaisser(commande).status_code, 200)

    def test_les_encaissements_refuses(self):
        self.se_connecter('awa')
        annulee = self.commande_passee(items=[{'produit': self.tilapia.id, 'quantite': 1}])
        annulee.statut = 'ANNULEE'
        annulee.save()
        self.assertIn('annulée', self.encaisser(annulee).data['detail'])
        sans_mode = self.commande_passee(items=[{'produit': self.tilapia.id, 'quantite': 1}])
        self.assertEqual(self.encaisser(sans_mode, mode='').status_code, 400)
        self.assertEqual(self.encaisser(sans_mode, mode='Bitcoin').status_code, 400)
        self.assertEqual(Sale.objects.count(), 0)

    def test_une_commande_expiree_s_encaisse_encore(self):
        commande = self.commande_passee()
        CommandeDirecte.objects.filter(pk=commande.pk).update(statut='EXPIREE')
        self.se_connecter('awa')
        self.assertEqual(self.encaisser(commande).status_code, 200)

    def test_le_stock_ne_passe_jamais_sous_zero(self):
        commande = self.commande_passee()
        StockBoutique.objects.filter(produit=self.tilapia, boutique=self.tokoin).update(quantite=1)
        self.se_connecter('awa')
        self.assertEqual(self.encaisser(commande).status_code, 200)
        self.assertEqual(self.stock(self.tilapia), 0)

    def test_une_commande_encaissee_ne_change_plus_de_statut(self):
        commande = self.commande_passee()
        self.se_connecter('paulin')
        self.encaisser(commande)
        reponse = self.client.post(f'/api/commandes/{commande.id}/changer_statut/', {'statut': 'ANNULEE'}, format='json')
        self.assertEqual(reponse.status_code, 400)
        commande.refresh_from_db()
        self.assertEqual(commande.statut, 'RECUPEREE')

    # --- l'espace client
    def inscrire(self, **champs):
        return self.client.post('/api/clients/register/', {
            'nom_complet': 'Ama Sandra', 'telephone': '+228 90 12 34 56', 'mot_de_passe': AUTRE_MOT_DE_PASSE_FORT, **champs
        }, format='json')

    def test_un_nouveau_client_cree_son_compte_et_le_retrouve(self):
        reponse = self.inscrire()
        self.assertEqual(reponse.status_code, 201, reponse.content)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {reponse.data["token"]}')
        moi = self.client.get('/api/clients/moi/')
        self.assertEqual(moi.status_code, 200)
        self.assertEqual((moi.data['client']['nom_complet'], moi.data['commandes']), ('Ama Sandra', []))

    def test_apres_une_commande_sans_compte_il_faut_son_code_pour_creer_le_compte(self):
        code = self.commande_passee().numero_commande
        fiche = Client.objects.get(telephone_normalise='90123456')

        reponse = self.inscrire(telephone='90123456')
        self.assertEqual(reponse.status_code, 409)
        self.assertTrue(reponse.data['besoin_code'])
        self.assertEqual(self.inscrire(code_commande='ZZZ-ZZZ').status_code, 400)
        autre = self.commande_passee(client_telephone='91 00 00 00').numero_commande
        self.assertEqual(self.inscrire(code_commande=autre).status_code, 400)
        fiche.refresh_from_db()
        self.assertFalse(fiche.a_un_compte)

        reponse = self.inscrire(code_commande=code.lower().replace('-', ' '))
        self.assertEqual(reponse.status_code, 201, reponse.content)
        self.assertEqual(reponse.data['client']['id'], fiche.id)  # la fiche existante devient le compte
        self.assertEqual(Client.objects.filter(telephone_normalise='90123456').count(), 1)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {reponse.data["token"]}')
        self.assertEqual([c['code'] for c in self.client.get('/api/clients/moi/').data['commandes']], [code])

    def test_une_fiche_sans_commande_devient_un_compte_sans_code(self):
        fiche = Client.objects.create(nom_complet='Ama', telephone='+228 90 12 34 56')
        reponse = self.inscrire()
        self.assertEqual(reponse.status_code, 201, reponse.content)
        self.assertEqual(reponse.data['client']['id'], fiche.id)

    def test_un_numero_desactive_ne_cree_pas_de_compte(self):
        Client.objects.create(nom_complet='Ama', telephone='+228 90 12 34 56', est_actif=False)
        self.assertEqual(self.inscrire().status_code, 403)

    def test_l_inscription_refuse_un_numero_invalide(self):
        self.assertEqual(self.inscrire(telephone='1234').status_code, 400)
        self.assertFalse(Client.objects.exists())

    def test_on_se_connecte_avec_son_numero_ecrit_autrement(self):
        self.creer_compte(telephone='+228 93 00 00 01')
        for ecriture in ['93000001', '93 00 00 01', '0022893000001']:
            with self.subTest(ecriture=ecriture):
                reponse = self.client.post('/api/clients/login/', {'telephone': ecriture, 'password': MOT_DE_PASSE_FORT}, format='json')
                self.assertEqual(reponse.status_code, 200, reponse.content)
                self.assertNotIn('notes', reponse.data['client'])

    def test_avec_deux_fiches_pour_un_numero_on_se_connecte_au_compte(self):
        Client.objects.create(nom_complet='Ama (fiche boutique)', telephone='91 22 33 44')
        Client.objects.create(nom_complet='Ama Sandra', telephone='+228 91 22 33 44', mot_de_passe=MOT_DE_PASSE_FORT)
        reponse = self.client.post('/api/clients/login/', {'telephone': '91223344', 'password': MOT_DE_PASSE_FORT}, format='json')
        self.assertEqual(reponse.status_code, 200, reponse.content)
        self.assertEqual(reponse.data['client']['nom_complet'], 'Ama Sandra')

    def test_mes_commandes_montre_tout_ce_qui_a_ete_commande_avec_mon_numero_et_rien_d_autre(self):
        ancienne = Client.objects.create(nom_complet='Koffi (fiche boutique)', telephone='93 00 00 01')
        sans_compte = CommandeDirecte.objects.create(client=ancienne, client_nom='Koffi', client_telephone='93 00 00 01', boutique=self.tokoin)
        self.commande_passee(client_telephone='91 00 00 00')
        _, jeton = self.creer_compte(telephone='+228 93 00 00 01')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jeton}')
        avec_compte = self.commander().data['code']
        moi = self.client.get('/api/clients/moi/').data
        self.assertEqual([c['code'] for c in moi['commandes']], [avec_compte, sans_compte.numero_commande])
        self.assertEqual(moi['commandes'][0]['client_telephone'], '+228 93 00 00 01')  # son propre numéro, en entier

    def test_l_espace_client_est_reserve_au_client_connecte(self):
        self.assertEqual(self.client.get('/api/clients/moi/').status_code, 401)
        self.se_connecter('paulin')
        self.assertEqual(self.client.get('/api/clients/moi/').status_code, 403)

    # --- boutiques de retrait
    def test_le_site_public_voit_les_boutiques_de_retrait_ouvertes(self):
        self.client.credentials(HTTP_AUTHORIZATION='Bearer jeton-perime')
        reponse = self.client.get('/api/boutiques/retrait/')
        self.assertEqual(reponse.status_code, 200)
        self.assertEqual([b['nom'] for b in reponse.data], ['Boutique Agoè Assiyéyé', 'Boutique Tokoin Wuiti'])
        self.assertNotIn('responsable', reponse.data[0])


class MigrationCommandesTests(TransactionTestCase):
    AVANT = [('api', '0022_commandes_par_code')]
    APRES = [('api', '0025_reafficher_produits_masques')]

    def migrer(self, cible):
        executeur = MigrationExecutor(connection)
        executeur.loader.build_graph()
        executeur.migrate(cible)
        return MigrationExecutor(connection).loader.project_state(cible).apps

    def tearDown(self):
        self.migrer(self.APRES)

    def test_les_commandes_existantes_retrouvent_leur_boutique_et_leur_numero(self):
        anciens = self.migrer(self.AVANT)
        Boutique_ = anciens.get_model('api', 'Boutique')
        Commande_ = anciens.get_model('api', 'CommandeDirecte')
        Client_ = anciens.get_model('api', 'Client')
        tokoin = Boutique_.objects.create(nom='Boutique Tokoin Wuiti', code='BQT-TOK-01', telephone='1', localisation='Lomé')
        adidogome = Boutique_.objects.create(nom='Boutique Adidogomé', code='BQT-ADI-01', telephone='1', localisation='Lomé')
        Client_.objects.create(nom_complet='Ama', telephone='+228 91 22 33 44')
        for numero, texte in [('CMD-1', 'Boutique Tokoin Wuiti (CEG)'), ('CMD-2', 'Boutique Adidogome (Grand Lomé)'), ('CMD-3', 'Boutique disparue')]:
            Commande_.objects.create(numero_commande=numero, client_nom='Ama', client_telephone='91 22 33 44', boutique_retrait=texte)

        nouveaux = self.migrer(self.APRES)
        Commande_ = nouveaux.get_model('api', 'CommandeDirecte')
        self.assertEqual(dict(Commande_.objects.values_list('numero_commande', 'boutique_id')), {'CMD-1': tokoin.id, 'CMD-2': adidogome.id, 'CMD-3': None})
        self.assertEqual(set(Commande_.objects.values_list('telephone_normalise', flat=True)), {'91223344'})
        self.assertEqual(nouveaux.get_model('api', 'Client').objects.get().telephone_normalise, '91223344')


class MigrationProduitsMasquesTests(TransactionTestCase):
    AVANT = [('api', '0024_visites_du_site')]
    APRES = [('api', '0025_reafficher_produits_masques')]

    def migrer(self, cible):
        executeur = MigrationExecutor(connection)
        executeur.loader.build_graph()
        executeur.migrate(cible)
        return MigrationExecutor(connection).loader.project_state(cible).apps

    def tearDown(self):
        self.migrer(self.APRES)

    def test_les_produits_masques_par_le_formulaire_reapparaissent(self):
        anciens = self.migrer(self.AVANT)
        Famille_ = anciens.get_model('api', 'Famille')
        Produit_ = anciens.get_model('api', 'Product')
        legumes = Famille_.objects.create(nom='LEGUMES', code='31140')
        Produit_.objects.create(nom='tomate', reference='HST-E70F22', famille=legumes, prix_vente=2333, is_active=False)
        Produit_.objects.create(nom='Frites', reference='HST-FRI-001', famille=legumes, prix_vente=3800, is_active=True)

        nouveaux = self.migrer(self.APRES)
        produits = nouveaux.get_model('api', 'Product').objects.values_list('nom', 'is_active')
        self.assertEqual(sorted(produits), [('Frites', True), ('tomate', True)])


NAVIGATEUR = 'Mozilla/5.0 (Linux; Android 13; CUBOT X20 PRO) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36'
MERCREDI = date(2026, 11, 11)  # les semaines vont du lundi 9 au dimanche 15


def le(jour, heure=10):
    return datetime(jour.year, jour.month, jour.day, heure, tzinfo=dt_timezone.utc)


class VisitesTests(ApiTestCase):
    def visiter(self, visiteur='a1b2c3d4-0000-4000-8000-000000000001', agent=NAVIGATEUR, **extra):
        return self.client.post('/api/visites/', {'visiteur': visiteur}, format='json', HTTP_USER_AGENT=agent, **extra)

    def test_un_visiteur_compte_une_fois_par_jour_et_ses_pages_s_additionnent(self):
        for _ in range(3):
            self.assertEqual(self.visiter().status_code, 204)
        self.visiter(visiteur='a1b2c3d4-0000-4000-8000-000000000002')
        self.assertEqual(Visite.objects.count(), 2)
        self.assertEqual(Visite.objects.get(visiteur__endswith='01').pages_vues, 3)

    def test_les_robots_et_les_identifiants_invalides_ne_comptent_pas(self):
        for agent in ['Mozilla/5.0 (compatible; Googlebot/2.1)', 'Mozilla/5.0 (compatible; bingbot/2.0;)', 'Mozilla/5.0 HeadlessChrome/120', '']:
            with self.subTest(agent=agent):
                self.assertEqual(self.visiter(agent=agent).status_code, 204)
        for visiteur in ['', 'court', 'x' * 65, "a1b2c3d4'; drop"]:
            with self.subTest(visiteur=visiteur):
                self.assertEqual(self.visiter(visiteur=visiteur).status_code, 400)
        self.assertFalse(Visite.objects.exists())

    def test_une_session_perimee_n_empeche_pas_de_compter(self):
        self.assertEqual(self.visiter(HTTP_AUTHORIZATION='Bearer jeton-perime').status_code, 204)
        self.assertEqual(Visite.objects.count(), 1)

    def test_le_visiteur_ne_choisit_pas_son_jour_ni_ses_pages(self):
        self.client.post('/api/visites/', {'visiteur': 'a1b2c3d4-0000-4000-8000-000000000009', 'jour': '2020-01-01', 'pages_vues': 999},
                         format='json', HTTP_USER_AGENT=NAVIGATEUR)
        visite = Visite.objects.get()
        self.assertEqual((visite.jour, visite.pages_vues), (timezone.localdate(), 1))


@mock.patch('api.statistiques.timezone.localdate', return_value=MERCREDI)
class StatistiquesTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.tokoin = self.creer_boutique('Boutique Tokoin Wuiti')
        self.agoe = self.creer_boutique('Boutique Agoè Assiyéyé')
        self.fermee = self.creer_boutique('Boutique Fermée', statut='Fermée')
        self.siege = Boutique.objects.create(nom='Siège Direction Heistal', telephone='1', localisation='Lomé', is_siege=True)
        self.tilapia = Product.objects.create(nom='Tilapia', reference='TIL-1', prix_vente=2800, unite='kg')
        self.frites = Product.objects.create(nom='Frites', reference='FRI-1', prix_vente=3800, unite='sachet')
        self.nuggets = Product.objects.create(nom='Nuggets', reference='NUG-1', prix_vente=3200, unite='sachet')
        StockBoutique.objects.create(produit=self.tilapia, boutique=self.tokoin, quantite=40)
        StockBoutique.objects.create(produit=self.nuggets, boutique=self.tokoin, quantite=7)
        StockBoutique.objects.create(produit=self.frites, boutique=self.agoe, quantite=0)
        self.creer_employe('paulin', role='SERVICE_COMMERCIAL')
        self.creer_employe('ines', role='CONTROLEUR')
        self.creer_employe('awa', role='CAISSIERE', boutique=self.tokoin)

    def visites(self, jour, *visiteurs):
        for visiteur in visiteurs:
            Visite.objects.create(jour=jour, visiteur=f'visiteur-{visiteur:04d}', pages_vues=2)

    def commande(self, jour, statut='EN_ATTENTE', boutique=None):
        commande = CommandeDirecte.objects.create(client_nom='Ama', client_telephone='90 00 00 01', boutique=boutique or self.tokoin, statut=statut)
        CommandeDirecte.objects.filter(pk=commande.pk).update(date_commande=le(jour))
        return commande

    def vente(self, boutique, jour, lignes, reference):
        vente = Sale.objects.create(reference=reference, boutique=boutique, boutique_nom=boutique.nom,
                                    total_ttc=sum(montant for _, _, _, montant in lignes))
        Sale.objects.filter(pk=vente.pk).update(date_vente=le(jour))
        for produit, nom, quantite, montant in lignes:
            SaleItem.objects.create(vente=vente, produit=produit, nom_produit=nom, prix_unitaire=0, quantite=quantite, total_ligne=montant)
        return vente

    def frequentation(self):
        self.se_connecter('paulin')
        reponse = self.client.get('/api/statistiques/frequentation/')
        self.assertEqual(reponse.status_code, 200, reponse.content)
        return reponse.data

    def test_visiteurs_par_jour_et_par_semaine_sans_double_compte(self, _date):
        lundi, mardi = date(2026, 11, 9), date(2026, 11, 10)
        self.visites(MERCREDI, 1, 2, 3)
        self.visites(mardi, 1, 4)
        self.visites(lundi, 5)
        self.visites(date(2026, 11, 8), 1, 6, 7)  # dimanche : semaine dernière
        self.visites(date(2026, 11, 2), 6)       # lundi de la semaine dernière
        donnees = self.frequentation()
        self.assertEqual(donnees['visiteurs'], {'aujourdhui': 3, 'hier': 2, 'semaine': 5, 'semaine_derniere': 3, 'pages_vues_aujourdhui': 6})
        self.assertEqual(len(donnees['jours']), 14)
        self.assertEqual(donnees['jours'][-1]['date'], MERCREDI)
        self.assertEqual([j['visiteurs'] for j in donnees['jours'][-4:]], [3, 1, 2, 3])
        self.assertEqual(len(donnees['semaines']), 8)
        self.assertEqual((donnees['semaines'][-1]['debut'], donnees['semaines'][-1]['fin']), (lundi, MERCREDI))
        self.assertEqual([s['visiteurs'] for s in donnees['semaines'][-2:]], [3, 5])

    def test_commandes_par_jour_et_par_semaine(self, _date):
        self.commande(MERCREDI)
        self.commande(MERCREDI, statut='PRETE')
        self.commande(date(2026, 11, 10), statut='RECUPEREE')
        self.commande(date(2026, 11, 3), statut='EXPIREE')
        self.commande(date(2026, 10, 1), statut='ANNULEE')
        donnees = self.frequentation()
        self.assertEqual(donnees['commandes'], {'aujourdhui': 2, 'hier': 1, 'semaine': 3, 'semaine_derniere': 1, 'a_retirer': 2})
        self.assertEqual([j['commandes'] for j in donnees['jours'][-2:]], [1, 2])
        self.assertEqual([s['commandes'] for s in donnees['semaines'][-2:]], [1, 3])

    def boutiques(self, periode='semaine'):
        self.se_connecter('paulin')
        reponse = self.client.get('/api/statistiques/boutiques/', {'periode': periode})
        self.assertEqual(reponse.status_code, 200, reponse.content)
        return {b['nom']: b for b in reponse.data['boutiques']}

    def test_ventes_de_chaque_boutique_produit_par_produit(self, _date):
        self.vente(self.tokoin, MERCREDI, [(self.tilapia, 'Tilapia', 2.5, 7000), (self.frites, 'Frites', 1, 3800)], 'V-1')
        self.vente(self.tokoin, date(2026, 11, 9), [(self.tilapia, 'Tilapia', 1, 2800), (None, 'Ancien produit', 2, 1000)], 'V-2')
        self.vente(self.agoe, date(2026, 11, 2), [(self.frites, 'Frites', 4, 15200)], 'V-3')  # semaine dernière
        self.commande(MERCREDI)
        self.commande(date(2026, 11, 10), statut='RECUPEREE')
        boutiques = self.boutiques()

        self.assertEqual(list(boutiques), ['Boutique Agoè Assiyéyé', 'Boutique Tokoin Wuiti'])  # ni le siège, ni la boutique fermée
        tokoin = boutiques['Boutique Tokoin Wuiti']
        self.assertEqual((tokoin['ventes'], tokoin['tickets'], tokoin['commandes'], tokoin['commandes_a_retirer']), (14600, 2, 2, 1))
        self.assertEqual(
            [(p['nom'], p['quantite'], p['montant'], p['stock']) for p in tokoin['produits']],
            [('Tilapia', 3.5, 9800, 40), ('Frites', 1.0, 3800, None), ('Ancien produit', 2.0, 1000, None), ('Nuggets', 0, 0, 7)],
        )
        agoe = boutiques['Boutique Agoè Assiyéyé']
        self.assertEqual((agoe['ventes'], agoe['tickets'], agoe['produits']), (0, 0, []))

    def test_la_periode_change_les_chiffres(self, _date):
        self.vente(self.tokoin, MERCREDI, [(self.tilapia, 'Tilapia', 1, 2800)], 'V-1')
        self.vente(self.tokoin, date(2026, 11, 9), [(self.tilapia, 'Tilapia', 1, 2800)], 'V-2')
        self.vente(self.tokoin, date(2026, 11, 2), [(self.tilapia, 'Tilapia', 1, 2800)], 'V-3')
        self.vente(self.tokoin, date(2026, 10, 30), [(self.tilapia, 'Tilapia', 1, 2800)], 'V-4')
        attendu = {'jour': 1, 'semaine': 2, 'mois': 3}
        for periode, tickets in attendu.items():
            with self.subTest(periode=periode):
                self.assertEqual(self.boutiques(periode)['Boutique Tokoin Wuiti']['tickets'], tickets)
        self.assertEqual(self.client.get('/api/statistiques/boutiques/', {'periode': 'annee'}).status_code, 400)

    def test_une_boutique_fermee_qui_a_vendu_reste_visible(self, _date):
        self.vente(self.fermee, MERCREDI, [(self.tilapia, 'Tilapia', 1, 2800)], 'V-1')
        self.assertIn('Boutique Fermée', self.boutiques())

    def test_qui_voit_le_tableau_de_bord(self, _date):
        adresses = ['/api/statistiques/frequentation/', '/api/statistiques/boutiques/']
        for adresse in adresses:
            self.assertEqual(self.client.get(adresse).status_code, 401)
        self.se_connecter('awa')
        for adresse in adresses:
            self.assertEqual(self.client.get(adresse).status_code, 403)
        self.se_connecter('ines')
        for adresse in adresses:
            self.assertEqual(self.client.get(adresse).status_code, 200)
        fiche = Client.objects.create(nom_complet='Koffi', telephone='+228 93 00 00 01', mot_de_passe=MOT_DE_PASSE_FORT)
        jeton = self.client.post('/api/clients/login/', {'telephone': fiche.telephone, 'password': MOT_DE_PASSE_FORT}, format='json').data['token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jeton}')
        for adresse in adresses:
            self.assertEqual(self.client.get(adresse).status_code, 403)
