from sqlalchemy import Column, Integer, DateTime, Boolean, Text, UniqueConstraint, ForeignKey
from sqlalchemy.sql import func
from app.config.database import Base


class EventReminder(Base):
    __tablename__ = "event_reminders"

    __table_args__ = (
        UniqueConstraint("event_id", "scheduled_at", name="uq_event_reminder_event_scheduled"),
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)

    scheduled_at = Column(DateTime, nullable=False, index=True)

    message = Column(Text, nullable=True)

    sent = Column(Boolean, nullable=False, default=False, index=True)
    sent_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)
