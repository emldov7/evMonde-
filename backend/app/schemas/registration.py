"""
Schemas Pydantic pour les inscriptions (Registration)
Ces schemas définissent la structure des données pour les requêtes et réponses API
"""

from pydantic import BaseModel, EmailStr, field_validator, Field
from typing import Optional, Literal
from datetime import datetime
from app.models.registration import RegistrationType, RegistrationStatus, PaymentStatus


# ═══════════════════════════════════════════════════════════════
# SCHEMA 1 : Inscription INVITÉ (Guest)
# ═══════════════════════════════════════════════════════════════

class GuestRegistrationCreate(BaseModel):
    """
    Formulaire d'inscription pour un INVITÉ (sans compte)

    Utilisé quand quelqu'un s'inscrit SANS se connecter

    Champs OBLIGATOIRES :
    - first_name : Prénom
    - last_name : Nom
    - email : Email (pour recevoir la confirmation)

    Champs OPTIONNELS :
    - country_code : Code pays (ex: "TG", "CA")
    - phone_country_code : Indicatif (ex: "+228", "+1")
    - phone : Numéro sans indicatif (ex: "90123456")
    """

    # Obligatoires
    first_name: str = Field(..., min_length=2, max_length=100, description="Prénom")
    last_name: str = Field(..., min_length=2, max_length=100, description="Nom de famille")
    email: EmailStr = Field(..., description="Email pour recevoir la confirmation")
    ticket_id: Optional[int] = Field(None, description="ID du type de ticket à acheter (optionnel si événement sans tickets)")

    # Optionnels
    country_code: Optional[str] = Field(None, min_length=2, max_length=2, description="Code pays ISO (ex: TG, CA)")
    phone_country_code: Optional[str] = Field(None, max_length=5, description="Indicatif téléphonique (ex: +228)")
    phone: Optional[str] = Field(None, max_length=20, description="Numéro de téléphone")

    @field_validator('first_name', 'last_name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Valider que le nom contient au moins 2 caractères"""
        if not v or len(v.strip()) < 2:
            raise ValueError("Le nom doit contenir au moins 2 caractères")
        return v.strip().title()  # Capitalise (Marie Dupont)

    @field_validator('country_code')
    @classmethod
    def validate_country_code(cls, v: Optional[str]) -> Optional[str]:
        """Valider le code pays (2 lettres majuscules)"""
        if v:
            v = v.strip().upper()
            if len(v) != 2:
                raise ValueError("Le code pays doit contenir exactement 2 lettres (ex: TG, CA)")
            return v
        return None

    @field_validator('phone_country_code')
    @classmethod
    def validate_phone_country_code(cls, v: Optional[str]) -> Optional[str]:
        """Valider l'indicatif téléphonique"""
        if v:
            v = v.strip()
            if not v.startswith('+'):
                raise ValueError("L'indicatif doit commencer par + (ex: +228, +1)")
            return v
        return None

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        """Valider le numéro de téléphone"""
        if v:
            # Enlever les espaces et tirets
            v = v.strip().replace(' ', '').replace('-', '')
            if not v.isdigit():
                raise ValueError("Le numéro doit contenir uniquement des chiffres")
            return v
        return None

    class Config:
        json_schema_extra = {
            "example": {
                "first_name": "Marie",
                "last_name": "Dupont",
                "email": "marie.dupont@example.com",
                "country_code": "CA",
                "phone_country_code": "+1",
                "phone": "5141234567"
            }
        }


# ═══════════════════════════════════════════════════════════════
# SCHEMA 2 : Inscription UTILISATEUR CONNECTÉ
# ═══════════════════════════════════════════════════════════════

class UserRegistrationCreate(BaseModel):
    """
    Inscription pour un utilisateur CONNECTÉ

    Les données personnelles sont récupérées depuis le compte de l'utilisateur.
    Il doit juste choisir le type de ticket.
    """
    ticket_id: Optional[int] = Field(None, description="ID du type de ticket à acheter (optionnel si événement sans tickets)")


# ═══════════════════════════════════════════════════════════════
# SCHEMA 3 : Réponse après inscription
# ═══════════════════════════════════════════════════════════════

class RegistrationResponse(BaseModel):
    """
    Réponse API après une inscription

    Contient toutes les informations de l'inscription + event + ticket
    """

    id: int

    # Type et statut
    registration_type: RegistrationType
    status: RegistrationStatus
    payment_status: PaymentStatus

    # IDs
    event_id: int
    user_id: Optional[int] = None
    ticket_id: Optional[int] = None

    # Informations invité (si applicable)
    guest_first_name: Optional[str] = None
    guest_last_name: Optional[str] = None
    guest_email: Optional[str] = None
    guest_country_code: Optional[str] = None
    guest_phone_full: Optional[str] = None

    # Paiement
    amount_paid: float
    currency: Optional[str] = None

    # QR Code
    qr_code_url: Optional[str] = None
    qr_code_data: Optional[str] = None

    # Notifications
    email_sent: bool
    sms_sent: bool

    # Dates
    registration_date: datetime
    waitlist_joined_at: Optional[datetime] = None
    offer_expires_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    # Relations (event + ticket)
    event: Optional[dict] = None  # Données de l'événement
    ticket: Optional[dict] = None  # Données du ticket

    class Config:
        from_attributes = True  # Permet de créer depuis un modèle SQLAlchemy


# ═══════════════════════════════════════════════════════════════
# SCHEMA 4 : Réponse détaillée avec informations de l'événement
# ═══════════════════════════════════════════════════════════════

class RegistrationDetailResponse(BaseModel):
    """
    Réponse détaillée avec les informations complètes
    de l'inscription ET de l'événement

    Utilisé pour :
    - Afficher l'historique d'inscriptions d'un utilisateur
    - Voir les détails d'une inscription
    """

    # Informations d'inscription
    id: int
    registration_type: RegistrationType
    status: RegistrationStatus
    payment_status: PaymentStatus
    registration_date: datetime

    # Informations du participant
    participant_name: str  # Nom complet (utilisateur ou invité)
    participant_email: str  # Email (utilisateur ou invité)
    participant_phone: Optional[str] = None

    # Informations de l'événement
    event_id: int
    event_title: str
    event_description: str
    event_format: str  # physical, virtual, hybrid
    event_start_date: datetime
    event_end_date: datetime
    event_location: Optional[str] = None
    event_image_url: Optional[str] = None

    # Informations virtuelles (si applicable)
    virtual_platform: Optional[str] = None
    virtual_meeting_url: Optional[str] = None
    virtual_meeting_id: Optional[str] = None
    virtual_meeting_password: Optional[str] = None
    virtual_instructions: Optional[str] = None

    # Paiement
    amount_paid: float
    currency: Optional[str] = None

    # QR Code
    qr_code_url: Optional[str] = None
    qr_code_data: Optional[str] = None

    # Notifications
    email_sent: bool
    sms_sent: bool

    class Config:
        from_attributes = True


# ═══════════════════════════════════════════════════════════════
# SCHEMA 5 : Réponse de paiement (Stripe)
# ═══════════════════════════════════════════════════════════════

class PaymentResponse(BaseModel):
    """
    Réponse après la création d'une session de paiement Stripe

    Contient l'URL de paiement où rediriger l'utilisateur
    """

    payment_url: str  # URL de la page de paiement Stripe
    session_id: str   # ID de la session Stripe

    class Config:
        json_schema_extra = {
            "example": {
                "payment_url": "https://checkout.stripe.com/c/pay/cs_test_...",
                "session_id": "cs_test_a1b2c3d4..."
            }
        }


class WaitlistResponse(BaseModel):
    message: str
    registration_id: int
    status: Literal["waitlist", "offered"] = "waitlist"
    offer_expires_at: Optional[datetime] = None


# ═══════════════════════════════════════════════════════════════
# SCHEMA 6 : Confirmation d'inscription gratuite
# ═══════════════════════════════════════════════════════════════

class FreeRegistrationResponse(BaseModel):
    """
    Réponse après une inscription à un événement GRATUIT

    L'inscription est confirmée immédiatement (pas de paiement)
    """

    message: str = "Inscription confirmée avec succès"
    registration_id: int
    qr_code_url: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "message": "Inscription confirmée avec succès",
                "registration_id": 42,
                "qr_code_url": "http://localhost:8000/uploads/qrcodes/abc123.png"
            }
        }


# ═══════════════════════════════════════════════════════════════
# SCHEMA 7 : Vérification de QR Code
# ═══════════════════════════════════════════════════════════════

class QRCodeVerifyRequest(BaseModel):
    """
    Requête pour vérifier un QR code scanné

    Utilisé à l'entrée de l'événement pour valider les billets
    """

    qr_code_data: str  # UUID du QR code
    event_id: Optional[int] = None  # Optionnel: forcer la vérification sur un événement précis

    class Config:
        json_schema_extra = {
            "example": {
                "qr_code_data": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
            }
        }


class QRCodeVerifyResponse(BaseModel):
    """
    Réponse après vérification d'un QR code
    """

    valid: bool
    message: str

    # Si valide, informations du participant et de l'événement
    participant_name: Optional[str] = None
    participant_email: Optional[str] = None
    event_title: Optional[str] = None
    event_date: Optional[datetime] = None
    registration_status: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "valid": True,
                "message": "QR code valide",
                "participant_name": "Marie Dupont",
                "participant_email": "marie@example.com",
                "event_title": "Conférence Tech Lomé 2025",
                "event_date": "2025-12-15T09:00:00",
                "registration_status": "confirmed"
            }
        }


# ═══════════════════════════════════════════════════════════════
# SCHEMA 8 : Confirmation paiement Stripe (fallback)
# ═══════════════════════════════════════════════════════════════

class ConfirmPaymentRequest(BaseModel):
    session_id: str


class ConfirmPaymentResponse(BaseModel):
    success: bool
    message: str
    registration_id: Optional[int] = None
    qr_code_url: Optional[str] = None
    email_sent: Optional[bool] = None
