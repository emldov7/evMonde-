"""
Schemas Ticket - Validation des données pour les billets
"""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


# SCHEMA 1: Base commune
class TicketBase(BaseModel):
    """
    Schema de base pour un ticket
    """
    name: str = Field(..., min_length=2, max_length=100, description="Nom du type de ticket")
    description: Optional[str] = Field(None, max_length=500, description="Description du ticket")
    price: float = Field(..., ge=0, description="Prix du ticket (>= 0)")
    currency: str = Field(..., min_length=3, max_length=3, description="Devise (CAD, EUR, XOF)")
    quantity_available: int = Field(..., gt=0, description="Nombre de places disponibles (> 0)")
    is_active: bool = Field(default=True, description="Le ticket est-il actif ?")


# SCHEMA 2: Création d'un ticket (utilisé dans EventCreate)
class TicketCreate(TicketBase):
    """
    Schema pour créer un ticket lors de la création d'un événement
    """
    pass


# SCHEMA 3: Mise à jour d'un ticket
class TicketUpdate(BaseModel):
    """
    Schema pour mettre à jour un ticket existant
    Tous les champs sont optionnels
    """
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    price: Optional[float] = Field(None, ge=0)
    quantity_available: Optional[int] = Field(None, gt=0)
    is_active: Optional[bool] = None


# SCHEMA 4: Réponse Ticket
class TicketResponse(TicketBase):
    """
    Schema pour retourner un ticket
    Inclut les champs calculés et auto-générés
    """
    id: int
    event_id: int
    quantity_sold: int
    quantity_remaining: int
    is_sold_out: bool
    percentage_sold: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True  # Support des objets SQLAlchemy
