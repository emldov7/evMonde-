"""
Routes Webhooks - Gestion des webhooks externes (Stripe, etc.)
"""

from fastapi import APIRouter, Request, HTTPException, status, Depends
from sqlalchemy.orm import Session
from datetime import datetime

from app.config.database import get_db
from app.models.registration import Registration, RegistrationStatus, PaymentStatus
from app.models.event import Event
from app.models.ticket import Ticket
from app.models.commission import CommissionSettings, CommissionTransaction
from app.models.notification_preferences import NotificationPreferences
from app.models.notification import Notification
from app.services.stripe_service import verify_webhook_signature
from app.services.email_service import send_registration_confirmation_email, send_organizer_new_registration_email
from app.utils.qrcode_generator import generate_registration_qr_code
from app.services.waitlist_service import allocate_waitlist_if_possible


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
# ROUTE WEBHOOK : Stripe Payment Confirmation
# ═══════════════════════════════════════════════════════════════

@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Webhook Stripe - Confirmation de paiement

    Cette route est appelée AUTOMATIQUEMENT par Stripe quand :
    - Un paiement est confirmé (checkout.session.completed)
    - Un paiement échoue
    - Un remboursement est effectué

    **IMPORTANT** :
    - Cette route DOIT être accessible publiquement (pas d'auth)
    - Stripe l'appelle depuis ses serveurs
    - On DOIT vérifier la signature pour éviter les fraudes

    **Processus quand paiement confirmé** :
    1. Vérifier la signature Stripe (sécurité)
    2. Récupérer l'inscription via registration_id
    3. Confirmer l'inscription (PENDING → CONFIRMED)
    4. Confirmer le paiement (PENDING → PAID)
    5. Générer le QR code
    6. Réduire les places disponibles
    7. Envoyer l'email avec le billet
    """

    print("\n" + "="*80)
    print("🔔 WEBHOOK STRIPE REÇU")
    print("="*80)

    # ÉTAPE 1 : Récupérer le corps de la requête et la signature
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    print(f"📥 Signature header présent: {bool(sig_header)}")

    if not sig_header:
        print("❌ ERREUR: Signature Stripe manquante")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Signature Stripe manquante"
        )

    # ÉTAPE 2 : Vérifier la signature (sécurité anti-fraude)
    event = verify_webhook_signature(payload, sig_header)

    if not event:
        print("❌ ERREUR: Signature Stripe invalide")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Signature Stripe invalide"
        )

    # ÉTAPE 3 : Gérer l'événement selon son type
    event_type = event["type"]
    print(f"📋 Type d'événement: {event_type}")

    # ═══════════════════════════════════════════════════════════════
    # CAS 1 : Paiement confirmé ✅
    # ═══════════════════════════════════════════════════════════════
    if event_type == "checkout.session.completed":
        print("\n✅ TRAITEMENT PAIEMENT CONFIRMÉ")
        print("-" * 80)

        session = event["data"]["object"]
        print(f"🔑 Session ID Stripe: {session.get('id')}")

        # Récupérer l'ID de l'inscription depuis les métadonnées
        registration_id = session.get("client_reference_id")
        print(f"🎫 Registration ID récupéré: {registration_id}")

        if not registration_id:
            print("❌ ERREUR: Pas de registration_id dans la session")
            print(f"📋 Données session disponibles: {list(session.keys())}")
            return {"status": "error", "message": "Registration ID manquant"}

        # Récupérer l'inscription
        print(f"🔍 Recherche de l'inscription #{registration_id} dans la base...")
        registration = db.query(Registration).filter(
            Registration.id == int(registration_id)
        ).first()

        if not registration:
            print(f"❌ ERREUR: Inscription #{registration_id} introuvable dans la base")
            return {"status": "error", "message": "Inscription introuvable"}

        print(f"📄 Inscription trouvée:")
        print(f"   - ID: {registration.id}")
        print(f"   - Status actuel: {registration.status}")
        print(f"   - Payment status: {registration.payment_status}")
        print(f"   - Event ID: {registration.event_id}")
        print(f"   - User ID: {registration.user_id}")

        # Vérifier que l'inscription n'est pas déjà confirmée
        if registration.status == RegistrationStatus.CONFIRMED:
            print(f"⚠️ Inscription #{registration_id} déjà confirmée - Pas de traitement")
            return {"status": "already_processed"}

        # CONFIRMER L'INSCRIPTION ET LE PAIEMENT
        print("\n🔄 MISE À JOUR DU STATUT...")
        print(f"   - Status: {registration.status} → CONFIRMED")
        print(f"   - Payment: {registration.payment_status} → PAID")

        registration.status = RegistrationStatus.CONFIRMED
        registration.payment_status = PaymentStatus.PAID
        registration.stripe_session_id = session.get("id")

        print(f"✅ Statuts mis à jour en mémoire")

        # Enregistrer l'ID du PaymentIntent (pour remboursements)
        if session.get("payment_intent"):
            registration.stripe_payment_intent_id = session.get("payment_intent")
            print(f"💳 Payment Intent ID enregistré: {session.get('payment_intent')}")

        # GÉNÉRER LE QR CODE
        print("\n📱 GÉNÉRATION QR CODE...")
        if not registration.qr_code_data:
            qr_code_data, qr_code_path = generate_registration_qr_code()
            registration.qr_code_data = qr_code_data
            registration.qr_code_url = f"{settings.BACKEND_URL}/{qr_code_path}"
            print(f"✅ QR Code généré: {qr_code_path}")
        else:
            print(f"⚠️ QR Code déjà existant: {registration.qr_code_url}")

        # DÉCRÉMENTER LE TICKET ET L'ÉVÉNEMENT
        print("\n🎟️ MISE À JOUR DES PLACES...")
        event = db.query(Event).filter(Event.id == registration.event_id).first()
        if event:
            print(f"📍 Événement: {event.title}")
            print(f"   - Places disponibles avant: {event.available_seats}")
            event.available_seats -= 1
            print(f"   - Places disponibles après: {event.available_seats}")
        else:
            print(f"❌ Événement #{registration.event_id} introuvable!")

        # ← NOUVEAU: Incrémenter les ventes du ticket spécifique
        if registration.ticket_id:
            ticket = db.query(Ticket).filter(Ticket.id == registration.ticket_id).first()
            if ticket:
                print(f"🎫 Ticket: {ticket.name}")
                print(f"   - Ventes avant: {ticket.quantity_sold}")
                ticket.quantity_sold += 1
                print(f"   - Ventes après: {ticket.quantity_sold}")
            else:
                print(f"⚠️ Ticket #{registration.ticket_id} introuvable")

        # ═══════════════════════════════════════════════════════════════
        # CALCUL ET ENREGISTREMENT DE LA COMMISSION
        # ═══════════════════════════════════════════════════════════════

        # Récupérer les settings de commission
        commission_settings = db.query(CommissionSettings).first()

        if commission_settings and commission_settings.is_active and registration.amount_paid > 0:
            # Déterminer le taux de commission à appliquer
            # 1. Si la catégorie a une commission custom, on l'utilise
            # 2. Sinon, on utilise la commission globale
            commission_rate = commission_settings.default_commission_rate

            if event.category_id:
                from app.models.category import Category
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
                    notes=f"Commission prélevée pour {event.title} (webhook)"
                )

                db.add(commission_transaction)

                print(f"💰 Commission: {commission_amount} {registration.currency} ({commission_rate}%) créée via webhook")
                print(f"📊 Net pour organisateur: {net_amount} {registration.currency}")
            else:
                print(f"ℹ️ Commission déjà existante pour l'inscription #{registration.id} (montant: {existing_commission.commission_amount} {existing_commission.currency})")

        # Sauvegarder
        print("\n💾 SAUVEGARDE EN BASE DE DONNÉES...")
        try:
            db.commit()
            print("✅ Commit réussi!")
            db.refresh(registration)
            print(f"✅ Registration refreshed - Nouveau statut: {registration.status}")
            print(f"✅ Inscription #{registration_id} confirmée après paiement Stripe")
        except Exception as e:
            print(f"❌ ERREUR lors du commit: {e}")
            db.rollback()
            raise

        # ENVOYER L'EMAIL AVEC LE BILLET
        print("\n📧 ENVOI DE L'EMAIL DE CONFIRMATION...")
        try:
            # Récupérer les informations pour l'email
            participant_name = registration.get_participant_name()
            participant_email = registration.get_participant_email()
            event_date_str = event.start_date.strftime("%d/%m/%Y à %H:%M")

            print(f"📧 Destinataire: {participant_email}")
            print(f"👤 Nom: {participant_name}")
            print(f"🎉 Événement: {event.title}")

            # Envoyer l'email
            email_sent = send_registration_confirmation_email(
                to_email=participant_email,
                participant_name=participant_name,
                event_title=event.title,
                event_date=event_date_str,
                event_location=event.location if event.event_format != "virtual" else None,
                event_format=event.event_format,
                qr_code_url=registration.qr_code_url,
                qr_code_path=registration.qr_code_url.replace("http://localhost:8000/", ""),
                virtual_meeting_url=event.virtual_meeting_url if event.event_format in ["virtual", "hybrid"] else None
            )

            # Mettre à jour le statut d'envoi
            if email_sent:
                registration.email_sent = True
                registration.email_sent_at = datetime.utcnow()
                db.commit()
                print(f"✅ Email envoyé avec succès à {participant_email}")
            else:
                print(f"⚠️ Échec de l'envoi de l'email à {participant_email}")

            # Notification organisateur (si activée)
            try:
                if event and event.organizer and event.organizer.email:
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
                            print(f"⚠️ notif organizer (webhook): erreur création notification in-app: {e}")

                        send_organizer_new_registration_email(
                            to_email=event.organizer.email,
                            organizer_name=f"{event.organizer.first_name} {event.organizer.last_name}".strip() or event.organizer.email,
                            event_title=event.title,
                            participant_name=participant_name,
                            participant_email=participant_email,
                            registration_status=str(registration.status)
                        )
            except Exception as e:
                print(f"⚠️ notif organizer (webhook): erreur envoi email: {e}")

        except Exception as e:
            print(f"❌ Erreur lors de l'envoi de l'email : {e}")
            import traceback
            traceback.print_exc()

        print("\n" + "="*80)
        print("✅ WEBHOOK TRAITÉ AVEC SUCCÈS")
        print(f"   Registration ID: {registration_id}")
        print(f"   Status final: {registration.status}")
        print("="*80 + "\n")

        return {"status": "success", "registration_id": registration_id}

    # ═══════════════════════════════════════════════════════════════
    # CAS 2 : Paiement échoué ❌
    # ═══════════════════════════════════════════════════════════════
    elif event_type == "checkout.session.expired":
        session = event["data"]["object"]
        registration_id = session.get("client_reference_id")

        if registration_id:
            registration = db.query(Registration).filter(
                Registration.id == int(registration_id)
            ).first()

            if registration:
                registration.status = RegistrationStatus.CANCELLED
                registration.payment_status = PaymentStatus.FAILED
                db.commit()

                print(f"❌ Inscription #{registration_id} annulée (session expirée)")

        return {"status": "expired"}

    # ═══════════════════════════════════════════════════════════════
    # CAS 3 : Remboursement ↩️
    # ═══════════════════════════════════════════════════════════════
    elif event_type == "charge.refunded":
        charge = event["data"]["object"]
        payment_intent_id = charge.get("payment_intent")

        if payment_intent_id:
            registration = db.query(Registration).filter(
                Registration.stripe_payment_intent_id == payment_intent_id
            ).first()

            if registration:
                already_refunded = registration.payment_status == PaymentStatus.REFUNDED

                registration.status = RegistrationStatus.REFUNDED
                registration.payment_status = PaymentStatus.REFUNDED

                # Rendre la place disponible (global event) seulement si pas déjà traité
                event = db.query(Event).filter(Event.id == registration.event_id).first()
                if event and not already_refunded:
                    event.available_seats = (event.available_seats or 0) + 1

                    # Décrémenter les ventes du ticket spécifique
                    if registration.ticket_id:
                        ticket = db.query(Ticket).filter(Ticket.id == registration.ticket_id).first()
                        if ticket:
                            ticket.quantity_sold = max(0, ticket.quantity_sold - 1)

                db.commit()
                print(f"↩️ Inscription #{registration.id} remboursée")

                # Attribution automatique au 1er de la waitlist
                if event and not already_refunded:
                    try:
                        allocate_waitlist_if_possible(db=db, event_id=event.id)
                    except Exception as e:
                        print(f"⚠️ waitlist allocation error after refund: {e}")

        return {"status": "refunded"}

    # ═══════════════════════════════════════════════════════════════
    # CAS 4 : Événement non géré
    # ═══════════════════════════════════════════════════════════════
    else:
        print(f"ℹ️ Webhook Stripe : Événement non géré : {event_type}")
        return {"status": "ignored", "event_type": event_type}
