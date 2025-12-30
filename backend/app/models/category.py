"""
Modèle Category - Catégories d'événements

Créées et gérées uniquement par les ADMINS.
Les organisateurs choisissent parmi les catégories existantes.

Exemples : Musique, Sport, Tech, Business, Art, Éducation...
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.config.database import Base


class Category(Base):
    """
    Catégorie d'événement

    Une catégorie regroupe des événements similaires.
    Exemples : Musique, Sport, Technologie, Business, Art, etc.
    """

    __tablename__ = "categories"

    # ID unique
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Nom de la catégorie (ex: "Musique", "Sport", "Tech")
    name = Column(String(100), unique=True, nullable=False, index=True)

    # Slug pour l'URL (ex: "musique", "sport", "tech")
    slug = Column(String(100), unique=True, nullable=False, index=True)

    # Description de la catégorie
    description = Column(Text, nullable=True)

    # Icône (emoji ou nom d'icône)
    icon = Column(String(50), nullable=True)

    # Couleur (hex code pour le frontend)
    color = Column(String(7), nullable=True)  # Ex: "#FF5733"

    # Catégorie active ou désactivée
    is_active = Column(Boolean, default=True, nullable=False)

    # Ordre d'affichage (pour trier les catégories)
    display_order = Column(Integer, default=0, nullable=False)

    # Commission spécifique pour cette catégorie (optionnel)
    # Si NULL, on utilise la commission globale
    custom_commission_rate = Column(Float, nullable=True)  # En pourcentage (ex: 5.0 = 5%, 8.5 = 8.5%)

    # Dates
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relations
    # events : Tous les événements de cette catégorie
    events = relationship("Event", back_populates="category")

    def __repr__(self):
        return f"Category(name={self.name}, slug={self.slug})"
