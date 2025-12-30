"""
Modèle Commission - Commissions de la plateforme

Géré uniquement par les ADMINS.
Définit le pourcentage prélevé sur chaque vente.

Le système de commission fonctionne ainsi :
1. Admin définit une commission globale (ex: 5%)
2. Admin peut définir des commissions spécifiques par catégorie
3. Commission calculée automatiquement sur chaque paiement
4. L'argent va sur le compte Stripe de la plateforme
5. Organisateurs demandent des payouts pour recevoir leur part
"""

from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from app.config.database import Base


class CommissionSettings(Base):
    """
    Configuration des commissions de la plateforme

    Il n'y a qu'UNE SEULE ligne dans cette table (singleton)
    qui contient la configuration globale des commissions.
    """

    __tablename__ = "commission_settings"

    # ID (toujours 1)
    id = Column(Integer, primary_key=True, default=1)

    # Commission globale par défaut (en pourcentage)
    # Ex: 5.0 = 5%
    default_commission_rate = Column(Float, default=5.0, nullable=False)

    # Commission minimale en montant fixe (pour couvrir les frais)
    # Ex: 1.0 = 1 dollar/euro minimum
    minimum_commission_amount = Column(Float, default=0.0, nullable=False)

    # Activer/Désactiver le système de commission
    is_active = Column(Boolean, default=True, nullable=False)

    # Notes admin (raison du taux, stratégie, etc.)
    notes = Column(Text, nullable=True)

    # Dates
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"CommissionSettings(rate={self.default_commission_rate}%)"


class CommissionTransaction(Base):
    """
    Historique des commissions prélevées

    Chaque fois qu'un paiement est effectué, on enregistre la commission.
    Cela permet de tracer tous les revenus de la plateforme.
    """

    __tablename__ = "commission_transactions"

    # ID unique
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # ID de l'inscription (registration) concernée
    registration_id = Column(Integer, nullable=False, index=True)

    # ID de l'événement
    event_id = Column(Integer, nullable=False, index=True)

    # ID de l'organisateur
    organizer_id = Column(Integer, nullable=False, index=True)

    # Montant du billet
    ticket_amount = Column(Float, nullable=False)

    # Taux de commission appliqué (%)
    commission_rate = Column(Float, nullable=False)

    # Montant de la commission prélevée
    commission_amount = Column(Float, nullable=False)

    # Montant net pour l'organisateur (ticket_amount - commission_amount)
    net_amount = Column(Float, nullable=False)

    # Devise (XOF, CAD, EUR...)
    currency = Column(String(3), nullable=False)

    # ID du paiement Stripe
    stripe_payment_intent_id = Column(String(255), nullable=True, index=True)

    # Notes (optionnel)
    notes = Column(Text, nullable=True)

    # Date de création
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"Commission(amount={self.commission_amount} {self.currency}, rate={self.commission_rate}%)"
