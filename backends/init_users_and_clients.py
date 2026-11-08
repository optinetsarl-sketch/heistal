import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from api.models import StaffProfile, Client, CommandeDirecte, Boutique

print("=== 1. CRÉATION DU SUPERUTILISATEUR DJANGO ADMIN ===")
admin_user, created = User.objects.get_or_create(username='admin')
admin_user.set_password('admin123')
admin_user.email = 'admin@heistal-togo.tg'
admin_user.is_staff = True
admin_user.is_superuser = True
admin_user.first_name = 'Super'
admin_user.last_name = 'Admin'
admin_user.save()
print(f"Super-administrateur 'admin' (mot de passe: 'admin123'): {'créé' if created else 'mis à jour'}")


print("\n=== 2. NETTOYAGE DES PROFILS DE TEST INUTILES ===")
# Nettoyer profils tests
for dummy_name in ['gggggg', 'kkkkkkk']:
    deleted, _ = StaffProfile.objects.filter(nom_complet__icontains=dummy_name).delete()
    if deleted:
        print(f"Profil test '{dummy_name}' supprimé.")

# Nettoyer les doublons
akossiwa_qs = StaffProfile.objects.filter(nom_complet='Akossiwa Tossou').order_by('id')
if akossiwa_qs.count() > 1:
    akossiwa_qs.exclude(id=akossiwa_qs.first().id).delete()
    print("Doublon Akossiwa Tossou nettoyé.")


print("\n=== 3. INITIALISATION DE LA BASE DES UTILISATEURS COLLABORATEURS / ADMIN ===")
OFFICIAL_STAFF = [
    {
        'matricule': 'HST-PDG-001',
        'nom_complet': 'Hugues Wilson',
        'username': 'hugues',
        'mot_de_passe': '1234',
        'email': 'hugues.wilson@heistal-togo.tg',
        'telephone': '+228 90 01 02 03',
        'role': 'PDG',
        'departement': 'DIRECTION',
        'service_rattache': 'DIRECTION_GENERALE',
        'boutique': 'Siège',
        'statut': 'Actif',
        'niveau_acces': 'ADMIN_TOTAL',
        'avatar': 'HW',
        'missions': "Président-Directeur Général. Orientation stratégique, investissements, partenariats et pilotage global."
    },
    {
        'matricule': 'HST-DG-002',
        'nom_complet': 'David Mensah',
        'username': 'david',
        'mot_de_passe': '1234',
        'email': 'david.mensah@heistal-togo.tg',
        'telephone': '+228 91 12 13 14',
        'role': 'DG',
        'departement': 'DIRECTION',
        'service_rattache': 'DIRECTION_GENERALE',
        'boutique': 'Siège',
        'statut': 'Actif',
        'niveau_acces': 'ADMIN_TOTAL',
        'avatar': 'DM',
        'missions': "Direction générale et coordination des activités. Exécution opérationnelle et coordination Secrétariat, DAF et Service Commercial."
    },
    {
        'matricule': 'HST-SEC-003',
        'nom_complet': 'Afi Mawuena',
        'username': 'afi',
        'mot_de_passe': '1234',
        'email': 'afi.mawuena@heistal-togo.tg',
        'telephone': '+228 92 23 24 25',
        'role': 'SECRETARIAT',
        'departement': 'SECRETARIAT',
        'service_rattache': 'SECRETARIAT_APPUI',
        'boutique': 'Siège',
        'statut': 'Actif',
        'niveau_acces': 'ADMINISTRATIF',
        'avatar': 'AM',
        'missions': "Appui administratif à la direction. Correspondances officielles, accueil protocolaire, tenue des registres et archivage."
    },
    {
        'matricule': 'HST-DAF-004',
        'nom_complet': 'Kodjo Agbeko',
        'username': 'kodjo',
        'mot_de_passe': '1234',
        'email': 'kodjo.agbeko@heistal-togo.tg',
        'telephone': '+228 93 34 35 36',
        'role': 'DAF',
        'departement': 'DAF',
        'service_rattache': 'DAF_FINANCES',
        'boutique': 'Siège',
        'statut': 'Actif',
        'niveau_acces': 'GESTION_FINANCIERE',
        'avatar': 'KA',
        'missions': "Direction administrative et financière. Trésorerie, déclarations fiscales, budgets et supervision Comptabilité/Caisse."
    },
    {
        'matricule': 'HST-CPT-005',
        'nom_complet': 'Sylvie Lawson',
        'username': 'sylvie',
        'mot_de_passe': '1234',
        'email': 'sylvie.lawson@heistal-togo.tg',
        'telephone': '+228 94 45 46 47',
        'role': 'COMPTABILITE',
        'departement': 'DAF',
        'service_rattache': 'COMPTABILITE',
        'boutique': 'Siège',
        'statut': 'Actif',
        'niveau_acces': 'GESTION_FINANCIERE',
        'avatar': 'SL',
        'missions': "Saisie, contrôle, rapprochements et états financiers. Factures fournisseurs, gestion des créances et bilans."
    },
    {
        'matricule': 'HST-COM-006',
        'nom_complet': 'Paulin Dossou',
        'username': 'paulin',
        'mot_de_passe': '1234',
        'email': 'paulin.dossou@heistal-togo.tg',
        'telephone': '+228 96 67 68 69',
        'role': 'SERVICE_COMMERCIAL',
        'departement': 'COMMERCIAL',
        'service_rattache': 'SERVICE_COMMERCIAL',
        'boutique': 'Siège',
        'statut': 'Actif',
        'niveau_acces': 'GESTION_COMMERCIALE',
        'avatar': 'PD',
        'missions': "Ventes et suivi des boutiques. Stratégie commerciale surgelés, partenariats B2B, suivi des objectifs et animation de réseau."
    },
    {
        'matricule': 'HST-CAI-007',
        'nom_complet': 'Yao Dogbé',
        'username': 'yao',
        'mot_de_passe': '1234',
        'email': 'yao.dogbe@heistal-togo.tg',
        'telephone': '+228 95 56 57 58',
        'role': 'CAISSE',
        'departement': 'DAF',
        'service_rattache': 'CAISSE',
        'boutique': 'Boutique Tokoin Wuiti',
        'statut': 'Actif',
        'niveau_acces': 'CAISSE_POS',
        'avatar': 'YD',
        'missions': "Encaissements caisse centrale et vente directe comptoir Tokoin Wuiti."
    },
    {
        'matricule': 'HST-CAI-008',
        'nom_complet': 'Akossiwa Tossou',
        'username': 'akossiwa',
        'mot_de_passe': '1234',
        'email': 'akossiwa.tossou@heistal-togo.tg',
        'telephone': '+228 98 89 90 91',
        'role': 'CAISSE',
        'departement': 'DAF',
        'service_rattache': 'CAISSE',
        'boutique': 'Boutique Tokoin Wuiti',
        'statut': 'Actif',
        'niveau_acces': 'CAISSE_POS',
        'avatar': 'AT',
        'missions': "Caisse et encaissements Point de Vente Tokoin Wuiti."
    },
    {
        'matricule': 'HST-CAI-009',
        'nom_complet': 'Edwige Ayité',
        'username': 'edwige',
        'mot_de_passe': '1234',
        'email': 'edwige.ayite@heistal-togo.tg',
        'telephone': '+228 91 22 33 44',
        'role': 'CAISSE',
        'departement': 'DAF',
        'service_rattache': 'CAISSE',
        'boutique': 'Boutique Adidogomé',
        'statut': 'Actif',
        'niveau_acces': 'CAISSE_POS',
        'avatar': 'EA',
        'missions': "Caisse, encaissements et retraits express au comptoir d'Adidogomé."
    },
]

for s_data in OFFICIAL_STAFF:
    # 1. Django auth User
    u_obj, u_created = User.objects.get_or_create(username=s_data['username'])
    u_obj.set_password(s_data['mot_de_passe'])
    u_obj.email = s_data['email']
    parts = s_data['nom_complet'].split(' ', 1)
    u_obj.first_name = parts[0]
    u_obj.last_name = parts[1] if len(parts) > 1 else ''
    u_obj.is_staff = True
    if s_data['role'] in ['PDG', 'DG']:
        u_obj.is_superuser = True
    u_obj.save()

    # 2. StaffProfile
    profile = StaffProfile.objects.filter(matricule=s_data['matricule']).first()
    if not profile:
        profile = StaffProfile.objects.filter(username=s_data['username']).first()
    if not profile:
        profile = StaffProfile.objects.filter(nom_complet=s_data['nom_complet']).first()

    if profile:
        for k, v in s_data.items():
            setattr(profile, k, v)
        profile.user = u_obj
        profile.save()
        print(f"Profil mis à jour : {profile.nom_complet} (username: '{profile.username}')")
    else:
        profile = StaffProfile.objects.create(user=u_obj, **s_data)
        print(f"Profil créé : {profile.nom_complet} (username: '{profile.username}')")


print("\n=== 4. INITIALISATION DE LA BASE DES CLIENTS DU SITE WEB ===")
INITIAL_CLIENTS = [
    {
        'nom_complet': 'Koffi Mensah',
        'telephone': '+228 90 12 34 56',
        'telephone_secondaire': '+228 98 12 34 56',
        'email': 'koffi.mensah@gmail.com',
        'mot_de_passe': '1234',
        'type_client': 'PARTICULIER',
        'adresse': 'Près du Carrefour Déckon',
        'ville': 'Lomé',
        'quartier': 'Tokoin Centre',
        'boutique_preferee': 'Boutique Tokoin Wuiti',
        'notes': 'Préfère les découpes de capitaine et cuisses de poulet 10kg.'
    },
    {
        'nom_complet': 'Afiwa Lawson',
        'telephone': '+228 96 88 77 44',
        'telephone_secondaire': '+228 92 88 77 44',
        'email': 'afiwa.lawson@yahoo.fr',
        'mot_de_passe': '1234',
        'type_client': 'PARTICULIER',
        'adresse': 'Face Pharmacie de la Paix',
        'ville': 'Lomé',
        'quartier': 'Adidogomé',
        'boutique_preferee': 'Boutique Adidogomé',
        'notes': 'Cliente fidèle du samedi matin.'
    },
    {
        'nom_complet': 'Ama Sandra',
        'telephone': '+228 91 22 33 44',
        'telephone_secondaire': '',
        'email': 'ama.sandra@gmail.com',
        'mot_de_passe': '1234',
        'type_client': 'PARTICULIER',
        'adresse': 'Quartier Administratif',
        'ville': 'Lomé',
        'quartier': 'Tokoin Wuiti',
        'boutique_preferee': 'Boutique Tokoin Wuiti',
        'notes': 'Commande directe via le site web.'
    },
    {
        'nom_complet': 'Restaurant Le Jardin des Saveurs',
        'telephone': '+228 93 45 67 89',
        'telephone_secondaire': '+228 22 21 00 11',
        'email': 'jardin.saveurs@heistal-pro.tg',
        'mot_de_passe': '1234',
        'type_client': 'RESTAURANT',
        'adresse': 'Boulevard Circulaire, près de la Colombe de la Paix',
        'ville': 'Lomé',
        'quartier': 'Nyékonakpoè',
        'boutique_preferee': 'Boutique Tokoin Wuiti',
        'notes': 'Approvisionnement hebdomadaire : Bar, Saumon, Filet de bœuf par cartons.'
    },
    {
        'nom_complet': 'Hôtel Marina Palace',
        'telephone': '+228 90 77 88 99',
        'telephone_secondaire': '+228 22 27 88 00',
        'email': 'achats@marinapalace.tg',
        'mot_de_passe': '1234',
        'type_client': 'HOTEL',
        'adresse': 'Boulevard du Mono, Front de Mer',
        'ville': 'Lomé',
        'quartier': 'Zone Portuaire',
        'boutique_preferee': 'Boutique Tokoin Wuiti',
        'notes': 'Client B2B VIP : Facturation mensuelle et livraison frigorifique programmée.'
    },
    {
        'nom_complet': 'Éric Kodjovi (Maquis Le Croustillant)',
        'telephone': '+228 98 44 55 66',
        'telephone_secondaire': '',
        'email': 'eric.kodjovi@gmail.com',
        'mot_de_passe': '1234',
        'type_client': 'RESTAURANT',
        'adresse': 'Carrefour 2 Lions, Agoè',
        'ville': 'Lomé',
        'quartier': 'Agoè-Nyivé',
        'boutique_preferee': 'Boutique Tokoin Wuiti',
        'notes': 'Commandes régulières de frites belges 2.5kg et ailes de dinde.'
    }
]

for c_data in INITIAL_CLIENTS:
    c_obj, c_created = Client.objects.get_or_create(
        telephone=c_data['telephone'],
        defaults=c_data
    )
    if not c_created:
        for k, v in c_data.items():
            setattr(c_obj, k, v)
        c_obj.save()
    print(f"Client enregistré : {c_obj.nom_complet} ({c_obj.telephone}) - [{c_obj.get_type_client_display()}]")


print("\n=== 5. LIAISON DES COMMANDES WEB DIRECTES AUX CLIENTS ===")
for cmd in CommandeDirecte.objects.all():
    if cmd.client_telephone:
        clean_phone = cmd.client_telephone.strip()
        matching_client = Client.objects.filter(telephone__icontains=clean_phone.replace(' ', '')[-8:]).first()
        if not matching_client:
            matching_client, _ = Client.objects.get_or_create(
                telephone=clean_phone,
                defaults={
                    'nom_complet': cmd.client_nom or 'Client Heistal',
                    'boutique_preferee': cmd.boutique_retrait or 'Boutique Tokoin Wuiti',
                    'quartier': 'Lomé'
                }
            )
        cmd.client = matching_client
        cmd.save()
        # Mettre à jour stats client
        matching_client.total_commandes = matching_client.commandes.count()
        matching_client.total_depense = sum(c.total for c in matching_client.commandes.filter(statut__in=['PRETE', 'RECUPEREE']))
        matching_client.derniere_commande = cmd.date_commande
        matching_client.save()

print("\n=== RÉSUMÉ DE LA BASE DE DONNÉES UTILISATEURS ===")
print(f"Total Comptes Django auth_user : {User.objects.count()}")
print(f"Total Employés / Admin Heistal : {StaffProfile.objects.count()}")
print(f"Total Clients enregistrés     : {Client.objects.count()}")
print(f"Total Commandes Web rattachées: {CommandeDirecte.objects.filter(client__isnull=False).count()} / {CommandeDirecte.objects.count()}")
print("==================================================")
