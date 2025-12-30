# Modèles de base de données (tables)
#
# IMPORTANT : L'ordre d'import est crucial pour que SQLAlchemy puisse résoudre
# correctement les relations entre les modèles (relationships)
#
# On importe dans cet ordre :
# 1. Modèles de base sans dépendances
# 2. Modèles avec foreign keys vers les modèles de base
# 3. Modèles avec relations complexes

from app.models.user import User
from app.models.category import Category
from app.models.tag import Tag, event_tags
from app.models.event import Event
from app.models.ticket import Ticket
from app.models.registration import Registration
from app.models.payout import Payout
from app.models.commission import CommissionSettings, CommissionTransaction

__all__ = [
    "User",
    "Category",
    "Tag",
    "Event",
    "Ticket",
    "Registration",
    "Payout",
    "CommissionSettings",
    "CommissionTransaction",
    "event_tags"
]
