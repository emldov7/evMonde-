from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class EventReminderCreate(BaseModel):
    scheduled_at: datetime
    message: Optional[str] = None


class EventReminderUpdate(BaseModel):
    scheduled_at: datetime
    message: Optional[str] = None


class EventReminderResponse(BaseModel):
    id: int
    event_id: int
    scheduled_at: datetime
    message: Optional[str] = None
    sent: bool
    sent_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class EventReminderWithEventResponse(BaseModel):
    id: int
    event_id: int
    event_title: str
    event_start_date: datetime
    scheduled_at: datetime
    message: Optional[str] = None
    sent: bool
    sent_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
