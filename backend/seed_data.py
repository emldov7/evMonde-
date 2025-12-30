"""
================================================
SCRIPT DE GÉNÉRATION DE DONNÉES DE TEST
================================================

Ce script génère des données réalistes pour peupler la base de données :
- Utilisateurs (organisateurs + participants)
- Catégories et tags
- Événements variés
- Inscriptions et paiements
- Transactions de commission
- Demandes de payout

Usage : python seed_data.py
"""

import sys
import os
from datetime import datetime, timedelta
import random
from decimal import Decimal

# Ajouter le répertoire parent au path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.config.database import engine, Base, SessionLocal
from app.models.user import User, UserRole
from app.models.category import Category
from app.models.tag import Tag
from app.models.event import Event, EventStatus, EventFormat
from app.models.registration import Registration, PaymentStatus, RegistrationType, RegistrationStatus
from app.models.commission import CommissionSettings, CommissionTransaction
from app.models.payout import Payout, PayoutStatus
from passlib.context import CryptContext
import logging

# Désactiver les logs SQLAlchemy pour éviter les erreurs d'encodage emoji sur Windows
logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)

# Context pour le hashing des mots de passe
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hasher un mot de passe"""
    return pwd_context.hash(password)


def clear_database(db: Session):
    """Vider toutes les tables"""
    print("\n[CLEAN] Nettoyage de la base de donnees...")

    # Ordre important pour respecter les contraintes de clés étrangères
    db.query(CommissionTransaction).delete()
    db.query(Payout).delete()
    db.query(Registration).delete()
    db.query(Event).delete()
    db.query(Tag).delete()
    db.query(Category).delete()
    db.query(User).filter(User.email != 'admin@evmonde.com').delete()  # Garder le superadmin

    db.commit()
    print("[OK] Base de donnees nettoyee")


def create_commission_settings(db: Session):
    """Créer ou mettre à jour les paramètres de commission"""
    print("\n[COMMISSION] Configuration de la commission...")

    settings = db.query(CommissionSettings).filter(CommissionSettings.id == 1).first()

    if not settings:
        settings = CommissionSettings(
            id=1,
            default_commission_rate=5.0,
            minimum_commission_amount=100.0,
            is_active=True,
            notes="Commission standard de la plateforme evMonde"
        )
        db.add(settings)
    else:
        settings.default_commission_rate = 5.0
        settings.minimum_commission_amount = 100.0
        settings.is_active = True

    db.commit()
    print(f"[OK] Commission configurée : {settings.default_commission_rate}%")
    return settings


def create_categories_and_tags(db: Session):
    """Créer des catégories et des tags"""
    print("\n[FOLDER] Création des catégories et tags...")

    # Catégories avec commissions personnalisées
    categories_data = [
        {"name": "Musique", "description": "Concerts, festivals, performances live", "icon": "🎵", "color": "#FF6B6B", "custom_commission_rate": 7},
        {"name": "Conférences", "description": "Conférences professionnelles, séminaires", "icon": "🎤", "color": "#4ECDC4", "custom_commission_rate": None},
        {"name": "Sport", "description": "Événements sportifs, compétitions", "icon": "⚽", "color": "#95E1D3", "custom_commission_rate": 10},
        {"name": "Tech", "description": "Hackathons, meetups tech, workshops", "icon": "💻", "color": "#3B82F6", "custom_commission_rate": None},
        {"name": "Art & Culture", "description": "Expositions, vernissages, théâtre", "icon": "🎨", "color": "#F38181", "custom_commission_rate": 6},
        {"name": "Business", "description": "Networking, pitch sessions, formations", "icon": "💼", "color": "#AA96DA", "custom_commission_rate": None},
    ]

    categories = []
    for i, cat_data in enumerate(categories_data):
        category = Category(
            name=cat_data["name"],
            slug=cat_data["name"].lower().replace(" ", "-").replace("&", "et"),
            description=cat_data["description"],
            icon=cat_data["icon"],
            color=cat_data["color"],
            display_order=i,
            custom_commission_rate=cat_data["custom_commission_rate"]
        )
        db.add(category)
        categories.append(category)

    db.commit()
    db.refresh(categories[0])  # Refresh pour obtenir les IDs

    print(f"[OK] {len(categories)} catégories créées")

    # Tags
    tags_data = [
        {"name": "Gratuit", "color": "#10B981"},
        {"name": "Premium", "color": "#F59E0B"},
        {"name": "Innovation", "color": "#3B82F6"},
        {"name": "Startup", "color": "#8B5CF6"},
        {"name": "Networking", "color": "#EC4899"},
        {"name": "Formation", "color": "#06B6D4"},
        {"name": "Famille", "color": "#84CC16"},
        {"name": "Jeunes", "color": "#F97316"},
    ]

    tags = []
    for tag_data in tags_data:
        tag = Tag(
            name=tag_data["name"],
            slug=tag_data["name"].lower(),
            color=tag_data["color"]
        )
        db.add(tag)
        tags.append(tag)

    db.commit()
    print(f"[OK] {len(tags)} tags créés")

    return categories, tags


def create_users(db: Session):
    """Créer des utilisateurs de test"""
    print("\n[USERS] Création des utilisateurs...")

    # Organisateurs
    organizers_data = [
        {"first_name": "Jean", "last_name": "Dupont", "email": "jean.dupont@evmonde.com", "phone_country_code": "+33", "phone": "612345678", "country_code": "FR", "country_name": "France"},
        {"first_name": "Marie", "last_name": "Martin", "email": "marie.martin@evmonde.com", "phone_country_code": "+33", "phone": "698765432", "country_code": "FR", "country_name": "France"},
        {"first_name": "Amadou", "last_name": "Diallo", "email": "amadou.diallo@evmonde.com", "phone_country_code": "+221", "phone": "771234567", "country_code": "SN", "country_name": "Sénégal"},
        {"first_name": "Fatou", "last_name": "Sow", "email": "fatou.sow@evmonde.com", "phone_country_code": "+221", "phone": "779876543", "country_code": "SN", "country_name": "Sénégal"},
        {"first_name": "Sophie", "last_name": "Laurent", "email": "sophie.laurent@evmonde.com", "phone_country_code": "+33", "phone": "687654321", "country_code": "FR", "country_name": "France"},
    ]

    organizers = []
    for org_data in organizers_data:
        organizer = User(
            email=org_data["email"],
            hashed_password=hash_password("password123"),
            first_name=org_data["first_name"],
            last_name=org_data["last_name"],
            phone_country_code=org_data["phone_country_code"],
            phone=org_data["phone"],
            phone_full=org_data["phone_country_code"] + org_data["phone"],
            country_code=org_data["country_code"],
            country_name=org_data["country_name"],
            role=UserRole.ORGANIZER,
            is_active=True,
            is_verified=True
        )
        db.add(organizer)
        organizers.append(organizer)

    db.commit()
    db.refresh(organizers[0])

    print(f"[OK] {len(organizers)} organisateurs créés")

    # Participants
    participants_data = [
        {"first_name": "Pierre", "last_name": "Dubois", "email": "pierre.dubois@email.com", "phone_country_code": "+33", "phone": "601234567", "country_code": "FR", "country_name": "France"},
        {"first_name": "Emma", "last_name": "Bernard", "email": "emma.bernard@email.com", "phone_country_code": "+33", "phone": "602345678", "country_code": "FR", "country_name": "France"},
        {"first_name": "Lucas", "last_name": "Moreau", "email": "lucas.moreau@email.com", "phone_country_code": "+33", "phone": "603456789", "country_code": "FR", "country_name": "France"},
        {"first_name": "Aïcha", "last_name": "Ndiaye", "email": "aicha.ndiaye@email.com", "phone_country_code": "+221", "phone": "761234567", "country_code": "SN", "country_name": "Sénégal"},
        {"first_name": "Mohamed", "last_name": "Kane", "email": "mohamed.kane@email.com", "phone_country_code": "+221", "phone": "762345678", "country_code": "SN", "country_name": "Sénégal"},
    ]

    participants = []
    for part_data in participants_data:
        participant = User(
            email=part_data["email"],
            hashed_password=hash_password("password123"),
            first_name=part_data["first_name"],
            last_name=part_data["last_name"],
            phone_country_code=part_data["phone_country_code"],
            phone=part_data["phone"],
            phone_full=part_data["phone_country_code"] + part_data["phone"],
            country_code=part_data["country_code"],
            country_name=part_data["country_name"],
            role=UserRole.PARTICIPANT,
            is_active=True,
            is_verified=True
        )
        db.add(participant)
        participants.append(participant)

    db.commit()
    print(f"[OK] {len(participants)} participants créés")

    return organizers, participants


def create_events(db: Session, categories, organizers):
    """Créer des événements variés"""
    print("\n[EVENT] Création des événements...")

    events_data = [
        {
            "title": "Festival Jazz International 2025",
            "description": "Le plus grand festival de jazz de l'année avec des artistes internationaux. 3 jours de concerts exceptionnels.",
            "category_idx": 0,  # Musique
            "organizer_idx": 0,
            "price": 15000.0,
            "capacity": 500,
            "location": "Dakar Arena, Sénégal",
            "format": EventFormat.PHYSICAL,
            "status": EventStatus.PUBLISHED,
            "is_featured": True,
            "days_offset": 30
        },
        {
            "title": "Tech Summit Africa 2025",
            "description": "Conférence tech réunissant les meilleurs speakers africains et internationaux. Networking, workshops, pitch sessions.",
            "category_idx": 3,  # Tech
            "organizer_idx": 1,
            "price": 25000.0,
            "capacity": 300,
            "location": "Abdou Diouf Conference Center, Dakar",
            "format": EventFormat.HYBRID,
            "status": EventStatus.PUBLISHED,
            "is_featured": True,
            "days_offset": 45
        },
        {
            "title": "Marathon de Dakar 2025",
            "description": "Course internationale de 42km à travers les rues de Dakar. Ouvert à tous les niveaux.",
            "category_idx": 2,  # Sport
            "organizer_idx": 2,
            "price": 5000.0,
            "capacity": 1000,
            "location": "Corniche de Dakar",
            "format": EventFormat.PHYSICAL,
            "status": EventStatus.PUBLISHED,
            "is_featured": False,
            "days_offset": 60
        },
        {
            "title": "Exposition Art Contemporain",
            "description": "Découvrez les œuvres de 20 artistes contemporains africains. Vernissage suivi d'un cocktail.",
            "category_idx": 4,  # Art & Culture
            "organizer_idx": 3,
            "price": 3000.0,
            "capacity": 200,
            "location": "Galerie Nationale, Dakar",
            "format": EventFormat.PHYSICAL,
            "status": EventStatus.PUBLISHED,
            "is_featured": False,
            "days_offset": 15
        },
        {
            "title": "Startup Pitch Night",
            "description": "Soirée de pitch pour startups en recherche de financement. Investisseurs et entrepreneurs réunis.",
            "category_idx": 5,  # Business
            "organizer_idx": 4,
            "price": 10000.0,
            "capacity": 150,
            "location": "Impact Hub Dakar",
            "format": EventFormat.PHYSICAL,
            "status": EventStatus.PUBLISHED,
            "is_featured": True,
            "days_offset": 20
        },
        {
            "title": "Concert Youssou N'Dour - Live",
            "description": "Concert exclusif de la légende sénégalaise. Ne manquez pas cet événement historique!",
            "category_idx": 0,  # Musique
            "organizer_idx": 0,
            "price": 20000.0,
            "capacity": 800,
            "location": "Grand Théâtre National, Dakar",
            "format": EventFormat.PHYSICAL,
            "status": EventStatus.PUBLISHED,
            "is_featured": True,
            "days_offset": 50
        },
        {
            "title": "Webinaire: Future of AI in Africa",
            "description": "Conférence en ligne sur l'intelligence artificielle en Afrique avec des experts internationaux.",
            "category_idx": 3,  # Tech
            "organizer_idx": 1,
            "price": 2000.0,
            "capacity": 500,
            "location": "En ligne",
            "format": EventFormat.VIRTUAL,
            "status": EventStatus.PUBLISHED,
            "is_featured": False,
            "days_offset": 10
        },
        {
            "title": "Formation Leadership & Management",
            "description": "Formation intensive de 2 jours sur le leadership moderne et le management d'équipe.",
            "category_idx": 5,  # Business
            "organizer_idx": 4,
            "price": 50000.0,
            "capacity": 50,
            "location": "Hôtel Radisson Blu, Dakar",
            "format": EventFormat.PHYSICAL,
            "status": EventStatus.PUBLISHED,
            "is_featured": False,
            "days_offset": 35
        },
    ]

    events = []
    now = datetime.now()

    for event_data in events_data:
        start_date = now + timedelta(days=event_data["days_offset"])
        end_date = start_date + timedelta(hours=random.randint(2, 8))

        event = Event(
            title=event_data["title"],
            description=event_data["description"],
            category_id=categories[event_data["category_idx"]].id,
            organizer_id=organizers[event_data["organizer_idx"]].id,
            start_date=start_date,
            end_date=end_date,
            location=event_data["location"],
            city="Dakar",
            country_code="SN",
            price=event_data["price"],
            currency="XOF",
            capacity=event_data["capacity"],
            available_seats=event_data["capacity"],
            event_format=event_data["format"],
            status=event_data["status"],
            is_featured=event_data["is_featured"],
            is_published=True
        )
        db.add(event)
        events.append(event)

    db.commit()
    db.refresh(events[0])

    print(f"[OK] {len(events)} événements créés")
    return events


def create_registrations_and_commissions(db: Session, events, participants, commission_settings):
    """Créer des inscriptions et calculer les commissions"""
    print("\n[NOTE] Création des inscriptions et des commissions...")

    registrations_count = 0
    commissions_count = 0
    total_revenue = 0
    total_commissions = 0

    for event in events:
        # Chaque événement a entre 10 et 100 inscriptions (ou moins si capacité limitée)
        num_registrations = min(random.randint(10, 100), event.capacity)

        for i in range(num_registrations):
            participant = random.choice(participants)

            # Créer l'inscription
            registration = Registration(
                event_id=event.id,
                user_id=participant.id,
                registration_type=RegistrationType.USER,
                amount_paid=event.price,
                currency=event.currency,
                payment_status=PaymentStatus.PAID,  # Toutes payées pour la démo
                status=RegistrationStatus.CONFIRMED,
                stripe_payment_intent_id=f"pi_test_{event.id}_{i}_{random.randint(1000, 9999)}"
            )
            db.add(registration)
            db.flush()  # Pour obtenir l'ID

            registrations_count += 1
            total_revenue += event.price

            # Calculer la commission
            # Utiliser la commission de la catégorie si définie, sinon la globale
            category = next((c for c in db.query(Category).all() if c.id == event.category_id), None)
            commission_rate = category.custom_commission_rate if category and category.custom_commission_rate else commission_settings.default_commission_rate

            commission_amount = (event.price * commission_rate / 100)
            commission_amount = max(commission_amount, commission_settings.minimum_commission_amount)
            net_amount = event.price - commission_amount

            # Créer la transaction de commission
            commission_tx = CommissionTransaction(
                registration_id=registration.id,
                event_id=event.id,
                organizer_id=event.organizer_id,
                ticket_amount=event.price,
                commission_rate=commission_rate,
                commission_amount=commission_amount,
                net_amount=net_amount,
                currency=event.currency,
                stripe_payment_intent_id=registration.stripe_payment_intent_id
            )
            db.add(commission_tx)

            commissions_count += 1
            total_commissions += commission_amount

        # Mettre à jour les sièges disponibles
        event.available_seats = event.capacity - num_registrations

    db.commit()

    print(f"[OK] {registrations_count} inscriptions créées")
    print(f"[OK] {commissions_count} transactions de commission créées")
    print(f"[MONEY] Revenu total: {total_revenue:,.0f} XOF")
    print(f"[CASH] Commissions totales: {total_commissions:,.0f} XOF")

    return registrations_count, total_revenue, total_commissions


def create_payouts(db: Session, organizers):
    """Créer des demandes de payout"""
    print("\n[CARD] Création des demandes de payout...")

    payouts_data = [
        {
            "organizer_idx": 0,
            "amount": 50000.0,
            "status": PayoutStatus.PENDING,
            "method": "Bank Transfer",
            "account": "IBAN: SN12 1234 5678 9012 3456 7890 12",
            "message": "Demande de paiement pour les événements du mois"
        },
        {
            "organizer_idx": 1,
            "amount": 75000.0,
            "status": PayoutStatus.APPROVED,
            "method": "Mobile Money",
            "account": "Orange Money: +221 77 123 45 67",
            "message": "Paiement urgent svp"
        },
        {
            "organizer_idx": 2,
            "amount": 30000.0,
            "status": PayoutStatus.COMPLETED,
            "method": "Bank Transfer",
            "account": "IBAN: SN98 9876 5432 1098 7654 3210 98",
            "message": None
        },
        {
            "organizer_idx": 3,
            "amount": 25000.0,
            "status": PayoutStatus.REJECTED,
            "method": "Wave",
            "account": "Wave: +221 70 987 65 43",
            "message": "Besoin urgent"
        },
    ]

    payouts = []
    for payout_data in payouts_data:
        organizer = organizers[payout_data["organizer_idx"]]

        requested_at = datetime.now() - timedelta(days=random.randint(1, 15))

        payout = Payout(
            organizer_id=organizer.id,
            amount=payout_data["amount"],
            currency="XOF",
            status=payout_data["status"],
            payout_method=payout_data["method"],
            account_details=payout_data["account"],  # En prod, ce serait crypté
            organizer_message=payout_data["message"],
            requested_at=requested_at
        )

        # Dates selon le statut
        if payout_data["status"] in [PayoutStatus.APPROVED, PayoutStatus.COMPLETED]:
            payout.approved_at = requested_at + timedelta(days=1)

        if payout_data["status"] == PayoutStatus.COMPLETED:
            payout.completed_at = requested_at + timedelta(days=3)

        if payout_data["status"] == PayoutStatus.REJECTED:
            payout.rejected_at = requested_at + timedelta(days=1)
            payout.admin_notes = "Informations bancaires incorrectes"

        db.add(payout)
        payouts.append(payout)

    db.commit()
    print(f"[OK] {len(payouts)} demandes de payout créées")

    return payouts


def main():
    """Fonction principale"""
    print("\n" + "="*60)
    print("[SEED] GÉNÉRATION DE DONNÉES DE TEST - evMonde")
    print("="*60)

    # Créer une session
    db = SessionLocal()

    try:
        # Nettoyer la base
        clear_database(db)

        # Configuration de la commission
        commission_settings = create_commission_settings(db)

        # Catégories et tags
        categories, tags = create_categories_and_tags(db)

        # Utilisateurs
        organizers, participants = create_users(db)

        # Événements
        events = create_events(db, categories, organizers)

        # Inscriptions et commissions
        reg_count, revenue, commissions = create_registrations_and_commissions(
            db, events, participants, commission_settings
        )

        # Payouts
        payouts = create_payouts(db, organizers)

        print("\n" + "="*60)
        print("[OK] GÉNÉRATION TERMINÉE AVEC SUCCÈS!")
        print("="*60)
        print(f"\n[STATS] RÉSUMÉ:")
        print(f"  - {len(categories)} catégories")
        print(f"  - {len(tags)} tags")
        print(f"  - {len(organizers)} organisateurs")
        print(f"  - {len(participants)} participants")
        print(f"  - {len(events)} événements")
        print(f"  - {reg_count} inscriptions")
        print(f"  - {len(payouts)} demandes de payout")
        print(f"\n[MONEY] FINANCES:")
        print(f"  - Revenu total: {revenue:,.0f} XOF")
        print(f"  - Commissions: {commissions:,.0f} XOF")
        print(f"  - Commission moyenne: {(commissions/revenue*100):.1f}%")
        print("\n[LOCK] CONNEXION TEST:")
        print("  - Organisateur: jean.dupont@evmonde.com / password123")
        print("  - Participant: pierre.dubois@email.com / password123")
        print("  - SuperAdmin: admin@evmonde.com / (mot de passe existant)")
        print("\n")

    except Exception as e:
        print(f"\n[ERROR] ERREUR: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
