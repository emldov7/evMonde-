"""
Routes Registrations - Gestion des inscriptions aux événements
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.config.database import get_db
from app.models.user import User
from app.models.event import Event, EventStatus, EventFormat
from app.models.registration import Registration, RegistrationType, RegistrationStatus, PaymentStatus
from app.models.ticket import Ticket
from app.models.notification_preferences import NotificationPreferences
from app.models.notification import Notification
from app.schemas.registration import (
    GuestRegistrationCreate,
    UserRegistrationCreate,
    RegistrationResponse,
    FreeRegistrationResponse,
    RegistrationDetailResponse,
    QRCodeVerifyRequest,
    QRCodeVerifyResponse,
    ConfirmPaymentRequest,
    ConfirmPaymentResponse,
    WaitlistResponse
)
from app.api.deps import get_current_user, get_current_organizer_or_admin
from app.utils.qrcode_generator import generate_registration_qr_code
from app.services.email_service import send_registration_confirmation_email, send_organizer_new_registration_email
from app.services.stripe_service import create_checkout_session, create_refund
from app.schemas.registration import PaymentResponse
from app.services.waitlist_service import allocate_waitlist_if_possible
from datetime import datetime, timedelta


# Créer le routeur
router = APIRouter()


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
    data: str | None = None,
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
        data=data,
        is_read=False,
    )
    db.add(notif)
    db.commit()


# ═══════════════════════════════════════════════════════════════
# FONCTION HELPER : Validation du ticket
# ═══════════════════════════════════════════════════════════════

def validate_and_get_ticket(event_id: int, ticket_id: int, db: Session) -> Ticket:
    """
    Valide qu'un ticket existe, appartient à l'événement, est actif et disponible

    Raises:
        HTTPException si le ticket est invalide

    Returns:
        L'objet Ticket valide
    """
    # Récupérer le ticket
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()

    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Type de ticket introuvable"
        )

    # Vérifier que le ticket appartient bien à cet événement
    if ticket.event_id != event_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ce type de ticket n'appartient pas à cet événement"
        )

    # Vérifier que le ticket est actif
    if not ticket.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ce type de ticket n'est plus disponible"
        )

    # Vérifier qu'il reste des places pour ce type de ticket
    if ticket.is_sold_out:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Sold out ! Le ticket '{ticket.name}' n'est plus disponible"
        )

    return ticket


# ═══════════════════════════════════════════════════════════════
# ROUTE 1 : Inscription INVITÉ (Guest) - Événement GRATUIT
# ═══════════════════════════════════════════════════════════════

@router.post("/events/{event_id}/register/guest", response_model=FreeRegistrationResponse | WaitlistResponse, status_code=status.HTTP_201_CREATED)
def register_guest_to_event(
    event_id: int,
    guest_data: GuestRegistrationCreate,
    db: Session = Depends(get_db)
):
    """
    Inscription d'un INVITÉ (sans compte) à un événement

    **PAS d'authentification requise** - N'importe qui peut s'inscrire

    Cette route permet à quelqu'un SANS compte de s'inscrire à un événement.

    **IMPORTANT** : Cette route gère UNIQUEMENT les événements GRATUITS.
    Pour les événements payants, il faut d'abord créer une session Stripe
    (on ajoutera ça après).

    **Processus** :
    1. Vérifier que l'événement existe et est publié
    2. Vérifier qu'il reste des places
    3. Vérifier que l'email n'est pas déjà inscrit
    4. Créer l'inscription
    5. Générer un QR code unique
    6. Réduire le nombre de places disponibles
    7. Envoyer email + SMS de confirmation (TODO)

    **Exemple de requête** :
    ```json
    {
        "first_name": "Marie",
        "last_name": "Dupont",
        "email": "marie@example.com",
        "country_code": "CA",
        "phone_country_code": "+1",
        "phone": "5141234567"
    }
    ```

    **Exemple de réponse** :
    ```json
    {
        "message": "Inscription confirmée avec succès",
        "registration_id": 1,
        "qr_code_url": "http://localhost:8000/uploads/qrcodes/abc123.png"
    }
    ```
    """

    # ÉTAPE 1 : Vérifier que l'événement existe et est publié
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.status == EventStatus.PUBLISHED
    ).first()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Événement non trouvé ou pas encore publié"
        )

    # ÉTAPE 2 : Vérifier que c'est un événement GRATUIT
    # (Pour les payants, on utilisera une autre route avec Stripe)
    if not event.is_free:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cet événement est payant. Veuillez utiliser la route de paiement."
        )

    # ÉTAPE 3 : Valider le ticket (optionnel si l'événement n'a pas de tickets)
    ticket = None
    if guest_data.ticket_id is not None:
        ticket = validate_and_get_ticket(event_id, guest_data.ticket_id, db)

    # Vérifier qu'il reste des places dans l'événement (global)
    if event.available_seats <= 0:
        # Événement complet -> mettre en liste d'attente
        wait_reg = Registration(
            event_id=event_id,
            ticket_id=ticket.id if ticket else None,
            registration_type=RegistrationType.GUEST,
            user_id=None,
            guest_first_name=guest_data.first_name,
            guest_last_name=guest_data.last_name,
            guest_email=guest_data.email,
            guest_country_code=guest_data.country_code,
            guest_phone_country_code=guest_data.phone_country_code,
            guest_phone=guest_data.phone,
            guest_phone_full=(
                f"{guest_data.phone_country_code}{guest_data.phone}"
                if guest_data.phone and guest_data.phone_country_code
                else None
            ),
            status=RegistrationStatus.WAITLIST,
            payment_status=PaymentStatus.NOT_REQUIRED,
            amount_paid=ticket.price if ticket else 0.0,
            currency=event.currency,
            waitlist_joined_at=datetime.utcnow(),
        )
        db.add(wait_reg)
        db.commit()
        db.refresh(wait_reg)
        return WaitlistResponse(
            message="Événement complet. Vous avez été ajouté à la liste d'attente.",
            registration_id=wait_reg.id,
            status="waitlist",
            offer_expires_at=None,
        )

    # ÉTAPE 4 : Vérifier que cet email n'est pas déjà inscrit (CONFIRMED uniquement)
    # On ignore les inscriptions PENDING (paiement non finalisé) et CANCELLED
    existing_registration = db.query(Registration).filter(
        Registration.event_id == event_id,
        Registration.guest_email == guest_data.email,
        Registration.status == RegistrationStatus.CONFIRMED
    ).first()

    if existing_registration:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cet email est déjà inscrit à cet événement"
        )

    # ÉTAPE 5 : Générer un QR code unique
    qr_code_data, qr_code_path = generate_registration_qr_code()

    # ÉTAPE 6 : Créer le numéro de téléphone complet si fourni
    guest_phone_full = None
    if guest_data.phone and guest_data.phone_country_code:
        guest_phone_full = f"{guest_data.phone_country_code}{guest_data.phone}"

    # ÉTAPE 7 : Créer l'inscription
    new_registration = Registration(
        event_id=event_id,
        ticket_id=ticket.id if ticket else None,  # Ticket optionnel
        registration_type=RegistrationType.GUEST,
        user_id=None,  # Pas de compte utilisateur
        guest_first_name=guest_data.first_name,
        guest_last_name=guest_data.last_name,
        guest_email=guest_data.email,
        guest_country_code=guest_data.country_code,
        guest_phone_country_code=guest_data.phone_country_code,
        guest_phone=guest_data.phone,
        guest_phone_full=guest_phone_full,
        status=RegistrationStatus.CONFIRMED,  # Confirmée directement (gratuit)
        payment_status=PaymentStatus.NOT_REQUIRED,  # Pas de paiement requis
        amount_paid=ticket.price if ticket else 0.0,
        qr_code_data=qr_code_data,
        qr_code_url=f"{settings.BACKEND_URL}/{qr_code_path}",
        currency=event.currency
    )

    db.add(new_registration)

    # ÉTAPE 8 : Décrémenter le ticket ET l'événement
    if ticket:
        ticket.quantity_sold += 1  # Incrémenter ventes seulement si ticket
    event.available_seats -= 1

    # ÉTAPE 9 : Sauvegarder
    db.commit()
    db.refresh(new_registration)

    # ÉTAPE 10 : Envoyer email de confirmation avec le QR code
    try:
        # Formater la date pour l'email
        event_date_str = event.start_date.strftime("%d/%m/%Y à %H:%M")

        # Envoyer l'email
        email_sent = send_registration_confirmation_email(
            to_email=guest_data.email,
            participant_name=f"{guest_data.first_name} {guest_data.last_name}",
            event_title=event.title,
            event_date=event_date_str,
            event_location=event.location if event.event_format != EventFormat.VIRTUAL else None,
            event_format=event.event_format.value,
            qr_code_url=new_registration.qr_code_url,
            qr_code_path=qr_code_path,
            virtual_meeting_url=event.virtual_meeting_url if event.event_format in [EventFormat.VIRTUAL, EventFormat.HYBRID] else None,
            virtual_meeting_id=event.virtual_meeting_id if event.event_format in [EventFormat.VIRTUAL, EventFormat.HYBRID] else None,
            virtual_meeting_password=event.virtual_meeting_password if event.event_format in [EventFormat.VIRTUAL, EventFormat.HYBRID] else None,
            virtual_platform=event.virtual_platform.value if event.event_format in [EventFormat.VIRTUAL, EventFormat.HYBRID] and event.virtual_platform else None,
            virtual_instructions=event.virtual_instructions if event.event_format in [EventFormat.VIRTUAL, EventFormat.HYBRID] else None
        )

        # Mettre à jour le statut d'envoi
        if email_sent:
            new_registration.email_sent = True
            new_registration.email_sent_at = datetime.utcnow()
            db.commit()

        # Notification organisateur (si activée)
        if event and event.organizer and event.organizer.email:
            prefs = _get_or_create_notification_preferences(db, event.organizer_id)
            if prefs.new_registration:
                try:
                    _create_inapp_notification_if_missing(
                        db=db,
                        user_id=event.organizer_id,
                        notification_type="new_registration",
                        reference_id=new_registration.id,
                        title="Nouvelle inscription",
                        body=f"{guest_data.first_name} {guest_data.last_name} s'est inscrit(e) à {event.title}.",
                    )
                except Exception as e:
                    print(f"⚠️ notif organizer (free guest): erreur création notification in-app: {e}")

                try:
                    send_organizer_new_registration_email(
                        to_email=event.organizer.email,
                        organizer_name=f"{event.organizer.first_name} {event.organizer.last_name}".strip() or event.organizer.email,
                        event_title=event.title,
                        participant_name=f"{guest_data.first_name} {guest_data.last_name}",
                        participant_email=guest_data.email,
                        registration_status=str(new_registration.status)
                    )
                except Exception as e:
                    print(f"⚠️ notif organizer (free guest): erreur envoi email: {e}")

    except Exception as e:
        # Si l'envoi échoue, on continue quand même (l'inscription est créée)
        print(f"⚠️ Erreur lors de l'envoi de l'email : {e}")

    # ÉTAPE 11 : TODO - Envoyer SMS de confirmation
    # if guest_phone_full:
    #     send_registration_confirmation_sms(new_registration, event)

    # ÉTAPE 12 : Retourner la réponse
    return FreeRegistrationResponse(
        message="Inscription confirmée avec succès ! Vous allez recevoir un email de confirmation.",
        registration_id=new_registration.id,
        qr_code_url=new_registration.qr_code_url
    )


# ═══════════════════════════════════════════════════════════════
# ROUTE 2 : Inscription UTILISATEUR CONNECTÉ - Événement GRATUIT
# ═══════════════════════════════════════════════════════════════

@router.post("/events/{event_id}/register", response_model=FreeRegistrationResponse | WaitlistResponse, status_code=status.HTTP_201_CREATED)
def register_user_to_event(
    event_id: int,
    registration_data: UserRegistrationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Inscription d'un UTILISATEUR CONNECTÉ à un événement

    **Authentification requise** (token JWT)

    Cette route permet à un utilisateur connecté de s'inscrire à un événement.

    **IMPORTANT** : Cette route gère UNIQUEMENT les événements GRATUITS.

    **Processus** :
    1. Vérifier que l'événement existe et est publié
    2. Valider le ticket (existe, appartient à l'événement, actif, non sold out)
    3. Vérifier qu'il reste des places
    4. Vérifier que l'utilisateur n'est pas déjà inscrit
    5. Créer l'inscription
    6. Générer un QR code unique
    7. Décrémenter ticket.quantity_sold et event.available_seats
    8. Envoyer email + SMS de confirmation (TODO)
    """

    # ÉTAPE 1 : Vérifier que l'événement existe et est publié
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.status == EventStatus.PUBLISHED
    ).first()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Événement non trouvé ou pas encore publié"
        )

    # ÉTAPE 2 : Vérifier que c'est un événement GRATUIT
    if not event.is_free:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cet événement est payant. Veuillez utiliser la route de paiement."
        )

    # ÉTAPE 3 : Valider le ticket (optionnel si l'événement n'a pas de tickets)
    ticket = None
    if registration_data.ticket_id is not None:
        ticket = validate_and_get_ticket(event_id, registration_data.ticket_id, db)

    # ÉTAPE 4 : Vérifier qu'il reste des places (capacité globale)
    if event.available_seats <= 0:
        wait_reg = Registration(
            event_id=event_id,
            ticket_id=ticket.id if ticket else None,
            registration_type=RegistrationType.USER,
            user_id=current_user.id,
            status=RegistrationStatus.WAITLIST,
            payment_status=PaymentStatus.NOT_REQUIRED,
            amount_paid=ticket.price if ticket else 0.0,
            currency=event.currency,
            waitlist_joined_at=datetime.utcnow(),
        )
        db.add(wait_reg)
        db.commit()
        db.refresh(wait_reg)
        return WaitlistResponse(
            message="Événement complet. Vous avez été ajouté à la liste d'attente.",
            registration_id=wait_reg.id,
            status="waitlist",
            offer_expires_at=None,
        )

    # ÉTAPE 5 : Vérifier que l'utilisateur n'est pas déjà inscrit (CONFIRMED ou PENDING)
    # - CONFIRMED : déjà inscrit
    # - PENDING : paiement en cours -> réutiliser la session Stripe existante
    existing_registration = db.query(Registration).filter(
        Registration.event_id == event_id,
        Registration.user_id == current_user.id,
        Registration.status.in_([RegistrationStatus.CONFIRMED, RegistrationStatus.PENDING])
    ).order_by(Registration.created_at.desc()).first()

    if existing_registration:
        if existing_registration.status == RegistrationStatus.CONFIRMED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vous êtes déjà inscrit à cet événement"
            )

        if existing_registration.stripe_session_id:
            try:
                import stripe
                from app.config.settings import settings

                stripe.api_key = settings.STRIPE_SECRET_KEY
                session = stripe.checkout.Session.retrieve(existing_registration.stripe_session_id)
                if session and session.get("url"):
                    return PaymentResponse(payment_url=session.get("url"), session_id=session.get("id"))
            except Exception as e:
                print(f"⚠️ Impossible de récupérer la session Stripe existante: {e}")

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Une inscription est déjà en attente de paiement pour cet événement"
        )

    # ÉTAPE 6 : Générer un QR code unique
    qr_code_data, qr_code_path = generate_registration_qr_code()

    # ÉTAPE 7 : Créer l'inscription
    new_registration = Registration(
        event_id=event_id,
        ticket_id=ticket.id if ticket else None,
        registration_type=RegistrationType.USER,
        user_id=current_user.id,
        status=RegistrationStatus.CONFIRMED,
        payment_status=PaymentStatus.NOT_REQUIRED,
        amount_paid=ticket.price if ticket else 0.0,
        qr_code_data=qr_code_data,
        qr_code_url=f"{settings.BACKEND_URL}/{qr_code_path}",
        currency=event.currency
    )

    db.add(new_registration)

    # ÉTAPE 8 : Décrémenter le ticket ET l'événement
    if ticket:
        ticket.quantity_sold += 1  # Incrémenter ventes seulement si ticket
    event.available_seats -= 1

    # ÉTAPE 9 : Sauvegarder
    db.commit()
    db.refresh(new_registration)

    # ÉTAPE 9 : Envoyer email de confirmation avec le QR code
    try:
        # Formater la date pour l'email
        event_date_str = event.start_date.strftime("%d/%m/%Y à %H:%M")

        # Envoyer l'email
        email_sent = send_registration_confirmation_email(
            to_email=current_user.email,
            participant_name=f"{current_user.first_name} {current_user.last_name}",
            event_title=event.title,
            event_date=event_date_str,
            event_location=event.location if event.event_format != EventFormat.VIRTUAL else None,
            event_format=event.event_format.value,
            qr_code_url=new_registration.qr_code_url,
            qr_code_path=qr_code_path,
            virtual_meeting_url=event.virtual_meeting_url if event.event_format in [EventFormat.VIRTUAL, EventFormat.HYBRID] else None,
            virtual_meeting_id=event.virtual_meeting_id if event.event_format in [EventFormat.VIRTUAL, EventFormat.HYBRID] else None,
            virtual_meeting_password=event.virtual_meeting_password if event.event_format in [EventFormat.VIRTUAL, EventFormat.HYBRID] else None,
            virtual_platform=event.virtual_platform.value if event.event_format in [EventFormat.VIRTUAL, EventFormat.HYBRID] and event.virtual_platform else None,
            virtual_instructions=event.virtual_instructions if event.event_format in [EventFormat.VIRTUAL, EventFormat.HYBRID] else None
        )

        # Mettre à jour le statut d'envoi
        if email_sent:
            new_registration.email_sent = True
            new_registration.email_sent_at = datetime.utcnow()
            db.commit()

    except Exception as e:
        # Si l'envoi échoue, on continue quand même (l'inscription est créée)
        print(f"⚠️ Erreur lors de l'envoi de l'email : {e}")

    # ÉTAPE 10 : TODO - Envoyer SMS de confirmation
    # if current_user.phone_full:
    #     send_registration_confirmation_sms(new_registration, event)

    # ÉTAPE 11 : Retourner la réponse
    return FreeRegistrationResponse(
        message=f"Inscription confirmée avec succès ! Un email de confirmation a été envoyé à {current_user.email}",
        registration_id=new_registration.id,
        qr_code_url=new_registration.qr_code_url
    )


# ═══════════════════════════════════════════════════════════════
# ROUTE 2.5 : Inscription INVITÉ - Événement PAYANT (Stripe)
# ═══════════════════════════════════════════════════════════════

@router.post("/events/{event_id}/register/guest/payment", response_model=PaymentResponse | WaitlistResponse, status_code=status.HTTP_201_CREATED)
def register_guest_to_paid_event(
    event_id: int,
    guest_data: GuestRegistrationCreate,
    db: Session = Depends(get_db)
):
    """
    Inscription d'un INVITÉ à un événement PAYANT

    **PAS d'authentification requise**

    Cette route crée une inscription en statut PENDING et génère une session Stripe Checkout.
    L'utilisateur sera redirigé vers Stripe pour payer, puis le webhook confirmera l'inscription.

    **Processus** :
    1. Vérifier événement existe et est payant
    2. Valider le ticket (existe, appartient à l'événement, actif, non sold out)
    3. Vérifier places disponibles
    4. Créer inscription avec statut PENDING
    5. Créer session Stripe
    6. Retourner l'URL de paiement
    7. [Webhook] Confirmer paiement + générer QR code + envoyer email
    """

    # ÉTAPE 1 : Vérifier que l'événement existe et est publié
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.status == EventStatus.PUBLISHED
    ).first()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Événement non trouvé ou pas encore publié"
        )

    # ÉTAPE 2 : Vérifier que c'est un événement PAYANT
    if event.is_free:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cet événement est gratuit. Utilisez la route d'inscription gratuite."
        )

    if guest_data.ticket_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Veuillez sélectionner un type de ticket"
        )

    # ÉTAPE 3 : Valider le ticket (existe, appartient à l'événement, actif, non sold out)
    ticket = validate_and_get_ticket(event_id, guest_data.ticket_id, db)

    # ÉTAPE 4 : Vérifier qu'il reste des places (capacité globale)
    if event.available_seats <= 0:
        wait_reg = Registration(
            event_id=event_id,
            ticket_id=ticket.id,
            registration_type=RegistrationType.GUEST,
            user_id=None,
            guest_first_name=guest_data.first_name,
            guest_last_name=guest_data.last_name,
            guest_email=guest_data.email,
            guest_country_code=guest_data.country_code,
            guest_phone_country_code=guest_data.phone_country_code,
            guest_phone=guest_data.phone,
            guest_phone_full=(
                f"{guest_data.phone_country_code}{guest_data.phone}"
                if guest_data.phone and guest_data.phone_country_code
                else None
            ),
            status=RegistrationStatus.WAITLIST,
            payment_status=PaymentStatus.PENDING,
            amount_paid=ticket.price,
            currency=event.currency,
            waitlist_joined_at=datetime.utcnow(),
        )
        db.add(wait_reg)
        db.commit()
        db.refresh(wait_reg)
        return WaitlistResponse(
            message="Événement complet. Vous avez été ajouté à la liste d'attente.",
            registration_id=wait_reg.id,
            status="waitlist",
            offer_expires_at=None,
        )

    # ÉTAPE 5 : Vérifier que cet email n'est pas déjà inscrit (CONFIRMED ou PENDING)
    # - CONFIRMED : déjà inscrit
    # - PENDING : paiement en cours -> on réutilise la session Stripe existante
    existing_registration = db.query(Registration).filter(
        Registration.event_id == event_id,
        Registration.guest_email == guest_data.email,
        Registration.status.in_([RegistrationStatus.CONFIRMED, RegistrationStatus.PENDING])
    ).order_by(Registration.created_at.desc()).first()

    if existing_registration:
        if existing_registration.status == RegistrationStatus.CONFIRMED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cet email est déjà inscrit à cet événement"
            )

        # PENDING: réutiliser la session Stripe
        if existing_registration.stripe_session_id:
            try:
                import stripe
                from app.config.settings import settings

                stripe.api_key = settings.STRIPE_SECRET_KEY
                session = stripe.checkout.Session.retrieve(existing_registration.stripe_session_id)
                if session and session.get("url"):
                    return PaymentResponse(payment_url=session.get("url"), session_id=session.get("id"))
            except Exception as e:
                print(f"⚠️ Impossible de récupérer la session Stripe existante: {e}")

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Une inscription est déjà en attente de paiement pour cet événement"
        )

    # ÉTAPE 6 : Créer le numéro de téléphone complet si fourni
    guest_phone_full = None
    if guest_data.phone and guest_data.phone_country_code:
        guest_phone_full = f"{guest_data.phone_country_code}{guest_data.phone}"

    # ÉTAPE 7 : Créer l'inscription en statut PENDING (en attente de paiement)
    new_registration = Registration(
        event_id=event_id,
        ticket_id=ticket.id,  # ← NOUVEAU: Lier au ticket
        registration_type=RegistrationType.GUEST,
        user_id=None,
        guest_first_name=guest_data.first_name,
        guest_last_name=guest_data.last_name,
        guest_email=guest_data.email,
        guest_country_code=guest_data.country_code,
        guest_phone_country_code=guest_data.phone_country_code,
        guest_phone=guest_data.phone,
        guest_phone_full=guest_phone_full,
        status=RegistrationStatus.PENDING,  # ⏳ En attente du paiement
        payment_status=PaymentStatus.PENDING,
        amount_paid=ticket.price,  # ← MODIFIÉ: Utiliser le prix du ticket
        currency=event.currency
    )

    db.add(new_registration)
    db.commit()
    db.refresh(new_registration)

    # ÉTAPE 8 : Créer la session Stripe
    from app.config.settings import settings

    success_url = f"{settings.FRONTEND_URL}/events/{event_id}/payment/success"
    cancel_url = f"{settings.FRONTEND_URL}/events/{event_id}/payment/cancel"

    session = create_checkout_session(
        registration_id=new_registration.id,
        event_title=f"{event.title} - {ticket.name}",  # ← MODIFIÉ: Inclure le nom du ticket
        event_price=ticket.price,  # ← MODIFIÉ: Utiliser le prix du ticket
        currency=event.currency,
        participant_email=guest_data.email,
        participant_name=f"{guest_data.first_name} {guest_data.last_name}",
        success_url=success_url,
        cancel_url=cancel_url
    )

    if not session:
        # Si erreur Stripe, supprimer l'inscription
        db.delete(new_registration)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la création de la session de paiement"
        )

    # ÉTAPE 8 : Sauvegarder l'ID de session Stripe
    new_registration.stripe_session_id = session.id
    db.commit()

    # ÉTAPE 9 : Retourner l'URL de paiement
    return PaymentResponse(
        payment_url=session.url,
        session_id=session.id
    )


# ═══════════════════════════════════════════════════════════════
# ROUTE 2.6 : Inscription UTILISATEUR - Événement PAYANT (Stripe)
# ═══════════════════════════════════════════════════════════════

@router.post("/events/{event_id}/register/payment", response_model=PaymentResponse | WaitlistResponse, status_code=status.HTTP_201_CREATED)
def register_user_to_paid_event(
    event_id: int,
    registration_data: UserRegistrationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Inscription d'un UTILISATEUR CONNECTÉ à un événement PAYANT

    **Authentification requise**

    Processus similaire à l'inscription guest, mais avec l'utilisateur connecté.
    """

    # ÉTAPE 1 : Vérifier que l'événement existe et est publié
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.status == EventStatus.PUBLISHED
    ).first()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Événement non trouvé ou pas encore publié"
        )

    # ÉTAPE 2 : Vérifier que c'est un événement PAYANT
    if event.is_free:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cet événement est gratuit. Utilisez la route d'inscription gratuite."
        )

    # ÉTAPE 3 : Valider le ticket (existe, appartient à l'événement, actif, non sold out)
    ticket = validate_and_get_ticket(event_id, registration_data.ticket_id, db)

    # ÉTAPE 4 : Vérifier qu'il reste des places (capacité globale)
    if event.available_seats <= 0:
        wait_reg = Registration(
            event_id=event_id,
            ticket_id=ticket.id,
            registration_type=RegistrationType.USER,
            user_id=current_user.id,
            status=RegistrationStatus.WAITLIST,
            payment_status=PaymentStatus.PENDING,
            amount_paid=ticket.price,
            currency=event.currency,
            waitlist_joined_at=datetime.utcnow(),
        )
        db.add(wait_reg)
        db.commit()
        db.refresh(wait_reg)
        return WaitlistResponse(
            message="Événement complet. Vous avez été ajouté à la liste d'attente.",
            registration_id=wait_reg.id,
            status="waitlist",
            offer_expires_at=None,
        )

    # ÉTAPE 5 : Vérifier que l'utilisateur n'est pas déjà inscrit (CONFIRMED uniquement)
    # On ignore les inscriptions PENDING (paiement non finalisé) et CANCELLED
    existing_registration = db.query(Registration).filter(
        Registration.event_id == event_id,
        Registration.user_id == current_user.id,
        Registration.status == RegistrationStatus.CONFIRMED
    ).first()

    if existing_registration:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vous êtes déjà inscrit à cet événement"
        )

    # ÉTAPE 6 : Créer l'inscription en statut PENDING
    new_registration = Registration(
        event_id=event_id,
        ticket_id=ticket.id,  # ← NOUVEAU: Lier au ticket
        registration_type=RegistrationType.USER,
        user_id=current_user.id,
        status=RegistrationStatus.PENDING,
        payment_status=PaymentStatus.PENDING,
        amount_paid=ticket.price,  # ← MODIFIÉ: Utiliser le prix du ticket
        currency=event.currency
    )

    db.add(new_registration)
    db.commit()
    db.refresh(new_registration)

    # ÉTAPE 7 : Créer la session Stripe
    from app.config.settings import settings

    success_url = f"{settings.FRONTEND_URL}/events/{event_id}/payment/success"
    cancel_url = f"{settings.FRONTEND_URL}/events/{event_id}/payment/cancel"

    # Construire le nom du participant (gérer les valeurs NULL)
    participant_name = f"{current_user.first_name or ''} {current_user.last_name or ''}".strip()
    if not participant_name:
        participant_name = current_user.email.split('@')[0]  # Utiliser la partie avant @ si pas de nom

    print(f"🔍 DEBUG Stripe - User Registration:")
    print(f"   Registration ID: {new_registration.id}")
    print(f"   Email: {current_user.email}")
    print(f"   Name: '{participant_name}'")
    print(f"   Price: {ticket.price} {event.currency}")
    print(f"   Event: {event.title} - {ticket.name}")

    session = create_checkout_session(
        registration_id=new_registration.id,
        event_title=f"{event.title} - {ticket.name}",  # ← MODIFIÉ: Inclure le nom du ticket
        event_price=ticket.price,  # ← MODIFIÉ: Utiliser le prix du ticket
        currency=event.currency,
        participant_email=current_user.email,
        participant_name=participant_name,
        success_url=success_url,
        cancel_url=cancel_url
    )

    if not session:
        # Si erreur Stripe, supprimer l'inscription
        db.delete(new_registration)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la création de la session de paiement"
        )

    # ÉTAPE 7 : Sauvegarder l'ID de session Stripe
    new_registration.stripe_session_id = session.id
    db.commit()

    # ÉTAPE 8 : Retourner l'URL de paiement
    return PaymentResponse(
        payment_url=session.url,
        session_id=session.id
    )


# ═══════════════════════════════════════════════════════════════
# ROUTE 3 : Voir MES inscriptions (utilisateur connecté)
# ═══════════════════════════════════════════════════════════════

@router.get("/my", response_model=List[RegistrationResponse])
def get_my_registrations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Voir toutes MES inscriptions CONFIRMÉES

    **Authentification requise**

    Cette route retourne UNIQUEMENT les inscriptions CONFIRMÉES (paiement réussi).
    Les inscriptions PENDING (en attente de paiement) ne sont pas affichées.

    **Magie** : Grâce à la liaison automatique dans auth.py,
    si tu t'es inscrit en tant qu'invité avec ton email,
    puis que tu as créé un compte avec le même email,
    TU VERRAS toutes tes inscriptions ici ! 🎉
    """

    from sqlalchemy.orm import joinedload

    # Récupérer les inscriptions (incluant WAITLIST/OFFERED) avec les relations
    registrations = db.query(Registration).options(
        joinedload(Registration.event),  # Charger l'événement
        joinedload(Registration.ticket)  # Charger le ticket
    ).filter(
        Registration.user_id == current_user.id,
        Registration.status.in_([
            RegistrationStatus.CONFIRMED,
            RegistrationStatus.PENDING,
            RegistrationStatus.WAITLIST,
            RegistrationStatus.OFFERED,
        ])
    ).order_by(Registration.created_at.desc()).all()

    # Convertir les objets en dictionnaires pour Pydantic
    # + Dé-doublonnage: 1 inscription par event_id
    # Priorité: CONFIRMED > PENDING, puis la plus récente.
    by_event_id = {}
    for reg in registrations:
        reg_dict = {
            **reg.__dict__,
            "status": str(reg.status.value) if hasattr(reg.status, 'value') else str(reg.status),  # ← FIX: Convertir Enum en string lowercase
            "payment_status": str(reg.payment_status.value) if hasattr(reg.payment_status, 'value') else str(reg.payment_status),
            "event": {
                "id": reg.event.id,
                "title": reg.event.title,
                "description": reg.event.description,
                "start_date": reg.event.start_date,
                "end_date": reg.event.end_date,
                "location": reg.event.location,
                "event_format": reg.event.event_format,
                "image_url": reg.event.image_url,
                "currency": reg.event.currency
            } if reg.event else None,
            "ticket": {
                "id": reg.ticket.id,
                "name": reg.ticket.name,
                "description": reg.ticket.description,
                "price": reg.ticket.price,
                "currency": reg.ticket.currency
            } if reg.ticket else None
        }

        ev_id = reg_dict.get("event_id")
        if ev_id is None:
            continue

        existing = by_event_id.get(ev_id)
        if not existing:
            by_event_id[ev_id] = reg_dict
            continue

        def _prio(x):
            s = str(x.get("status") or "").lower()
            if s == "confirmed":
                return 2
            if s == "pending":
                return 1
            if s == "offered":
                return 1
            if s == "waitlist":
                return 0
            return 0

        if _prio(reg_dict) > _prio(existing):
            by_event_id[ev_id] = reg_dict

    result = list(by_event_id.values())

    # 🔍 DEBUG: Afficher ce qu'on renvoie
    print(f"\n🔍 GET /my - Inscriptions pour user #{current_user.id}:")
    print(f"   Total trouvées: {len(result)}")
    for reg in result:
        print(f"   - Registration #{reg['id']}: status={reg['status']}, qr_code_url={reg.get('qr_code_url')}")

    return result


# ═══════════════════════════════════════════════════════════════
# ROUTE 3.1 : Confirmer un paiement Stripe (fallback)
# ═══════════════════════════════════════════════════════════════

@router.post("/confirm-payment", response_model=ConfirmPaymentResponse)
def confirm_payment(
    payload: ConfirmPaymentRequest,
    db: Session = Depends(get_db)
):
    """Fallback de confirmation de paiement.

    Utile quand le webhook Stripe n'est pas reçu (souvent en local).
    Le frontend peut appeler cette route avec `session_id` après redirection.
    """

    try:
        import stripe
        from app.config.settings import settings

        stripe.api_key = settings.STRIPE_SECRET_KEY
        session = stripe.checkout.Session.retrieve(payload.session_id)
    except Exception as e:
        return ConfirmPaymentResponse(
            success=False,
            message=f"Impossible de récupérer la session Stripe: {e}"
        )

    # Sécurité minimale: vérifier que la session est payée
    if session.get("payment_status") != "paid":
        return ConfirmPaymentResponse(
            success=False,
            message="Paiement non confirmé par Stripe"
        )

    registration_id = session.get("client_reference_id")
    if not registration_id:
        return ConfirmPaymentResponse(
            success=False,
            message="Registration ID manquant dans la session Stripe"
        )

    registration = db.query(Registration).filter(Registration.id == int(registration_id)).first()
    if not registration:
        return ConfirmPaymentResponse(
            success=False,
            message="Inscription introuvable"
        )

    # Déjà confirmé -> OK
    if registration.status == RegistrationStatus.CONFIRMED:
        return ConfirmPaymentResponse(
            success=True,
            message="Inscription déjà confirmée",
            registration_id=registration.id,
            qr_code_url=registration.qr_code_url,
            email_sent=registration.email_sent
        )

    # Confirmer
    registration.status = RegistrationStatus.CONFIRMED
    registration.payment_status = PaymentStatus.PAID
    registration.stripe_session_id = session.get("id")
    if session.get("payment_intent"):
        registration.stripe_payment_intent_id = session.get("payment_intent")

    # QR code
    if not registration.qr_code_data:
        qr_code_data, qr_code_path = generate_registration_qr_code()
        registration.qr_code_data = qr_code_data
        registration.qr_code_url = f"{settings.BACKEND_URL}/{qr_code_path}"
    else:
        qr_code_path = (registration.qr_code_url or "").replace(f"{settings.BACKEND_URL}/", "")

    # Places + ticket
    event = db.query(Event).filter(Event.id == registration.event_id).first()
    if event:
        if event.available_seats is not None:
            event.available_seats = max(0, event.available_seats - 1)

    if registration.ticket_id:
        ticket = db.query(Ticket).filter(Ticket.id == registration.ticket_id).first()
        if ticket:
            ticket.quantity_sold += 1

    # ═══════════════════════════════════════════════════════════════
    # CALCUL ET ENREGISTREMENT DE LA COMMISSION
    # ═══════════════════════════════════════════════════════════════
    from app.models.commission import CommissionSettings, CommissionTransaction
    from app.models.category import Category

    # Récupérer les settings de commission
    commission_settings = db.query(CommissionSettings).first()

    if commission_settings and commission_settings.is_active and registration.amount_paid > 0:
        # Déterminer le taux de commission à appliquer
        commission_rate = commission_settings.default_commission_rate

        # Si la catégorie a une commission custom, on l'utilise
        if event and event.category_id:
            category = db.query(Category).filter(Category.id == event.category_id).first()
            if category and category.custom_commission_rate is not None:
                commission_rate = category.custom_commission_rate

        # Calculer le montant de la commission
        commission_amount = (registration.amount_paid * commission_rate) / 100

        # Appliquer le minimum si défini
        if commission_settings.minimum_commission_amount > 0:
            commission_amount = max(commission_amount, commission_settings.minimum_commission_amount)

        # Montant net pour l'organisateur
        net_amount = registration.amount_paid - commission_amount

        # Vérifier si une commission n'existe pas déjà pour cette inscription
        existing_commission = db.query(CommissionTransaction).filter(
            CommissionTransaction.registration_id == registration.id
        ).first()

        if not existing_commission:
            # Enregistrer la transaction de commission
            commission_transaction = CommissionTransaction(
                registration_id=registration.id,
                event_id=event.id,
                organizer_id=event.organizer_id,
                ticket_amount=registration.amount_paid,
                commission_rate=commission_rate,
                commission_amount=commission_amount,
                net_amount=net_amount,
                currency=registration.currency,
                stripe_payment_intent_id=registration.stripe_payment_intent_id,
                notes=f"Commission pour {event.title}"
            )
            db.add(commission_transaction)
            print(f"💰 Commission: {commission_amount} {registration.currency} ({commission_rate}%) créée")
        else:
            print(f"ℹ️ Commission déjà existante pour l'inscription #{registration.id}")

    db.commit()
    db.refresh(registration)

    # Email (si SMTP configuré)
    email_sent = False
    try:
        if event:
            participant_name = registration.get_participant_name()
            participant_email = registration.get_participant_email()
            event_date_str = event.start_date.strftime("%d/%m/%Y à %H:%M")

            email_sent = send_registration_confirmation_email(
                to_email=participant_email,
                participant_name=participant_name,
                event_title=event.title,
                event_date=event_date_str,
                event_location=event.location if event.event_format != EventFormat.VIRTUAL else None,
                event_format=event.event_format.value,
                qr_code_url=registration.qr_code_url,
                qr_code_path=qr_code_path,
                virtual_meeting_url=event.virtual_meeting_url if event.event_format in [EventFormat.VIRTUAL, EventFormat.HYBRID] else None
            )

            if email_sent:
                registration.email_sent = True
                registration.email_sent_at = datetime.utcnow()
                db.commit()

            # Notification organisateur (si activée)
            if event.organizer and event.organizer.email:
                prefs = _get_or_create_notification_preferences(db, event.organizer_id)
                if prefs.new_registration:
                    try:
                        _create_inapp_notification_if_missing(
                            db=db,
                            user_id=event.organizer_id,
                            notification_type="new_registration",
                            reference_id=registration.id,
                            title="Nouvelle inscription",
                            body=f"{participant_name} s'est inscrit(e) à {event.title}.",
                        )
                    except Exception as e:
                        print(f"⚠️ notif organizer (confirm-payment): erreur création notification in-app: {e}")

                    try:
                        send_organizer_new_registration_email(
                            to_email=event.organizer.email,
                            organizer_name=f"{event.organizer.first_name} {event.organizer.last_name}".strip() or event.organizer.email,
                            event_title=event.title,
                            participant_name=participant_name,
                            participant_email=participant_email,
                            registration_status=str(registration.status)
                        )
                    except Exception as e:
                        print(f"⚠️ notif organizer (confirm-payment): erreur envoi email: {e}")
    except Exception as e:
        print(f"⚠️ confirm-payment: erreur envoi email: {e}")

    return ConfirmPaymentResponse(
        success=True,
        message="Paiement confirmé et inscription validée",
        registration_id=registration.id,
        qr_code_url=registration.qr_code_url,
        email_sent=email_sent
    )


# ═══════════════════════════════════════════════════════════════
# ROUTE 4 : Vérifier un QR code
# ═══════════════════════════════════════════════════════════════

@router.post("/verify-qr", response_model=QRCodeVerifyResponse)
def verify_qr_code(
    qr_request: QRCodeVerifyRequest,
    db: Session = Depends(get_db)
):
    """
    Vérifier un QR code scanné

    **PAS d'authentification requise** (utilisé par le scan à l'entrée)

    Cette route est utilisée à l'entrée de l'événement pour valider
    les billets des participants.

    **Processus** :
    1. Chercher l'inscription par qr_code_data
    2. Vérifier que le statut est CONFIRMED
    3. Retourner les infos du participant et de l'événement

    **Exemple de requête** :
    ```json
    {
        "qr_code_data": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    }
    ```

    **Exemple de réponse (VALIDE)** :
    ```json
    {
        "valid": true,
        "message": "QR code valide",
        "participant_name": "Marie Dupont",
        "participant_email": "marie@example.com",
        "event_title": "Conférence Tech Lomé 2025",
        "registration_status": "confirmed"
    }
    ```

    **Exemple de réponse (INVALIDE)** :
    ```json
    {
        "valid": false,
        "message": "QR code invalide ou inscription annulée"
    }
    ```
    """

    # ÉTAPE 1 : Chercher l'inscription
    registration = db.query(Registration).filter(
        Registration.qr_code_data == qr_request.qr_code_data
    ).first()

    # ÉTAPE 2 : Vérifier que l'inscription existe et est confirmée
    if not registration:
        return QRCodeVerifyResponse(
            valid=False,
            message="❌ QR code invalide"
        )

    if registration.status != RegistrationStatus.CONFIRMED:
        return QRCodeVerifyResponse(
            valid=False,
            message=f"❌ Inscription {registration.status}. Statut invalide."
        )

    # ÉTAPE 3 : ANTI-FRAUDE - Vérifier le nombre de scans
    from datetime import datetime

    # Si c'est le PREMIER scan
    if registration.scanned_count == 0:
        # ✅ PREMIER SCAN - AUTORISÉ
        registration.scanned_count = 1
        registration.first_scan_at = datetime.utcnow()
        registration.last_scan_at = datetime.utcnow()
        db.commit()

        # Récupérer les infos
        event = registration.event
        participant_name = registration.get_participant_name()
        participant_email = registration.get_participant_email()

        return QRCodeVerifyResponse(
            valid=True,
            message="✅ QR code valide ! Accès autorisé. PREMIER SCAN.",
            participant_name=participant_name,
            participant_email=participant_email,
            event_title=event.title,
            event_date=event.start_date,
            registration_status=registration.status
        )

    # Si c'est le DEUXIÈME scan
    elif registration.scanned_count == 1:
        # ⚠️ DEUXIÈME SCAN - ALERTE !
        registration.scanned_count += 1
        registration.last_scan_at = datetime.utcnow()
        db.commit()

        # Récupérer les infos
        event = registration.event
        participant_name = registration.get_participant_name()
        participant_email = registration.get_participant_email()

        # Calculer le temps écoulé depuis le premier scan
        time_diff = datetime.utcnow() - registration.first_scan_at
        minutes_elapsed = int(time_diff.total_seconds() / 60)

        return QRCodeVerifyResponse(
            valid=False,
            message=f"⚠️ ALERTE ! Ce QR code a déjà été scanné il y a {minutes_elapsed} minutes. Possibilité de fraude !",
            participant_name=participant_name,
            participant_email=participant_email,
            event_title=event.title,
            event_date=event.start_date,
            registration_status=f"SCANNED_{registration.scanned_count}_TIMES"
        )

    # Si c'est le TROISIÈME scan ou plus
    else:
        # ❌ FRAUDE DÉTECTÉE - BLOQUÉ !
        registration.scanned_count += 1
        registration.last_scan_at = datetime.utcnow()
        db.commit()

        event = registration.event
        participant_name = registration.get_participant_name()

        return QRCodeVerifyResponse(
            valid=False,
            message=f"🚨 FRAUDE DÉTECTÉE ! Ce QR code a été scanné {registration.scanned_count} fois. ACCÈS REFUSÉ !",
            participant_name=participant_name,
            participant_email=None,  # On cache l'email pour sécurité
            event_title=event.title,
            event_date=event.start_date,
            registration_status=f"FRAUD_DETECTED_{registration.scanned_count}_SCANS"
        )


# ═══════════════════════════════════════════════════════════════
# ROUTE 4.1 : Vérifier un QR code (Organisateur/Admin)
# ═══════════════════════════════════════════════════════════════

@router.post("/organizer/verify-qr", response_model=QRCodeVerifyResponse)
def verify_qr_code_for_organizer(
    qr_request: QRCodeVerifyRequest,
    current_user: User = Depends(get_current_organizer_or_admin),
    db: Session = Depends(get_db)
):
    """Vérifier un QR code scanné, réservé aux organisateurs/admins.

    Sécurité :
    - Organisateur : ne peut vérifier que les billets (registrations) de SES événements
    - Admin : peut vérifier tous les événements
    """

    registration = db.query(Registration).filter(
        Registration.qr_code_data == qr_request.qr_code_data
    ).first()

    if not registration:
        return QRCodeVerifyResponse(
            valid=False,
            message="❌ QR code invalide"
        )

    # Si event_id est fourni, forcer la correspondance
    if qr_request.event_id is not None and registration.event_id != qr_request.event_id:
        return QRCodeVerifyResponse(
            valid=False,
            message="❌ Billet invalide pour cet événement"
        )

    # Vérifier ownership (sauf admin)
    current_role_value = getattr(getattr(current_user, "role", None), "value", getattr(current_user, "role", None))
    if current_role_value != "admin":
        if not registration.event or registration.event.organizer_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Accès refusé: billet n'appartient pas à vos événements"
            )

    if registration.status != RegistrationStatus.CONFIRMED:
        return QRCodeVerifyResponse(
            valid=False,
            message=f"❌ Inscription {registration.status}. Statut invalide."
        )

    from datetime import datetime

    event = registration.event
    participant_name = registration.get_participant_name()
    participant_email = registration.get_participant_email()

    if registration.scanned_count == 0:
        registration.scanned_count = 1
        registration.first_scan_at = datetime.utcnow()
        registration.last_scan_at = datetime.utcnow()
        registration.scanned_by = str(current_user.id)
        db.commit()

        return QRCodeVerifyResponse(
            valid=True,
            message="✅ QR code valide ! Accès autorisé. PREMIER SCAN.",
            participant_name=participant_name,
            participant_email=participant_email,
            event_title=event.title if event else None,
            event_date=event.start_date if event else None,
            registration_status=registration.status
        )

    elif registration.scanned_count == 1:
        registration.scanned_count += 1
        registration.last_scan_at = datetime.utcnow()
        registration.scanned_by = str(current_user.id)
        db.commit()

        time_diff = datetime.utcnow() - registration.first_scan_at
        minutes_elapsed = int(time_diff.total_seconds() / 60) if registration.first_scan_at else 0

        return QRCodeVerifyResponse(
            valid=False,
            message=f"⚠️ ALERTE ! Ce QR code a déjà été scanné il y a {minutes_elapsed} minutes. Possibilité de fraude !",
            participant_name=participant_name,
            participant_email=participant_email,
            event_title=event.title if event else None,
            event_date=event.start_date if event else None,
            registration_status=f"SCANNED_{registration.scanned_count}_TIMES"
        )

    else:
        registration.scanned_count += 1
        registration.last_scan_at = datetime.utcnow()
        registration.scanned_by = str(current_user.id)
        db.commit()

        return QRCodeVerifyResponse(
            valid=False,
            message=f"🚨 FRAUDE DÉTECTÉE ! Ce QR code a été scanné {registration.scanned_count} fois. ACCÈS REFUSÉ !",
            participant_name=participant_name,
            participant_email=None,
            event_title=event.title if event else None,
            event_date=event.start_date if event else None,
            registration_status=f"FRAUD_DETECTED_{registration.scanned_count}_SCANS"
        )


# ═══════════════════════════════════════════════════════════════
# ROUTE 5 : Annuler une inscription
# ═══════════════════════════════════════════════════════════════

@router.delete("/{registration_id}", status_code=status.HTTP_200_OK)
def cancel_registration(
    registration_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Annuler une inscription

    **Authentification requise**

    Permet à un utilisateur d'annuler sa propre inscription.

    **Processus** :
    1. Vérifier que l'inscription existe
    2. Vérifier que c'est bien son inscription
    3. Changer le statut à CANCELLED
    4. Libérer une place (available_seats++)
    5. TODO: Envoyer email de confirmation d'annulation
    6. TODO: Si payant et remboursable, initier le remboursement Stripe
    """

    # ÉTAPE 1 : Chercher l'inscription
    registration = db.query(Registration).filter(
        Registration.id == registration_id
    ).first()

    if not registration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inscription non trouvée"
        )

    # ÉTAPE 2 : Vérifier que c'est bien son inscription
    if registration.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'êtes pas autorisé à annuler cette inscription"
        )

    # ÉTAPE 3 : Vérifier que l'inscription n'est pas déjà annulée
    if registration.status == RegistrationStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cette inscription est déjà annulée"
        )

    # ÉTAPE 3.1 : Règle J-1 (24h)
    event = registration.event
    if not event or not event.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Impossible d'annuler: événement introuvable"
        )

    now = datetime.utcnow()
    if event.start_date - now < timedelta(hours=24):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Annulation impossible à moins de 24h du début de l'événement"
        )

    # ÉTAPE 4 : Annuler l'inscription + remboursement si payé
    # Si payé -> remboursement Stripe automatique
    if registration.payment_status == PaymentStatus.PAID and registration.stripe_payment_intent_id:
        refund = create_refund(registration.stripe_payment_intent_id)
        if not refund:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erreur lors du remboursement Stripe"
            )

        registration.status = RegistrationStatus.REFUNDED
        registration.payment_status = PaymentStatus.REFUNDED
    else:
        registration.status = RegistrationStatus.CANCELLED

    # ÉTAPE 5 : Libérer une place immédiatement
    event.available_seats = (event.available_seats or 0) + 1

    # Ticket: décrémenter si on avait une place confirmée
    if registration.ticket_id:
        ticket = db.query(Ticket).filter(Ticket.id == registration.ticket_id).first()
        if ticket:
            ticket.quantity_sold = max(0, ticket.quantity_sold - 1)

    # ÉTAPE 6 : Sauvegarder
    db.commit()

    # ÉTAPE 6.1 : Attribution automatique au 1er en liste d'attente
    try:
        allocate_waitlist_if_possible(db=db, event_id=event.id)
    except Exception as e:
        print(f"⚠️ waitlist allocation error after cancel: {e}")

    # ÉTAPE 7 : TODO - Envoyer email de confirmation d'annulation
    # send_cancellation_confirmation_email(registration, event)

    # ÉTAPE 8 : TODO - Si payant, initier remboursement
    # if registration.payment_status == PaymentStatus.PAID:
    #     initiate_refund(registration)

    return {
        "message": "Inscription annulée avec succès. Vous allez recevoir un email de confirmation."
    }


# ═══════════════════════════════════════════════════════════════
# ROUTE 6 : Récupérer les inscriptions d'un événement (Organisateur)
# ═══════════════════════════════════════════════════════════════

@router.get("/events/{event_id}/registrations")
def get_event_registrations(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Récupérer toutes les inscriptions d'un événement

    **Authentification requise** : Organisateur de l'événement ou Admin

    Cette route permet à l'organisateur de voir tous les participants
    inscrits à son événement.
    """
    from app.models.user import UserRole

    # ÉTAPE 1 : Vérifier que l'événement existe
    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Événement non trouvé"
        )

    # ÉTAPE 2 : Vérifier que l'utilisateur est l'organisateur ou admin
    if event.organizer_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'êtes pas autorisé à voir les inscriptions de cet événement"
        )

    # ÉTAPE 3 : Récupérer toutes les inscriptions avec les relations
    from sqlalchemy.orm import joinedload

    registrations = db.query(Registration).options(
        joinedload(Registration.event),
        joinedload(Registration.ticket),
        joinedload(Registration.user)
    ).filter(
        Registration.event_id == event_id
    ).order_by(Registration.created_at.desc()).all()

    # Convertir les objets en dictionnaires pour Pydantic
    result = []
    for reg in registrations:
        reg_dict = {
            **reg.__dict__,
            "status": str(reg.status.value) if hasattr(reg.status, 'value') else str(reg.status),
            "payment_status": str(reg.payment_status.value) if hasattr(reg.payment_status, 'value') else str(reg.payment_status),
            "registration_type": str(reg.registration_type.value) if hasattr(reg.registration_type, 'value') else str(reg.registration_type),
            "event": {
                "id": reg.event.id,
                "title": reg.event.title,
                "description": reg.event.description,
                "start_date": reg.event.start_date,
                "end_date": reg.event.end_date,
                "location": reg.event.location,
                "event_format": reg.event.event_format,
                "image_url": reg.event.image_url,
                "currency": reg.event.currency
            } if reg.event else None,
            "ticket": {
                "id": reg.ticket.id,
                "name": reg.ticket.name,
                "description": reg.ticket.description,
                "price": reg.ticket.price,
                "currency": reg.ticket.currency
            } if reg.ticket else None
        }

        # Ajouter les données utilisateur si l'inscription est de type USER
        if reg.user:
            reg_dict["user_first_name"] = reg.user.first_name
            reg_dict["user_last_name"] = reg.user.last_name
            reg_dict["user_email"] = reg.user.email
            reg_dict["user_phone"] = reg.user.phone

        result.append(reg_dict)

    # 🔍 DEBUG: Afficher ce qu'on renvoie
    print(f"\n🔍 GET /events/{event_id}/registrations - Total: {len(result)}")
    if result:
        print(f"   Premier participant:")
        print(f"     - registration_type: {result[0].get('registration_type')}")
        print(f"     - user_first_name: {result[0].get('user_first_name')}")
        print(f"     - user_last_name: {result[0].get('user_last_name')}")
        print(f"     - user_email: {result[0].get('user_email')}")
        print(f"     - guest_first_name: {result[0].get('guest_first_name')}")
        print(f"     - registered_at: {result[0].get('registered_at')}")
        print(f"     - registration_date: {result[0].get('registration_date')}")
        print(f"     - created_at: {result[0].get('created_at')}")

    return result
