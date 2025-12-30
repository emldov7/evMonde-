from pydantic import BaseModel


class NotificationPreferencesBase(BaseModel):
    new_registration: bool = True
    event_reminder: bool = True
    payout_update: bool = True
    new_message: bool = True
    weekly_report: bool = True


class NotificationPreferencesUpdate(NotificationPreferencesBase):
    pass


class NotificationPreferencesResponse(NotificationPreferencesBase):
    class Config:
        from_attributes = True
