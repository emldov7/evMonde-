"""
Modèle User - Représente la table 'users' dans PostgreSQL
Ce fichier définit la structure de la table des utilisateurs
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.config.database import Base
import enum


# ÉTAPE 1 : Définir les types d'utilisateurs avec un Enum
class UserRole(str, enum.Enum):
    """
    Enum pour les rôles d'utilisateurs
    Un Enum = liste fixe de valeurs possibles
    """
    ADMIN = "admin"              # Administrateur : contrôle tout
    ORGANIZER = "organizer"      # Organisateur : crée des événements
    PARTICIPANT = "participant"  # Participant : s'inscrit aux événements


# ÉTAPE 2 : Créer le modèle User (la table)
class User(Base):
    """
    Modèle User - Table des utilisateurs

    Chaque attribut = une colonne dans la table PostgreSQL
    """

    # Nom de la table dans PostgreSQL
    __tablename__ = "users"

    # COLONNES DE LA TABLE

    # id : Clé primaire (identifiant unique de chaque utilisateur)
    id = Column(
        Integer,           # Type : nombre entier
        primary_key=True,  # C'est la clé primaire
        index=True,        # Créer un index pour rechercher rapidement
        autoincrement=True # S'incrémente automatiquement (1, 2, 3, ...)
    )

    # email : Adresse email de l'utilisateur
    email = Column(
        String,         # Type : texte
        unique=True,    # Doit être unique (pas 2 users avec même email)
        index=True,     # Index pour rechercher rapidement
        nullable=False  # Obligatoire (ne peut pas être vide)
    )

    # country_code : Code du pays (ex: "TG", "CA", "FR")
    country_code = Column(
        String(2),      # 2 caractères exactement (code ISO)
        nullable=False
    )

    # country_name : Nom du pays (ex: "Togo", "Canada", "France")
    country_name = Column(
        String,
        nullable=False
    )

    # phone_country_code : Indicatif téléphonique (ex: "+228", "+1", "+33")
    phone_country_code = Column(
        String(5),      # Maximum 5 caractères (ex: "+228")
        nullable=False
    )

    # phone : Numéro de téléphone SANS l'indicatif (ex: "90123456")
    # Le numéro complet sera : phone_country_code + phone
    phone = Column(
        String,
        nullable=False  # Obligatoire
    )

    # phone_full : Numéro complet avec indicatif (ex: "+22890123456")
    # Ce champ sera calculé automatiquement : phone_country_code + phone
    phone_full = Column(
        String,
        unique=True,    # Doit être unique (pas 2 users avec même numéro)
        index=True,
        nullable=False
    )

    # hashed_password : Mot de passe crypté (on ne stocke JAMAIS le mot de passe en clair)
    hashed_password = Column(
        String,
        nullable=False
    )

    # first_name : Prénom
    first_name = Column(
        String,
        nullable=False
    )

    # last_name : Nom de famille
    last_name = Column(
        String,
        nullable=False #Obligatoire
    )

    # role : Rôle de l'utilisateur (admin, organizer, participant)
    role = Column(
        Enum(UserRole),              # Type : Enum UserRole défini plus haut
        nullable=False,
        default=UserRole.PARTICIPANT # Par défaut : participant
    )

    # is_active : L'utilisateur est-il actif ?
    # L'admin peut désactiver un utilisateur sans le supprimer
    is_active = Column(
        Boolean,
        default=True,    # Par défaut : actif
        nullable=False
    )

    # is_verified : L'utilisateur a-t-il vérifié son email/téléphone ?
    is_verified = Column(
        Boolean,
        default=False,   # Par défaut : non vérifié
        nullable=False
    )

    # preferred_language : Langue préférée (fr ou en)
    preferred_language = Column(
        String,
        default="fr",    # ici c'est python qui met cette valeurs par defaut a cause de 'default'  # Par défaut : français 
        nullable=False
    )

    # created_at : Date de création du compte
    created_at = Column(
        DateTime(timezone=True),        # Type : date et heure avec fuseau horaire
        server_default=func.now(),   #Ici c'est postgrel meme qui met la valeur par defaut plus fiable   # Valeur par défaut : maintenant
        nullable=False
    )

    # updated_at : Date de dernière modification du compte
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),      # Par défaut : maintenant
        onupdate=func.now(),            # Se met à jour automatiquement à chaque modification
        nullable=False
    )

    # ═══════════════════════════════════════════════════════════════
    # ADMIN / MODÉRATION
    # ═══════════════════════════════════════════════════════════════

    # is_suspended : Compte suspendu par un admin
    is_suspended = Column(
        Boolean,
        default=False,
        nullable=False
    )

    # suspension_reason : Raison de la suspension
    suspension_reason = Column(
        String,
        nullable=True
    )

    # suspended_at : Date de suspension
    suspended_at = Column(
        DateTime(timezone=True),
        nullable=True
    )

    # suspended_by_admin_id : ID de l'admin qui a suspendu
    suspended_by_admin_id = Column(
        Integer,
        nullable=True
    )

    # last_login_at : Date de dernière connexion
    last_login_at = Column(
        DateTime(timezone=True),
        nullable=True
    )


    # RELATION 1 : Événements organisés par cet utilisateur
    # Cette relation permet d'accéder facilement à tous les événements créés par un utilisateur
    # Exemple : user.organized_events --> liste de tous ses événements
    organized_events = relationship("Event", back_populates="organizer")
    # "Event" : Le modèle lié (on l'a créé dans models/event.py)
    # back_populates : Permet d'accéder à l'organisateur depuis un événement

    # RELATION 2 : Inscriptions de cet utilisateur
    # Cette relation permet d'accéder à toutes les inscriptions d'un utilisateur
    # Exemple : user.registrations --> liste de toutes ses inscriptions
    registrations = relationship("Registration", back_populates="user")
    # "Registration" : Le modèle lié (on l'a créé dans models/registration.py)
    # back_populates : Permet d'accéder à l'utilisateur depuis une inscription


    def __repr__(self):  # Quand on fait print(users), on voit l'utilisateur et son role, tres utilie pour nous
        """
        Représentation de l'objet User en texte
        Utile pour le debug : print(user) affichera "User(email=test@test.com)"
        """
        return f"User(email={self.email}, role={self.role})" 
