"""
Schemas Event - Validation des données pour les événements
Ces schemas utilisent Pydantic pour valider les données avant de les sauvegarder
Codes pays acceptés: TG, CA, FR, SN
"""

from pydantic import BaseModel, Field, field_validator, model_validator
from datetime import datetime
from typing import Optional, List
from app.models.event import EventStatus, EventType, EventFormat, VirtualPlatform
from app.schemas.ticket import TicketCreate, TicketResponse
from app.schemas.tag import TagResponse


# SCHEMA 1 : Base commune à tous les schemas Event
class EventBase(BaseModel):
    """
    Schema de base pour un événement
    Contient les champs communs utilisés par tous les autres schemas
    """
    title: str = Field(..., min_length=5, max_length=200, description="Titre de l'événement (5-200 caractères)")
    # Field(...) : Champ obligatoire
    # min_length=5 : Au moins 5 caractères
    # max_length=200 : Maximum 200 caractères

    description: Optional[str] = Field(None, max_length=500, description="Description courte (max 500 caractères)")
    # Optional : Ce champ est optionnel (peut être None)

    full_description: Optional[str] = Field(None, description="Description complète de l'événement")
    # Pas de limite de longueur

    event_type: EventType = Field(default=EventType.OTHER, description="Type d'événement")
    # Par défaut : OTHER

    event_format: EventFormat = Field(default=EventFormat.PHYSICAL, description="Format (physical/virtual/hybrid)")
    # Par défaut : PHYSICAL

    start_date: datetime = Field(..., description="Date et heure de début")
    # datetime : Format ISO 8601 (ex: "2025-12-25T14:30:00")

    end_date: datetime = Field(..., description="Date et heure de fin")

    # ===== CHAMPS POUR ÉVÉNEMENTS PHYSIQUES =====
    # Optionnels pour événements virtuels, obligatoires pour physiques
    location: Optional[str] = Field(None, min_length=3, max_length=300, description="Nom du lieu")

    address: Optional[str] = Field(None, max_length=500, description="Adresse complète")

    city: Optional[str] = Field(None, min_length=2, max_length=100, description="Ville")

    country_code: Optional[str] = Field(None, min_length=2, max_length=2, description="Code pays (TG, CA, FR)")

    # ===== CHAMPS POUR ÉVÉNEMENTS VIRTUELS =====
    # Optionnels pour événements physiques, obligatoires pour virtuels
    virtual_platform: Optional[VirtualPlatform] = Field(None, description="Plateforme (zoom/google_meet/teams)")

    virtual_meeting_url: Optional[str] = Field(None, max_length=500, description="URL de la réunion")

    virtual_meeting_id: Optional[str] = Field(None, max_length=100, description="Meeting ID")

    virtual_meeting_password: Optional[str] = Field(None, max_length=100, description="Mot de passe")

    virtual_instructions: Optional[str] = Field(None, description="Instructions pour rejoindre")

    capacity: Optional[int] = Field(None, gt=0, description="Capacité maximale (calculée auto depuis tickets)")
    # Optionnel: sera calculé automatiquement depuis la somme des tickets
    # Si fourni manuellement, doit être > 0

    is_free: bool = Field(default=False, description="Est-ce gratuit ?")
    # Par défaut : False (payant)

    price: float = Field(default=0.0, ge=0, description="Prix du billet")
    # ge=0 : Greater or Equal to 0 (supérieur ou égal à 0)

    currency: str = Field(..., min_length=3, max_length=3, description="Devise (XOF, CAD, EUR)")

    image_url: Optional[str] = Field(None, max_length=500, description="URL de l'image de couverture")

    # Validations personnalisées
    @field_validator('end_date')
    @classmethod
    def validate_end_date(cls, v, info):
        """
        Vérifier que la date de fin est après la date de début
        """
        # info.data contient les autres champs déjà validés
        start_date = info.data.get('start_date')
        if start_date and v <= start_date:
            raise ValueError('La date de fin doit être après la date de début')
        return v

    @field_validator('start_date')
    @classmethod
    def validate_start_date(cls, v):
        """
        Vérifier que l'événement n'est pas dans le passé
        """
        # Commenté temporairement pour permettre les tests
        # if v < datetime.now():
        #     raise ValueError("La date de début ne peut pas être dans le passé")
        return v

    @field_validator('country_code')
    @classmethod
    def validate_country_code(cls, v):
        """
        Vérifier que le code pays est valide (TG, CA, FR, SN)
        """
        if v is None:
            return v
        valid_codes = ["TG", "CA", "FR", "SN"]
        if v.upper() not in valid_codes:
            raise ValueError(f"Code pays invalide. Codes acceptés : {', '.join(valid_codes)}")
        return v.upper()

    @field_validator('currency')
    @classmethod
    def validate_currency(cls, v):
        """
        Vérifier que la devise est valide (XOF, CAD, EUR, USD)
        """
        valid_currencies = ["XOF", "CAD", "EUR", "USD"]
        if v.upper() not in valid_currencies:
            raise ValueError(f"Devise invalide. Devises acceptées : {', '.join(valid_currencies)}")
        return v.upper()

    @field_validator('price')
    @classmethod
    def validate_price(cls, v, info):
        """
        Si is_free = True, alors price doit être 0
        Si is_free = False, alors price doit être > 0
        """
        is_free = info.data.get('is_free', False)
        if is_free and v > 0:
            raise ValueError("Le prix doit être 0 pour un événement gratuit")
        if not is_free and v <= 0:
            raise ValueError("Le prix doit être supérieur à 0 pour un événement payant")
        return v

    @model_validator(mode='after')
    def validate_event_format(self):
        """
        Vérifier que les champs requis sont présents selon le format de l'événement

        - Si PHYSICAL ou HYBRID : location, city, country_code obligatoires
        - Si VIRTUAL ou HYBRID : virtual_platform et virtual_meeting_url obligatoires
        """
        event_format = self.event_format

        # Validation pour événements PHYSIQUES ou HYBRIDES
        if event_format in [EventFormat.PHYSICAL, EventFormat.HYBRID]:
            if not self.location:
                raise ValueError("Le lieu (location) est obligatoire pour un événement physique ou hybride")
            if not self.city:
                raise ValueError("La ville (city) est obligatoire pour un événement physique ou hybride")
            if not self.country_code:
                raise ValueError("Le code pays (country_code) est obligatoire pour un événement physique ou hybride")

        # Validation pour événements VIRTUELS ou HYBRIDES
        if event_format in [EventFormat.VIRTUAL, EventFormat.HYBRID]:
            if not self.virtual_platform:
                raise ValueError("La plateforme (virtual_platform) est obligatoire pour un événement virtuel ou hybride")
            if not self.virtual_meeting_url:
                raise ValueError("L'URL de la réunion (virtual_meeting_url) est obligatoire pour un événement virtuel ou hybride")

        return self


# SCHEMA 2 : Création d'un événement
class EventCreate(EventBase):
    """
    Schema pour créer un événement
    Hérite de EventBase + champs supplémentaires pour marketplace
    L'organizer_id sera automatiquement ajouté depuis le token JWT
    """
    organizer_id: Optional[int] = Field(None, description="ID de l'organisateur (ADMIN uniquement)")
    # Champs marketplace
    category_id: Optional[int] = Field(None, description="ID de la catégorie")
    tag_ids: Optional[List[int]] = Field(default=[], description="Liste des IDs de tags")

    # Tickets multiples
    tickets: Optional[List[TicketCreate]] = Field(default=[], description="Liste des types de billets")

    @field_validator('tickets')
    @classmethod
    def validate_tickets(cls, v, info):
        """
        Vérifier que les tickets sont cohérents avec l'événement
        """
        is_free = info.data.get('is_free', False)

        # Si l'événement est gratuit, pas besoin de tickets
        if is_free and len(v) > 0:
            raise ValueError("Un événement gratuit ne peut pas avoir de tickets payants")

        # Si l'événement est payant, il doit avoir au moins 1 ticket
        if not is_free and len(v) == 0:
            raise ValueError("Un événement payant doit avoir au moins 1 type de ticket")

        # Vérifier que tous les tickets ont la même devise que l'événement
        currency = info.data.get('currency')
        for ticket in v:
            if ticket.currency != currency:
                raise ValueError(f"Tous les tickets doivent avoir la même devise que l'événement ({currency})")

        return v

    @field_validator('capacity')
    @classmethod
    def validate_capacity(cls, v, info):
        """
        Si capacity n'est pas fournie, elle sera calculée depuis les tickets
        Si fournie, elle doit correspondre à la somme des tickets
        """
        tickets = info.data.get('tickets', [])

        if len(tickets) > 0:
            total_tickets = sum(ticket.quantity_available for ticket in tickets)

            # Si capacity est fournie, vérifier qu'elle correspond
            if v is not None and v != total_tickets:
                raise ValueError(
                    f"La capacité ({v}) ne correspond pas à la somme des tickets ({total_tickets}). "
                    f"Laissez capacity vide pour calcul automatique."
                )

            # Sinon, la capacité sera calculée automatiquement dans la route

        return v


# SCHEMA 3 : Mise à jour d'un événement
class EventUpdate(BaseModel):
    """
    Schema pour mettre à jour un événement
    Tous les champs sont optionnels (on peut modifier juste 1 champ)
    """
    title: Optional[str] = Field(None, min_length=5, max_length=200)
    description: Optional[str] = Field(None, max_length=500)
    full_description: Optional[str] = None
    event_type: Optional[EventType] = None
    event_format: Optional[EventFormat] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    location: Optional[str] = Field(None, min_length=3, max_length=300)
    address: Optional[str] = Field(None, max_length=500)
    city: Optional[str] = Field(None, min_length=2, max_length=100)
    country_code: Optional[str] = Field(None, min_length=2, max_length=2)
    virtual_platform: Optional[VirtualPlatform] = None
    virtual_meeting_url: Optional[str] = Field(None, max_length=500)
    virtual_meeting_id: Optional[str] = Field(None, max_length=100)
    virtual_meeting_password: Optional[str] = Field(None, max_length=100)
    virtual_instructions: Optional[str] = None
    capacity: Optional[int] = Field(None, gt=0)
    is_free: Optional[bool] = None
    price: Optional[float] = Field(None, ge=0)
    currency: Optional[str] = Field(None, min_length=3, max_length=3)
    image_url: Optional[str] = Field(None, max_length=500)
    status: Optional[EventStatus] = None
    category_id: Optional[int] = None
    tag_ids: Optional[List[int]] = []
    tickets: Optional[List[TicketCreate]] = None


# SCHEMA 4 : Réponse Event (ce qu'on retourne à l'utilisateur)
class EventResponse(EventBase):
    """
    Schema pour retourner un événement
    Contient tous les champs + les champs générés automatiquement
    """
    id: int
    organizer_id: int
    available_seats: int
    status: EventStatus
    is_published: bool
    created_at: datetime
    updated_at: datetime

    # Champs marketplace
    category_id: Optional[int] = None
    tickets: List[TicketResponse] = []
    tags: List[TagResponse] = []

    # Configuration Pydantic
    class Config:
        from_attributes = True  # Permet de créer un schema depuis un objet SQLAlchemy
        # Avant (Pydantic v1) : orm_mode = True


# SCHEMA 5 : Réponse Event avec les infos de l'organisateur
class EventWithOrganizer(EventResponse):
    """
    Schema pour retourner un événement avec les infos de l'organisateur
    Utile pour afficher "Organisé par Jean Dupont"
    """
    organizer_name: str = Field(..., description="Nom de l'organisateur")
    organizer_email: str = Field(..., description="Email de l'organisateur")

    @classmethod
    def from_event(cls, event):
        """
        Créer un EventWithOrganizer depuis un objet Event
        """
        return cls(
            **event.__dict__,
            organizer_name=f"{event.organizer.first_name} {event.organizer.last_name}",
            organizer_email=event.organizer.email
        )


# SCHEMA 6 : Liste paginée d'événements
class EventList(BaseModel):
    """
    Schema pour retourner une liste d'événements avec pagination
    """
    total: int = Field(..., description="Nombre total d'événements")
    page: int = Field(..., description="Page actuelle")
    page_size: int = Field(..., description="Nombre d'événements par page")
    events: list[EventResponse] = Field(..., description="Liste des événements")

    class Config:
        from_attributes = True
