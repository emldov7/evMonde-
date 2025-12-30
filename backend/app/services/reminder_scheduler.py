import json
from datetime import datetime, timedelta

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session

from app.config.database import SessionLocal
from app.models.event import Event
from app.models.event_reminder import EventReminder
from app.models.notification import Notification
from app.models.notification_preferences import NotificationPreferences
from app.models.registration import Registration, RegistrationStatus
from app.services.email_service import send_email


def _get_or_create_notification_preferences(db: Session, user_id: int) -> NotificationPreferences:
    prefs = db.query(NotificationPreferences).filter(NotificationPreferences.user_id == user_id).first()
    if prefs:
        return prefs

    prefs = NotificationPreferences(user_id=user_id)
    db.add(prefs)
    db.commit()
    db.refresh(prefs)
    return prefs


def _create_inapp_notification_if_missing(
    db: Session,
    user_id: int,
    notification_type: str,
    title: str,
    body: str,
    reference_id: int | None = None,
    data: dict | None = None,
) -> None:
    existing = db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.notification_type == notification_type,
        Notification.reference_id == reference_id,
    ).first()

    if existing:
        return

    notif = Notification(
        user_id=user_id,
        notification_type=notification_type,
        reference_id=reference_id,
        title=title,
        body=body,
        data=json.dumps(data) if data else None,
        is_read=False,
    )
    db.add(notif)
    db.commit()


def _send_event_reminder_email(
    to_email: str,
    participant_name: str,
    event_title: str,
    event_date: str,
    time_remaining: str,
    message: str | None,
) -> bool:
    subject = f"⏰ Rappel : {event_title} ({time_remaining})"

    extra = f"<p style=\"margin:0 0 12px;\"><strong>Message :</strong> {message}</p>" if message else ""

    html_content = f"""
    <!DOCTYPE html>
    <html lang=\"fr\">
    <head>
      <meta charset=\"UTF-8\" />
      <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
      <title>Rappel événement</title>
    </head>
    <body style=\"font-family: Arial, sans-serif; background:#f4f4f4; margin:0; padding:0;\">
      <div style=\"max-width:600px; margin:20px auto; background:#fff; border-radius:10px; overflow:hidden; box-shadow:0 4px 6px rgba(0,0,0,0.1);\">
        <div style=\"background:linear-gradient(135deg,#7c3aed 0%,#ec4899 100%); color:#fff; padding:24px;\">
          <h2 style=\"margin:0;\">⏰ Rappel événement</h2>
          <p style=\"margin:8px 0 0; opacity:0.95;\">{event_title}</p>
        </div>
        <div style=\"padding:24px; color:#111827;\">
          <p>Bonjour <strong>{participant_name}</strong>,</p>
          <p>Petit rappel : votre événement <strong>{event_title}</strong> commence dans <strong>{time_remaining}</strong>.</p>
          <p><strong>Date :</strong> {event_date}</p>
          {extra}
          <p style=\"color:#6b7280; font-size:12px;\">Cet email a été envoyé automatiquement.</p>
        </div>
      </div>
    </body>
    </html>
    """

    return send_email(to_email=to_email, subject=subject, html_content=html_content)


def process_due_event_reminders() -> None:
    db: Session = SessionLocal()
    try:
        now = datetime.now()
        grace = now - timedelta(minutes=2)

        reminders = (
            db.query(EventReminder)
            .filter(EventReminder.sent == False)
            .filter(EventReminder.scheduled_at <= now)
            .filter(EventReminder.scheduled_at >= grace)
            .order_by(EventReminder.scheduled_at.asc())
            .all()
        )

        for reminder in reminders:
            event = db.query(Event).filter(Event.id == reminder.event_id).first()
            if not event:
                reminder.sent = True
                reminder.sent_at = now
                db.commit()
                continue

            registrations = (
                db.query(Registration)
                .filter(Registration.event_id == event.id)
                .filter(Registration.status == RegistrationStatus.CONFIRMED)
                .all()
            )

            # Calcul “temps restant” basé sur start_date
            try:
                delta = event.start_date - now
                mins = max(0, int(delta.total_seconds() // 60))
                if mins >= 60:
                    hours = mins // 60
                    rem_mins = mins % 60
                    time_remaining = f"{hours}h {rem_mins}min" if rem_mins else f"{hours}h"
                else:
                    time_remaining = f"{mins}min"
            except Exception:
                time_remaining = "bientôt"

            event_date_str = event.start_date.strftime("%d/%m/%Y à %H:%M")

            for reg in registrations:
                participant_email = reg.get_participant_email() or ""
                participant_name = reg.get_participant_name() or "Participant"

                if participant_email:
                    try:
                        _send_event_reminder_email(
                            to_email=participant_email,
                            participant_name=participant_name,
                            event_title=event.title,
                            event_date=event_date_str,
                            time_remaining=time_remaining,
                            message=reminder.message,
                        )
                    except Exception as e:
                        print(f"⚠️ reminder email error: {e}")

                # Notification cloche seulement si user_id (compte)
                if reg.user_id:
                    prefs = _get_or_create_notification_preferences(db, reg.user_id)
                    if prefs.event_reminder:
                        try:
                            _create_inapp_notification_if_missing(
                                db=db,
                                user_id=reg.user_id,
                                notification_type="event_reminder",
                                reference_id=reminder.id,
                                title="Rappel événement",
                                body=f"{event.title} commence dans {time_remaining}.",
                                data={"event_id": event.id, "reminder_id": reminder.id},
                            )
                        except Exception as e:
                            print(f"⚠️ reminder in-app error: {e}")

            reminder.sent = True
            reminder.sent_at = now
            db.commit()

    finally:
        db.close()


def start_reminder_scheduler() -> BackgroundScheduler:
    scheduler = BackgroundScheduler(timezone="UTC")
    scheduler.add_job(process_due_event_reminders, "interval", minutes=1, id="event_reminders")
    scheduler.start()
    return scheduler
