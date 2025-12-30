"""
Service Stripe - Gestion des paiements
"""

import stripe
from typing import Optional
from app.config.settings import settings

# Configurer Stripe avec la clé secrète
stripe.api_key = settings.STRIPE_SECRET_KEY


def create_checkout_session(
    registration_id: int,
    event_title: str,
    event_price: float,
    currency: str,
    participant_email: str,
    participant_name: str,
    success_url: str,
    cancel_url: str
) -> Optional[stripe.checkout.Session]:
    """
    Créer une session Stripe Checkout pour le paiement

    Args:
        registration_id: ID de l'inscription (pour le retrouver au webhook)
        event_title: Titre de l'événement
        event_price: Prix de l'événement
        currency: Devise (XOF, CAD, EUR...)
        participant_email: Email du participant
        participant_name: Nom du participant
        success_url: URL de redirection après paiement réussi
        cancel_url: URL de redirection si annulé

    Returns:
        stripe.checkout.Session: La session Stripe créée

    Exemple:
        >>> session = create_checkout_session(
        ...     registration_id=1,
        ...     event_title="Conférence Tech",
        ...     event_price=50.0,
        ...     currency="CAD",
        ...     participant_email="user@example.com",
        ...     participant_name="Jean Dupont",
        ...     success_url="http://localhost:3000/success",
        ...     cancel_url="http://localhost:3000/cancel"
        ... )
        >>> print(session.url)
        "https://checkout.stripe.com/c/pay/cs_test_..."
    """

    try:
        # Convertir le prix en centimes (Stripe utilise les plus petites unités)
        # Ex: 50.00 CAD = 5000 cents
        amount = int(event_price * 100)

        print(f"🔍 DEBUG create_checkout_session:")
        print(f"   Registration ID: {registration_id}")
        print(f"   Amount: {amount} {currency}")
        print(f"   Email: {participant_email}")
        print(f"   Name: {participant_name}")
        print(f"   Success URL: {success_url}")
        print(f"   Cancel URL: {cancel_url}")

        # Créer la session Stripe Checkout
        session = stripe.checkout.Session.create(
            # IDs pour retrouver l'inscription au webhook
            client_reference_id=str(registration_id),
            customer_email=participant_email,

            # Informations du produit (billet)
            line_items=[
                {
                    "price_data": {
                        "currency": currency.lower(),
                        "product_data": {
                            "name": f"Billet : {event_title}",
                            "description": f"Inscription à l'événement - {participant_name}",
                        },
                        "unit_amount": amount,
                    },
                    "quantity": 1,
                }
            ],

            # Mode de paiement
            mode="payment",  # Paiement unique (pas abonnement)

            # URLs de redirection
            success_url=success_url + "?session_id={CHECKOUT_SESSION_ID}",
            cancel_url=cancel_url,

            # Métadonnées pour le webhook
            metadata={
                "registration_id": str(registration_id),
                "event_title": event_title,
            },

            # Options
            payment_intent_data={
                "description": f"Inscription à {event_title}",
            },
        )

        print(f"✅ Session Stripe créée : {session.id}")
        return session

    except Exception as e:
        print(f"❌ Erreur lors de la création de la session Stripe : {e}")
        return None


def verify_webhook_signature(payload: bytes, sig_header: str) -> Optional[dict]:
    """
    Vérifier la signature du webhook Stripe

    Cette fonction vérifie que le webhook provient bien de Stripe
    et n'est pas une tentative de fraude.

    Args:
        payload: Corps de la requête (bytes)
        sig_header: Header "Stripe-Signature"

    Returns:
        dict: L'événement Stripe si valide, None sinon

    Exemple:
        >>> event = verify_webhook_signature(request.body, request.headers["Stripe-Signature"])
        >>> if event:
        ...     print(f"Événement : {event['type']}")
    """

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
        return event

    except ValueError:
        # Payload invalide
        print("❌ Webhook Stripe : Payload invalide")
        return None

    except stripe.error.SignatureVerificationError:
        # Signature invalide (possible tentative de fraude)
        print("❌ Webhook Stripe : Signature invalide")
        return None


def create_refund(payment_intent_id: str, amount: Optional[int] = None) -> Optional[stripe.Refund]:
    """
    Créer un remboursement Stripe

    Args:
        payment_intent_id: ID du PaymentIntent à rembourser
        amount: Montant à rembourser en centimes (None = remboursement total)

    Returns:
        stripe.Refund: Le remboursement créé

    Exemple:
        >>> refund = create_refund("pi_123456789")
        >>> print(refund.status)
        "succeeded"
    """

    try:
        refund = stripe.Refund.create(
            payment_intent=payment_intent_id,
            amount=amount  # None = remboursement total
        )

        print(f"✅ Remboursement créé : {refund.id}")
        return refund

    except Exception as e:
        print(f"❌ Erreur lors du remboursement : {e}")
        return None
