"""
Modèle Registration - Représente une inscription à un événement
Ce fichier définit la table 'registrations' dans PostgreSQL
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.config.database import Base


# ENUM 1 : Type d'inscription
class RegistrationType(str, enum.Enum):
    """
    Type d'inscription

    - USER : Utilisateur connecté avec un compte
    - GUEST : Invité sans compte (inscription anonyme)
    """
    USER = "user"      # Utilisateur avec compte
    GUEST = "guest"    # Invité sans compte


# ENUM 2 : Statut de l'inscription
class RegistrationStatus(str, enum.Enum):
    """
    Statut de l'inscription

    - PENDING : En attente (paiement en cours ou pas encore confirmé)
    - CONFIRMED : Confirmée (inscription validée, place réservée)
    - WAITLIST : En liste d'attente (événement complet)
    - OFFERED : Place proposée (payant) - en attente que la personne paye avant expiration
    - CANCELLED : Annulée par l'utilisateur
    - REFUNDED : Remboursée (paiement annulé et remboursé)
    """
    PENDING = "pending"        # En attente de confirmation/paiement
    CONFIRMED = "confirmed"    # Confirmée
    WAITLIST = "waitlist"      # Liste d'attente
    OFFERED = "offered"        # Offre envoyée (payant)
    CANCELLED = "cancelled"    # Annulée
    REFUNDED = "refunded"      # Remboursée


# ENUM 3 : Statut du paiement
class PaymentStatus(str, enum.Enum):
    """
    Statut du paiement

    - NOT_REQUIRED : Pas de paiement requis (événement gratuit)
    - PENDING : En attente de paiement
    - PAID : Payé
    - FAILED : Paiement échoué
    - REFUNDED : Remboursé
    """
    NOT_REQUIRED = "not_required"  # Événement gratuit
    PENDING = "pending"            # En attente
    PAID = "paid"                  # Payé
    FAILED = "failed"              # Échoué
    REFUNDED = "refunded"          # Remboursé


# TABLE : registrations
class Registration(Base):
    """
    Table des inscriptions aux événements

    Une inscription peut être :
    - Faite par un UTILISATEUR connecté (user_id renseigné)
    - Faite par un INVITÉ sans compte (guest_email renseigné)

    IMPORTANT : Quand un invité crée un compte avec le même email,
    toutes ses inscriptions invités sont automatiquement liées à son compte !
    """
    __tablename__ = "registrations"

    # Clé primaire
    id = Column(Integer, primary_key=True, index=True)

    # Type d'inscription : USER ou GUEST
    registration_type = Column(
        SQLEnum(RegistrationType),
        default=RegistrationType.USER,
        nullable=False,
        index=True
    )

    # Relations
    event_id = Column(
        Integer,
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # user_id est NULLABLE car un invité n'a pas de compte
    # Quand l'invité crée un compte, on lie l'inscription avec user_id
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )

    # ticket_id : Type de ticket acheté (Foreign Key vers Ticket)
    # NULLABLE pour les anciens événements sans système de tickets
    ticket_id = Column(
        Integer,
        ForeignKey("tickets.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # ═══════════════════════════════════════════════════════════════
    # INFORMATIONS INVITÉ (Guest)
    # Ces champs sont remplis seulement si registration_type = GUEST
    # ═══════════════════════════════════════════════════════════════

    guest_first_name = Column(String(100), nullable=True)
    guest_last_name = Column(String(100), nullable=True)

    # Email de l'invité (OBLIGATOIRE pour GUEST)
    # Cet email sera utilisé pour lier les inscriptions quand l'invité crée un compte
    guest_email = Column(String(255), nullable=True, index=True)

    # Pays et téléphone (OPTIONNELS pour GUEST)
    guest_country_code = Column(String(2), nullable=True)
    guest_phone_country_code = Column(String(5), nullable=True)
    guest_phone = Column(String(20), nullable=True)
    guest_phone_full = Column(String(30), nullable=True)

    # ═══════════════════════════════════════════════════════════════
    # INFORMATIONS D'INSCRIPTION
    # ═══════════════════════════════════════════════════════════════

    # Date d'inscription
    registration_date = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Liste d'attente (si événement complet)
    waitlist_joined_at = Column(DateTime, nullable=True)
    offer_expires_at = Column(DateTime, nullable=True)

    # Statut de l'inscription (PENDING, CONFIRMED, CANCELLED, REFUNDED)
    status = Column(
        SQLEnum(RegistrationStatus),
        default=RegistrationStatus.PENDING,
        nullable=False,
        index=True
    )

    # ═══════════════════════════════════════════════════════════════
    # INFORMATIONS DE PAIEMENT
    # ═══════════════════════════════════════════════════════════════

    # Statut du paiement
    payment_status = Column(
        SQLEnum(PaymentStatus),
        default=PaymentStatus.NOT_REQUIRED,
        nullable=False
    )

    # Montant payé (0 si gratuit)
    amount_paid = Column(Float, default=0.0, nullable=False)

    # Devise utilisée (XOF, CAD, EUR, etc.)
    currency = Column(String(3), nullable=True)

    # ═══════════════════════════════════════════════════════════════
    # STRIPE (Paiement)
    # ═══════════════════════════════════════════════════════════════

    # ID de la session Stripe
    stripe_session_id = Column(String(255), nullable=True, unique=True, index=True)

    # ID du PaymentIntent Stripe (preuve de paiement)
    stripe_payment_intent_id = Column(String(255), nullable=True, index=True)

    # ═══════════════════════════════════════════════════════════════
    # QR CODE (Billet électronique)
    # ═══════════════════════════════════════════════════════════════

    # URL de l'image du QR code
    # Exemple : "http://localhost:8000/uploads/qrcodes/abc123.png"
    qr_code_url = Column(String(500), nullable=True)

    # Données du QR code (UUID unique)
    # C'est ce qui est encodé dans le QR code
    # Utilisé pour vérifier la validité du billet à l'entrée
    qr_code_data = Column(String(500), unique=True, nullable=True, index=True)

    # ═══════════════════════════════════════════════════════════════
    # ANTI-FRAUDE : Tracking des scans du QR code
    # ═══════════════════════════════════════════════════════════════

    # Nombre de fois que le QR code a été scanné
    # 0 = Jamais scanné
    # 1 = Scanné une fois (NORMAL)
    # 2+ = ALERTE ! Possibilité de fraude
    scanned_count = Column(Integer, default=0, nullable=False)

    # Date et heure du PREMIER scan
    # Utilisé pour savoir quand le participant est entré
    first_scan_at = Column(DateTime, nullable=True)

    # Date et heure du DERNIER scan
    # Utilisé pour détecter les scans multiples
    last_scan_at = Column(DateTime, nullable=True)

    # IP ou identifiant de qui a scanné (optionnel)
    # Peut être utilisé pour tracer les scans frauduleux
    scanned_by = Column(String(255), nullable=True)

    # ═══════════════════════════════════════════════════════════════
    # NOTIFICATIONS (Email + SMS)
    # ═══════════════════════════════════════════════════════════════

    # Email de confirmation envoyé ?
    email_sent = Column(Boolean, default=False)
    email_sent_at = Column(DateTime, nullable=True)

    # SMS de confirmation envoyé ?
    sms_sent = Column(Boolean, default=False)
    sms_sent_at = Column(DateTime, nullable=True)

    # ═══════════════════════════════════════════════════════════════
    # TIMESTAMPS
    # ═══════════════════════════════════════════════════════════════

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # ═══════════════════════════════════════════════════════════════
    # RELATIONS SQLAlchemy
    # ═══════════════════════════════════════════════════════════════

    # Relation avec Event (un événement peut avoir plusieurs inscriptions)
    event = relationship("Event", back_populates="registrations")

    # Relation avec User (un utilisateur peut avoir plusieurs inscriptions)
    user = relationship("User", back_populates="registrations")

    # Relation avec Ticket (un ticket peut avoir plusieurs inscriptions)
    ticket = relationship("Ticket", back_populates="registrations")

    def __repr__(self):
        """Représentation en string pour le debugging"""
        if self.registration_type == RegistrationType.USER:
            return f"<Registration(id={self.id}, type=USER, user_id={self.user_id}, event_id={self.event_id}, status={self.status})>"
        else:
            return f"<Registration(id={self.id}, type=GUEST, email={self.guest_email}, event_id={self.event_id}, status={self.status})>"

    def get_participant_email(self) -> str:
        """
        Retourne l'email du participant (utilisateur ou invité)

        Returns:
            str: L'email du participant
        """
        if self.registration_type == RegistrationType.USER and self.user:
            return self.user.email
        return self.guest_email

    def get_participant_name(self) -> str:
        """
        Retourne le nom complet du participant (utilisateur ou invité)

        Returns:
            str: Le nom complet
        """
        if self.registration_type == RegistrationType.USER and self.user:
            return f"{self.user.first_name} {self.user.last_name}"
        return f"{self.guest_first_name} {self.guest_last_name}"

    def get_participant_phone(self) -> str:
        """
        Retourne le téléphone du participant (utilisateur ou invité)

        Returns:
            str: Le numéro de téléphone complet ou None
        """
        if self.registration_type == RegistrationType.USER and self.user:
            return self.user.phone_full
        return self.guest_phone_full
