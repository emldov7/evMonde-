import json
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models.event import Event
from app.models.registration import Registration, RegistrationStatus, PaymentStatus
from app.models.ticket import Ticket
from app.models.notification import Notification
from app.models.notification_preferences import NotificationPreferences
from app.services.email_service import send_email, send_registration_confirmation_email
from app.services.stripe_service import create_checkout_session
from app.utils.qrcode_generator import generate_registration_qr_code


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


def _send_waitlist_offer_email(
    to_email: str,
    participant_name: str,
    event_title: str,
    payment_url: str,
    offer_expires_at: datetime,
) -> bool:
    expires_str = offer_expires_at.strftime("%d/%m/%Y à %H:%M")
    subject = f"🎟️ Une place s'est libérée : {event_title}"

    html_content = f"""
    <!DOCTYPE html>
    <html lang=\"fr\">
    <head>
      <meta charset=\"UTF-8\" />
      <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
      <title>Place disponible</title>
    </head>
    <body style=\"font-family: Arial, sans-serif; background:#f4f4f4; margin:0; padding:0;\">
      <div style=\"max-width:600px; margin:20px auto; background:#fff; border-radius:10px; overflow:hidden; box-shadow:0 4px 6px rgba(0,0,0,0.1);\">
        <div style=\"background:linear-gradient(135deg,#7c3aed 0%,#ec4899 100%); color:#fff; padding:24px;\">
          <h2 style=\"margin:0;\">🎟️ Une place s'est libérée</h2>
          <p style=\"margin:8px 0 0; opacity:0.95;\">{event_title}</p>
        </div>
        <div style=\"padding:24px; color:#111827;\">
          <p>Bonjour <strong>{participant_name}</strong>,</p>
          <p>Une place vient de se libérer. Vous avez <strong>1 heure</strong> pour finaliser votre achat.</p>
          <p><strong>Date limite :</strong> {expires_str}</p>
          <p style=\"margin:20px 0;\">
            <a href=\"{payment_url}\" style=\"display:inline-block; background:#7c3aed; color:#fff; padding:12px 18px; border-radius:8px; text-decoration:none;\">
              Payer maintenant
            </a>
          </p>
          <p style=\"color:#6b7280; font-size:12px;\">Si vous ne payez pas avant la date limite, la place sera proposée à la personne suivante.</p>
        </div>
      </div>
    </body>
    </html>
    """

    return send_email(to_email=to_email, subject=subject, html_content=html_content)


def allocate_waitlist_if_possible(db: Session, event_id: int) -> None:
    now = datetime.utcnow()

    event = (
        db.query(Event)
        .filter(Event.id == event_id)
        .with_for_update()
        .first()
    )

    if not event:
        return

    available = event.available_seats or 0
    if available <= 0:
        return

    candidate = (
        db.query(Registration)
        .filter(Registration.event_id == event_id)
        .filter(Registration.status == RegistrationStatus.WAITLIST)
        .order_by(Registration.waitlist_joined_at.asc())
        .with_for_update()
        .first()
    )

    if not candidate:
        return

    if event.is_free:
        qr_code_data, qr_code_path = generate_registration_qr_code()
        candidate.qr_code_data = qr_code_data
        candidate.qr_code_url = f"{settings.BACKEND_URL}/{qr_code_path}"
        candidate.status = RegistrationStatus.CONFIRMED
        candidate.payment_status = PaymentStatus.NOT_REQUIRED
        candidate.offer_expires_at = None

        event.available_seats = max(0, (event.available_seats or 0) - 1)

        if candidate.ticket_id:
            ticket = db.query(Ticket).filter(Ticket.id == candidate.ticket_id).first()
            if ticket:
                ticket.quantity_sold += 1

        db.commit()
        db.refresh(candidate)

        try:
            participant_name = candidate.get_participant_name() or "Participant"
            participant_email = candidate.get_participant_email() or ""
            if participant_email:
                event_date_str = event.start_date.strftime("%d/%m/%Y à %H:%M")
                send_registration_confirmation_email(
                    to_email=participant_email,
                    participant_name=participant_name,
                    event_title=event.title,
                    event_date=event_date_str,
                    event_location=event.location if event.event_format != "virtual" else None,
                    event_format=event.event_format,
                    qr_code_url=candidate.qr_code_url,
                    qr_code_path=qr_code_path,
                    virtual_meeting_url=event.virtual_meeting_url if event.event_format in ["virtual", "hybrid"] else None,
                )

            if candidate.user_id:
                prefs = _get_or_create_notification_preferences(db, candidate.user_id)
                if getattr(prefs, "new_registration", False):
                    _create_inapp_notification_if_missing(
                        db=db,
                        user_id=candidate.user_id,
                        notification_type="waitlist_confirmed",
                        reference_id=candidate.id,
                        title="Place confirmée",
                        body=f"Votre place pour {event.title} est confirmée.",
                        data={"event_id": event.id, "registration_id": candidate.id},
                    )
        except Exception as e:
            print(f"⚠️ waitlist confirm email/notif error: {e}")

        return

    candidate.status = RegistrationStatus.OFFERED
    candidate.offer_expires_at = now + timedelta(hours=1)

    event.available_seats = max(0, (event.available_seats or 0) - 1)

    db.commit()
    db.refresh(candidate)

    try:
        from app.config.settings import settings

        success_url = f"{settings.FRONTEND_URL}/events/{event_id}/payment/success"
        cancel_url = f"{settings.FRONTEND_URL}/events/{event_id}/payment/cancel"

        participant_name = candidate.get_participant_name() or "Participant"
        participant_email = candidate.get_participant_email() or ""

        ticket_name = ""
        ticket_price = float(candidate.amount_paid or 0.0)
        if candidate.ticket_id:
            ticket = db.query(Ticket).filter(Ticket.id == candidate.ticket_id).first()
            if ticket:
                ticket_name = f" - {ticket.name}"
                ticket_price = float(ticket.price)

        session = create_checkout_session(
            registration_id=candidate.id,
            event_title=f"{event.title}{ticket_name}",
            event_price=ticket_price,
            currency=event.currency,
            participant_email=participant_email,
            participant_name=participant_name,
            success_url=success_url,
            cancel_url=cancel_url,
        )

        if session:
            candidate.stripe_session_id = session.id
            db.commit()

            if participant_email and session.url:
                _send_waitlist_offer_email(
                    to_email=participant_email,
                    participant_name=participant_name,
                    event_title=event.title,
                    payment_url=session.url,
                    offer_expires_at=candidate.offer_expires_at,
                )

            if candidate.user_id:
                prefs = _get_or_create_notification_preferences(db, candidate.user_id)
                if getattr(prefs, "new_registration", False):
                    _create_inapp_notification_if_missing(
                        db=db,
                        user_id=candidate.user_id,
                        notification_type="waitlist_offered",
                        reference_id=candidate.id,
                        title="Place disponible",
                        body=f"Une place s'est libérée pour {event.title}. Vous avez 1h pour payer.",
                        data={"event_id": event.id, "registration_id": candidate.id, "expires_at": candidate.offer_expires_at.isoformat()},
                    )
    except Exception as e:
        print(f"⚠️ waitlist offer error: {e}")


def expire_offers_and_reallocate(db: Session) -> None:
    now = datetime.utcnow()

    expired = (
        db.query(Registration)
        .filter(Registration.status == RegistrationStatus.OFFERED)
        .filter(Registration.offer_expires_at != None)
        .filter(Registration.offer_expires_at < now)
        .order_by(Registration.offer_expires_at.asc())
        .all()
    )

    touched_event_ids: set[int] = set()

    for reg in expired:
        event = db.query(Event).filter(Event.id == reg.event_id).with_for_update().first()
        if not event:
            continue

        reg.status = RegistrationStatus.WAITLIST
        reg.offer_expires_at = None
        reg.stripe_session_id = None

        event.available_seats = (event.available_seats or 0) + 1

        touched_event_ids.add(event.id)

    if expired:
        db.commit()

    for ev_id in touched_event_ids:
        try:
            allocate_waitlist_if_possible(db=db, event_id=ev_id)
        except Exception as e:
            print(f"⚠️ waitlist reallocate error (event {ev_id}): {e}")
