"""
Modèle Tag - Tags pour événements

Créés et gérés uniquement par les ADMINS.
Les organisateurs peuvent ajouter plusieurs tags à un événement.

Exemples : gratuit, payant, enfants, adultes, en-ligne, présentiel, weekend...
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Table, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.config.database import Base


# Table d'association Many-to-Many entre Event et Tag
event_tags = Table(
    'event_tags',
    Base.metadata,
    Column('event_id', Integer, ForeignKey('events.id', ondelete='CASCADE'), primary_key=True),
    Column('tag_id', Integer, ForeignKey('tags.id', ondelete='CASCADE'), primary_key=True),
    Column('created_at', DateTime(timezone=True), server_default=func.now())
)


class Tag(Base):
    """
    Tag pour événements

    Un tag est un label qui décrit une caractéristique de l'événement.
    Un événement peut avoir plusieurs tags.

    Exemples : gratuit, payant, enfants, adultes, en-ligne, weekend
    """

    __tablename__ = "tags"

    # ID unique
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Nom du tag (ex: "Gratuit", "Enfants", "Weekend")
    name = Column(String(50), unique=True, nullable=False, index=True)

    # Slug pour l'URL (ex: "gratuit", "enfants", "weekend")
    slug = Column(String(50), unique=True, nullable=False, index=True)

    # Couleur (hex code pour le frontend)
    color = Column(String(7), nullable=True)  # Ex: "#4CAF50"

    # Tag actif ou désactivé
    is_active = Column(Boolean, default=True, nullable=False)

    # Dates
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relations
    # events : Tous les événements qui ont ce tag
    events = relationship("Event", secondary=event_tags, back_populates="tags")

    def __repr__(self):
        return f"Tag(name={self.name}, slug={self.slug})"
