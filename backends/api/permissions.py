"""
Règles d'accès de l'API. `IsStaffMember` est la règle par défaut (voir REST_FRAMEWORK dans settings).

Ce que chaque rôle peut faire :
- Super admin : tout, et seul à gérer les comptes, les boutiques et les ventes déjà enregistrées.
- Service commercial : catalogue, stock, commandes et clients, et vente dans toutes les boutiques.
- Contrôleur : lecture seule, tableau de bord compris.
- Caissière : vente dans sa boutique, sans accès aux autres.
"""
from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied

from .models import Boutique, StaffProfile

ROLES_GESTION = (StaffProfile.SUPER_ADMIN, StaffProfile.SERVICE_COMMERCIAL)
ROLES_VENTE = (StaffProfile.SUPER_ADMIN, StaffProfile.SERVICE_COMMERCIAL, StaffProfile.CAISSIERE)
ROLES_PILOTAGE = (StaffProfile.SUPER_ADMIN, StaffProfile.SERVICE_COMMERCIAL, StaffProfile.CONTROLEUR)


def est_membre_du_personnel(request):
    """Vrai pour une session employé : un profil, ou un superutilisateur sans profil."""
    jeton = request.auth
    if getattr(jeton, 'user_id', None) is None:
        return False
    return request.user.is_superuser or hasattr(request.user, 'staff_profile')


def role_de(user):
    profil = getattr(user, 'staff_profile', None)
    if profil is not None:
        return profil.role
    return StaffProfile.SUPER_ADMIN if user.is_superuser else None


def est_caissiere(user):
    return role_de(user) == StaffProfile.CAISSIERE


def boutiques_accessibles(user):
    """Une caissière n'a que sa boutique, ou aucune si elle n'est pas encore affectée. Les autres les ont toutes."""
    if est_caissiere(user):
        return Boutique.objects.filter(pk=user.staff_profile.boutique_id)
    return Boutique.objects.all()


class IsStaffMember(permissions.BasePermission):
    """Employé connecté, quel que soit son rôle."""
    message = "Accès réservé au personnel Heistal."

    def has_permission(self, request, view):
        if not est_membre_du_personnel(request):
            return False
        if request.auth.doit_changer_mot_de_passe:
            raise PermissionDenied("Vous devez changer votre mot de passe avant de continuer.")
        return True


class RoleRequis(IsStaffMember):
    roles = ()
    message = "Votre rôle ne permet pas cette action."

    def has_permission(self, request, view):
        return super().has_permission(request, view) and role_de(request.user) in self.roles


class IsSuperAdmin(RoleRequis):
    roles = (StaffProfile.SUPER_ADMIN,)
    message = "Action réservée au super admin."


class IsGestion(RoleRequis):
    roles = ROLES_GESTION


class PeutVendre(RoleRequis):
    roles = ROLES_VENTE


class PeutVoirStatistiques(RoleRequis):
    """Tableau de bord : tout le monde sauf la caissière, qui ne voit que sa caisse."""
    roles = ROLES_PILOTAGE


class IsGestionOrReadOnly(IsGestion):
    """Lecture ouverte au site public, écriture réservée à la gestion."""

    def has_permission(self, request, view):
        return request.method in permissions.SAFE_METHODS or super().has_permission(request, view)


class IsGestionOrStaffReadOnly(IsStaffMember):
    """Lecture pour tout le personnel, écriture réservée à la gestion."""

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return request.method in permissions.SAFE_METHODS or role_de(request.user) in ROLES_GESTION


class HasApiToken(permissions.BasePermission):
    """Session valide, y compris celle qui doit encore changer son mot de passe."""

    def has_permission(self, request, view):
        return request.auth is not None


class IsStaffOrOwnClient(IsStaffMember):
    """Un employé, ou le client propriétaire de la fiche consultée."""

    def has_permission(self, request, view):
        return request.auth is not None

    def has_object_permission(self, request, view, obj):
        if request.auth.client_id is not None:
            return request.auth.client_id == obj.pk
        return super().has_permission(request, view)


class IsClientConnecte(permissions.BasePermission):
    """Client connecté à son espace sur le site."""
    message = "Connectez-vous à votre espace client."

    def has_permission(self, request, view):
        return request.auth is not None and request.auth.client_id is not None
