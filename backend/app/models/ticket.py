"""
Modèle Ticket - Représente un type de billet pour un événement
Permet de créer plusieurs types de billets avec prix et places différents
"""

from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.config.database import Base


class Ticket(Base):
    """
    Modèle Ticket - Représente un type de billet pour un événement

    Exemple d'utilisation:
    - Un événement "Concert de Jazz" peut avoir:
      * Ticket "Standard" : 50 CAD, 150 places
      * Ticket "VIP" : 100 CAD, 50 places
      * Ticket "Étudiant" : 25 CAD, 30 places

    Relations:
    - event : Lien vers l'Event auquel appartient ce ticket (Many-to-One)
    - registrations : Liste des inscriptions pour ce type de ticket (One-to-Many)
    """

    __tablename__ = "tickets"

    # ═══════════════════════════════════════════════════════════════
    # CHAMPS PRINCIPAUX
    # ═══════════════════════════════════════════════════════════════

    # ID unique du ticket
    id = Column(Integer, primary_key=True, index=True)

    # ID de l'événement (Foreign Key)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    # CASCADE: Si l'événement est supprimé, tous ses tickets sont supprimés

    # Nom du type de ticket
    name = Column(String(100), nullable=False)
    # Exemples: "Standard", "VIP", "Étudiant", "Early Bird", "Groupe"

    # Description du ticket
    description = Column(String(500), nullable=True)
    # Exemple: "Accès général + boissons incluses"

    # Prix du ticket
    price = Column(Float, nullable=False)
    # Exemple: 50.0 (en CAD, EUR, ou XOF selon la devise de l'événement)

    # Devise (héritée de l'événement, mais stockée pour éviter les jointures)
    currency = Column(String(3), nullable=False)
    # Exemple: "CAD", "EUR", "XOF"

    # Quantité disponible pour ce type de ticket
    quantity_available = Column(Integer, nullable=False)
    # Exemple: 150 places pour "Standard"

    # Quantité vendue
    quantity_sold = Column(Integer, default=0, nullable=False)
    # Incrémenté à chaque vente

    # Est-ce que ce type de ticket est actif ?
    is_active = Column(Boolean, default=True, nullable=False)
    # L'organisateur peut désactiver un type de ticket sans le supprimer

    # ═══════════════════════════════════════════════════════════════
    # CHAMPS TEMPORELS
    # ═══════════════════════════════════════════════════════════════

    # Date de création du ticket
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Date de dernière modification
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # ═══════════════════════════════════════════════════════════════
    # RELATIONS
    # ═══════════════════════════════════════════════════════════════

    # Lien vers l'événement
    event = relationship("Event", back_populates="tickets")

    # Lien vers les inscriptions (registrations) pour ce ticket
    registrations = relationship("Registration", back_populates="ticket", cascade="all, delete-orphan")

    # ═══════════════════════════════════════════════════════════════
    # PROPRIÉTÉS CALCULÉES
    # ═══════════════════════════════════════════════════════════════

    @property
    def quantity_remaining(self):
        """
        Calcule le nombre de places restantes pour ce type de ticket
        """
        return self.quantity_available - self.quantity_sold

    @property
    def is_sold_out(self):
        """
        Vérifie si ce type de ticket est complet
        """
        return self.quantity_sold >= self.quantity_available

    @property
    def percentage_sold(self):
        """
        Calcule le pourcentage de billets vendus
        """
        if self.quantity_available == 0:
            return 0
        return round((self.quantity_sold / self.quantity_available) * 100, 2)
