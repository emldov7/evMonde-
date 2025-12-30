"""
Modèle Payout - Demandes de retrait des organisateurs

Processus de payout :
1. Organisateur voit ses revenus disponibles dans son dashboard
2. Organisateur demande un payout (retrait)
3. Admin voit la demande dans son interface
4. Admin approuve et effectue le payout via Stripe Connect
5. L'argent est transféré sur le compte bancaire de l'organisateur
"""

from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.config.database import Base
import enum


class PayoutStatus(str, enum.Enum):
    """Statuts d'une demande de payout"""
    PENDING = "pending"          # En attente d'approbation admin
    APPROVED = "approved"        # Approuvée par admin
    PROCESSING = "processing"    # En cours de traitement Stripe
    COMPLETED = "completed"      # Payout effectué avec succès
    REJECTED = "rejected"        # Rejetée par admin
    FAILED = "failed"            # Échec technique (Stripe)
    CANCELLED = "cancelled"      # Annulée par l'organisateur


class Payout(Base):
    """
    Demande de payout (retrait) d'un organisateur

    Chaque fois qu'un organisateur veut retirer ses revenus,
    il crée une demande de payout que l'admin doit approuver.
    """

    __tablename__ = "payouts"

    # ID unique
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # ID de l'organisateur qui demande le payout
    organizer_id = Column(Integer, nullable=False, index=True)

    # Montant demandé
    amount = Column(Float, nullable=False)

    # Devise (XOF, CAD, EUR...)
    currency = Column(String(3), nullable=False)

    # Statut
    status = Column(SQLEnum(PayoutStatus), default=PayoutStatus.PENDING, nullable=False, index=True)

    # Méthode de paiement
    # (bank_transfer, mobile_money, stripe_connect, paypal...)
    payout_method = Column(String(50), nullable=False)

    # Informations bancaires de l'organisateur (chiffré en prod)
    # Ex: IBAN, numéro de compte, etc.
    account_details = Column(Text, nullable=True)

    # ID du payout Stripe (si Stripe Connect)
    stripe_payout_id = Column(String(255), nullable=True, unique=True, index=True)

    # Message de l'organisateur (optionnel)
    organizer_message = Column(Text, nullable=True)

    # Notes admin (raison du rejet, commentaires...)
    admin_notes = Column(Text, nullable=True)

    # ID de l'admin qui a traité la demande
    processed_by_admin_id = Column(Integer, nullable=True)

    # Dates importantes
    requested_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    rejected_at = Column(DateTime(timezone=True), nullable=True)

    # Relation vers l'organisateur
    # organizer = relationship("User", foreign_keys=[organizer_id])

    def __repr__(self):
        return f"Payout(organizer_id={self.organizer_id}, amount={self.amount} {self.currency}, status={self.status.value})"
