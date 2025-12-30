"""
Schemas Tag - Validation des données pour les tags
"""

from pydantic import BaseModel
from typing import Optional


class TagResponse(BaseModel):
    """
    Schema pour retourner un tag
    """
    id: int
    name: str
    slug: str
    color: Optional[str] = None

    class Config:
        from_attributes = True
