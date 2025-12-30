"""Modèle Notification - Notifications in-app (cloche)"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, UniqueConstraint
from sqlalchemy.sql import func
from app.config.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    __table_args__ = (
        UniqueConstraint("user_id", "notification_type", "reference_id", name="uq_notification_ref"),
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    user_id = Column(Integer, nullable=False, index=True)

    # Type technique (ex: new_registration, payout_update, message...)
    notification_type = Column(String(50), nullable=False, index=True)

    # Référence optionnelle (ex: registration_id, payout_id, message_id)
    reference_id = Column(Integer, nullable=True, index=True)

    # Contenu
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=True)

    # Données supplémentaires (JSON string)
    data = Column(Text, nullable=True)

    # Statut de lecture
    is_read = Column(Boolean, nullable=False, default=False, index=True)
    read_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
