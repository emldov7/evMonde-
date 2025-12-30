"""
Modèle Event - Représente un événement dans la base de données
Ce fichier définit la table 'events' dans PostgreSQL
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Float, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.config.database import Base


# ENUM 1 : Statut de l'événement
class EventStatus(str, enum.Enum):
    """
    Les différents statuts possibles d'un événement

    - DRAFT : Brouillon (pas encore publié, visible uniquement par l'organisateur)
    - PUBLISHED : Publié (visible par tout le monde, inscriptions ouvertes)
    - CANCELLED : Annulé (événement annulé, inscriptions fermées)
    - COMPLETED : Terminé (événement passé)
    """
    DRAFT = "draft"           # Brouillon
    PUBLISHED = "published"   # Publié
    CANCELLED = "cancelled"   # Annulé
    COMPLETED = "completed"   # Terminé


# ENUM 2 : Type d'événement
class EventType(str, enum.Enum):
    """
    Les différents types d'événements

    - CONFERENCE : Conférence
    - WORKSHOP : Atelier
    - SEMINAR : Séminaire
    - CONCERT : Concert
    - EXHIBITION : Exposition
    - SPORTS : Événement sportif
    - OTHER : Autre
    """
    CONFERENCE = "conference"
    WORKSHOP = "workshop"
    SEMINAR = "seminar"
    CONCERT = "concert"
    EXHIBITION = "exhibition"
    SPORTS = "sports"
    OTHER = "other"


# ENUM 3 : Format de l'événement (Physique ou Virtuel)
class EventFormat(str, enum.Enum):
    """
    Format de l'événement

    - PHYSICAL : Événement physique (avec lieu, adresse)
    - VIRTUAL : Événement virtuel (en ligne, avec lien de réunion)
    - HYBRID : Hybride (physique + virtuel en même temps)
    """
    PHYSICAL = "physical"  # Physique
    VIRTUAL = "virtual"    # Virtuel
    HYBRID = "hybrid"      # Hybride


# ENUM 4 : Plateforme virtuelle
class VirtualPlatform(str, enum.Enum):
    """
    Plateformes de réunion virtuelle

    - ZOOM : Zoom
    - GOOGLE_MEET : Google Meet
    - MICROSOFT_TEAMS : Microsoft Teams
    - WEBEX : Cisco Webex
    - OTHER : Autre plateforme
    """
    ZOOM = "zoom"
    GOOGLE_MEET = "google_meet"
    MICROSOFT_TEAMS = "microsoft_teams"
    WEBEX = "webex"
    OTHER = "other"


# MODÈLE Event - Table 'events'
class Event(Base):
    """
    Modèle Event - Représente un événement

    Ce modèle définit la structure de la table 'events' dans PostgreSQL.
    Chaque ligne de cette table représente un événement créé par un organisateur.

    Relations :
    - organizer : Lien vers le User qui a créé l'événement (relation Many-to-One)
    - registrations : Liste des inscriptions à cet événement (relation One-to-Many)
    """

    __tablename__ = "events"  # Nom de la table dans PostgreSQL

    # CHAMP 1 : ID (Clé primaire, auto-incrémentée)
    id = Column(Integer, primary_key=True, index=True)
    # primary_key=True : Identifiant unique de chaque événement
    # index=True : Créer un index pour des recherches rapides

    # CHAMP 2 : Titre de l'événement
    title = Column(String(200), nullable=False, index=True)
    # String(200) : Maximum 200 caractères
    # nullable=False : Obligatoire (ne peut pas être vide)
    # index=True : Permet de rechercher rapidement par titre

    # CHAMP 3 : Description courte (résumé)
    description = Column(String(500), nullable=True)
    # String(500) : Maximum 500 caractères
    # nullable=True : Optionnel

    # CHAMP 4 : Description longue (détails complets)
    full_description = Column(Text, nullable=True)
    # Text : Texte de longueur illimitée
    # Ici on peut mettre tous les détails de l'événement

    # CHAMP 5 : Type d'événement
    event_type = Column(SQLEnum(EventType), default=EventType.OTHER, nullable=False)
    # Utilise l'enum EventType défini plus haut
    # Par défaut : "other"

    # CHAMP 5b : Format de l'événement (Physique / Virtuel / Hybride)
    event_format = Column(SQLEnum(EventFormat), default=EventFormat.PHYSICAL, nullable=False)
    # Par défaut : PHYSICAL (événement physique)

    # CHAMP 6 : Date et heure de début de l'événement
    start_date = Column(DateTime, nullable=False, index=True)
    # DateTime : Date + Heure (ex: 2025-12-25 14:30:00)
    # index=True : Permet de rechercher/trier par date

    # CHAMP 7 : Date et heure de fin de l'événement
    end_date = Column(DateTime, nullable=False)
    # Si l'événement dure plusieurs jours, on met la date de fin ici

    # CHAMP 8 : Lieu de l'événement (nom du lieu) - OPTIONNEL pour événements virtuels
    location = Column(String(300), nullable=True)
    # Exemple : "Palais des Congrès de Lomé"
    # Obligatoire si event_format = PHYSICAL ou HYBRID

    # CHAMP 9 : Adresse complète - OPTIONNEL
    address = Column(String(500), nullable=True)
    # Exemple : "123 Avenue de la République, Lomé, Togo"

    # CHAMP 10 : Ville - OPTIONNEL pour événements virtuels
    city = Column(String(100), nullable=True, index=True)
    # index=True : Permet de filtrer par ville
    # Obligatoire si event_format = PHYSICAL ou HYBRID

    # CHAMP 11 : Code pays (TG, CA, FR) - OPTIONNEL pour événements virtuels
    country_code = Column(String(2), nullable=True, index=True)
    # Utilise les mêmes codes que dans le modèle User
    # Obligatoire si event_format = PHYSICAL ou HYBRID

    # CHAMP 12 : Capacité maximale (nombre de places)
    capacity = Column(Integer, nullable=False)
    # Exemple : 100 personnes max

    # CHAMP 13 : Places restantes
    available_seats = Column(Integer, nullable=False)
    # Au départ : available_seats = capacity
    # À chaque inscription : available_seats -= 1

    # CHAMP 14 : Est-ce un événement gratuit ?
    is_free = Column(Boolean, default=False, nullable=False)
    # True = gratuit, False = payant

    # CHAMP 15 : Prix du billet (si payant)
    price = Column(Float, default=0.0, nullable=False)
    # En XOF pour Togo, CAD pour Canada, EUR pour France
    # Si is_free = True, alors price = 0.0

    # CHAMP 16 : Devise (XOF, CAD, EUR)
    currency = Column(String(3), nullable=False)
    # L'organisateur choisit librement la devise, indépendamment du pays
    # Exemple : Un événement au Togo peut accepter des paiements en EUR

    # CHAMP 17 : URL de l'image de couverture
    image_url = Column(String(500), nullable=True)
    # Lien vers l'image uploadée (on gérera l'upload plus tard)

    # ========== CHAMPS POUR ÉVÉNEMENTS VIRTUELS ==========
    # Ces champs ne sont utilisés que si event_format = VIRTUAL ou HYBRID

    # CHAMP 17a : Plateforme virtuelle (Zoom, Google Meet, Teams, etc.)
    virtual_platform = Column(SQLEnum(VirtualPlatform), nullable=True)
    # Exemple : ZOOM, GOOGLE_MEET, MICROSOFT_TEAMS
    # Obligatoire si event_format = VIRTUAL ou HYBRID

    # CHAMP 17b : URL de la réunion virtuelle
    virtual_meeting_url = Column(String(500), nullable=True)
    # Exemple : "https://zoom.us/j/123456789"
    # Le lien direct vers la réunion

    # CHAMP 17c : ID de la réunion (Meeting ID)
    virtual_meeting_id = Column(String(100), nullable=True)
    # Exemple : "123 456 789" pour Zoom
    # Optionnel (certaines plateformes n'utilisent que l'URL)

    # CHAMP 17d : Mot de passe de la réunion
    virtual_meeting_password = Column(String(100), nullable=True)
    # Exemple : "Abc123"
    # Optionnel (si la réunion est protégée par mot de passe)

    # CHAMP 17e : Instructions supplémentaires pour rejoindre
    virtual_instructions = Column(Text, nullable=True)
    # Exemple : "Téléchargez l'application Zoom avant la réunion"
    # Optionnel

    # CHAMP 18 : Statut de l'événement
    status = Column(SQLEnum(EventStatus), default=EventStatus.DRAFT, nullable=False, index=True)
    # Par défaut : DRAFT (brouillon)
    # index=True : Permet de filtrer par statut

    # CHAMP 19 : Est-ce que l'événement est publié ?
    is_published = Column(Boolean, default=False, nullable=False)
    # True si status = PUBLISHED

    # CHAMP 20 : ID de l'organisateur (Foreign Key vers User)
    organizer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    # ForeignKey : Lien vers la table "users"
    # ondelete="CASCADE" : Si l'utilisateur est supprimé, ses événements sont supprimés aussi
    # index=True : Permet de rechercher tous les événements d'un organisateur

    # CHAMP 21 : Date de création
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    # Automatiquement défini à la création

    # CHAMP 22 : Date de dernière modification
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    # Automatiquement mis à jour à chaque modification

    # ═══════════════════════════════════════════════════════════════
    # ADMIN / MODÉRATION
    # ═══════════════════════════════════════════════════════════════

    # is_featured : Mis en avant par l'admin (apparaît en haut de la liste)
    is_featured = Column(Boolean, default=False, nullable=False)

    # is_flagged : Signalé comme suspect
    is_flagged = Column(Boolean, default=False, nullable=False)

    # flag_reason : Raison du signalement
    flag_reason = Column(String, nullable=True)

    # flagged_at : Date du signalement
    flagged_at = Column(DateTime, nullable=True)

    # flagged_by_admin_id : ID de l'admin qui a signalé
    flagged_by_admin_id = Column(Integer, nullable=True)

    # admin_notes : Notes internes de l'admin
    admin_notes = Column(Text, nullable=True)

    # ═══════════════════════════════════════════════════════════════
    # CATÉGORIE & TAGS
    # ═══════════════════════════════════════════════════════════════

    # category_id : ID de la catégorie (Foreign Key)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)

    # RELATION 1 : Lien vers l'organisateur (User)
    organizer = relationship("User", back_populates="organized_events")
    # relationship() : Crée un lien entre Event et User
    # "User" : Le modèle lié
    # back_populates : Permet d'accéder aux événements depuis l'utilisateur
    #
    # Exemple d'utilisation :
    #   event = db.query(Event).first()
    #   print(event.organizer.email)  # Accéder à l'email de l'organisateur

    # RELATION 2 : Lien vers les inscriptions (Registration)
    # Cette relation permet d'accéder à toutes les inscriptions pour cet événement
    # Exemple : event.registrations --> liste de toutes les inscriptions
    registrations = relationship("Registration", back_populates="event", cascade="all, delete-orphan")
    # cascade="all, delete-orphan" : Si on supprime un événement, toutes ses inscriptions sont supprimées aussi

    # RELATION 3 : Lien vers la catégorie
    category = relationship("Category", back_populates="events")

    # RELATION 4 : Lien vers les tags (Many-to-Many)
    tags = relationship("Tag", secondary="event_tags", back_populates="events")

    # RELATION 5 : Lien vers les tickets (One-to-Many)
    tickets = relationship("Ticket", back_populates="event", cascade="all, delete-orphan")


# IMPORTANT : On doit aussi ajouter la relation inverse dans le modèle User
# On va modifier models/user.py pour ajouter :
# organized_events = relationship("Event", back_populates="organizer")
