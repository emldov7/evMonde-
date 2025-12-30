"""
Routes Admin - Dashboard pour les organisateurs d'événements
"""

from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
import csv
from io import StringIO

from app.config.database import get_db
from app.models.user import User
from app.models.event import Event
from app.models.registration import Registration, RegistrationStatus, PaymentStatus
from app.api.deps import get_current_user
from pydantic import BaseModel
from datetime import datetime


# Créer le routeur
router = APIRouter()


# ═══════════════════════════════════════════════════════════════
# SCHEMAS pour les stats
# ═══════════════════════════════════════════════════════════════

class ParticipantInfo(BaseModel):
    """Informations sur un participant"""
    id: int
    participant_name: str
    participant_email: str
    participant_phone: str | None
    registration_type: str
    status: str
    payment_status: str
    amount_paid: float
    currency: str | None
    registration_date: datetime
    qr_code_data: str | None
    scanned_count: int
    first_scan_at: datetime | None

    class Config:
        from_attributes = True


class EventStats(BaseModel):
    """Statistiques d'un événement"""
    event_id: int
    event_title: str

    # Inscriptions
    total_registrations: int
    confirmed_registrations: int
    pending_registrations: int
    cancelled_registrations: int

    # Paiements
    total_revenue: float
    currency: str | None
    paid_count: int
    pending_payment_count: int

    # Scans
    total_scans: int
    unique_participants_scanned: int

    # Places
    total_seats: int
    available_seats: int
    seats_percentage: float


# ═══════════════════════════════════════════════════════════════
# ROUTE 1 : Voir les participants de MON événement
# ═══════════════════════════════════════════════════════════════

@router.get("/events/{event_id}/participants", response_model=List[ParticipantInfo])
def get_event_participants(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Voir tous les participants d'un événement

    **Authentification requise**

    L'utilisateur doit être le CRÉATEUR de l'événement pour voir ses participants.

    Retourne la liste complète des participants avec :
    - Nom, email, téléphone
    - Statut d'inscription
    - Statut de paiement
    - QR code
    - Nombre de scans
    """

    # ÉTAPE 1 : Vérifier que l'événement existe et appartient à l'utilisateur
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.organizer_id == current_user.id
    ).first()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Événement non trouvé ou vous n'êtes pas l'organisateur"
        )

    # ÉTAPE 2 : Récupérer toutes les inscriptions
    registrations = db.query(Registration).filter(
        Registration.event_id == event_id
    ).order_by(Registration.created_at.desc()).all()

    # ÉTAPE 3 : Formater les données
    participants = []
    for reg in registrations:
        participants.append(ParticipantInfo(
            id=reg.id,
            participant_name=reg.get_participant_name(),
            participant_email=reg.get_participant_email(),
            participant_phone=reg.get_participant_phone(),
            registration_type=reg.registration_type.value,
            status=reg.status.value,
            payment_status=reg.payment_status.value,
            amount_paid=reg.amount_paid,
            currency=reg.currency,
            registration_date=reg.created_at,
            qr_code_data=reg.qr_code_data,
            scanned_count=reg.scanned_count,
            first_scan_at=reg.first_scan_at
        ))

    return participants


# ═══════════════════════════════════════════════════════════════
# ROUTE 2 : Exporter les participants en CSV
# ═══════════════════════════════════════════════════════════════

@router.get("/events/{event_id}/participants/export")
def export_participants_csv(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Exporter la liste des participants en CSV

    **Authentification requise**

    Télécharge un fichier CSV avec tous les participants.

    **Format du CSV** :
    - Nom
    - Email
    - Téléphone
    - Statut inscription
    - Statut paiement
    - Montant payé
    - Date d'inscription
    - QR Code
    - Nombre de scans
    """

    # ÉTAPE 1 : Vérifier que l'événement existe et appartient à l'utilisateur
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.organizer_id == current_user.id
    ).first()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Événement non trouvé ou vous n'êtes pas l'organisateur"
        )

    # ÉTAPE 2 : Récupérer toutes les inscriptions
    registrations = db.query(Registration).filter(
        Registration.event_id == event_id
    ).order_by(Registration.created_at.desc()).all()

    # ÉTAPE 3 : Créer le CSV
    output = StringIO()
    writer = csv.writer(output)

    # Headers
    writer.writerow([
        "ID",
        "Nom complet",
        "Email",
        "Téléphone",
        "Type",
        "Statut",
        "Paiement",
        "Montant payé",
        "Devise",
        "Date d'inscription",
        "QR Code",
        "Nombre de scans",
        "Premier scan"
    ])

    # Lignes de données
    for reg in registrations:
        writer.writerow([
            reg.id,
            reg.get_participant_name(),
            reg.get_participant_email(),
            reg.get_participant_phone() or "N/A",
            reg.registration_type.value,
            reg.status.value,
            reg.payment_status.value,
            f"{reg.amount_paid:.2f}",
            reg.currency or "N/A",
            reg.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            reg.qr_code_data or "N/A",
            reg.scanned_count,
            reg.first_scan_at.strftime("%Y-%m-%d %H:%M:%S") if reg.first_scan_at else "N/A"
        ])

    # ÉTAPE 4 : Retourner le CSV
    csv_content = output.getvalue()
    output.close()

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=participants_{event.slug}_{datetime.now().strftime('%Y%m%d')}.csv"
        }
    )


# ═══════════════════════════════════════════════════════════════
# ROUTE 3 : Statistiques d'un événement
# ═══════════════════════════════════════════════════════════════

@router.get("/events/{event_id}/stats", response_model=EventStats)
def get_event_stats(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Statistiques complètes d'un événement

    **Authentification requise**

    Retourne :
    - Nombre total d'inscriptions (par statut)
    - Revenus générés
    - Nombre de scans
    - Taux de remplissage
    """

    # ÉTAPE 1 : Vérifier que l'événement existe et appartient à l'utilisateur
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.organizer_id == current_user.id
    ).first()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Événement non trouvé ou vous n'êtes pas l'organisateur"
        )

    # ÉTAPE 2 : Compter les inscriptions par statut
    total_registrations = db.query(func.count(Registration.id)).filter(
        Registration.event_id == event_id
    ).scalar()

    confirmed_registrations = db.query(func.count(Registration.id)).filter(
        Registration.event_id == event_id,
        Registration.status == RegistrationStatus.CONFIRMED
    ).scalar()

    pending_registrations = db.query(func.count(Registration.id)).filter(
        Registration.event_id == event_id,
        Registration.status == RegistrationStatus.PENDING
    ).scalar()

    cancelled_registrations = db.query(func.count(Registration.id)).filter(
        Registration.event_id == event_id,
        Registration.status == RegistrationStatus.CANCELLED
    ).scalar()

    # ÉTAPE 3 : Calculer les revenus
    total_revenue = db.query(func.sum(Registration.amount_paid)).filter(
        Registration.event_id == event_id,
        Registration.payment_status == PaymentStatus.PAID
    ).scalar() or 0.0

    paid_count = db.query(func.count(Registration.id)).filter(
        Registration.event_id == event_id,
        Registration.payment_status == PaymentStatus.PAID
    ).scalar()

    pending_payment_count = db.query(func.count(Registration.id)).filter(
        Registration.event_id == event_id,
        Registration.payment_status == PaymentStatus.PENDING
    ).scalar()

    # ÉTAPE 4 : Compter les scans
    total_scans = db.query(func.sum(Registration.scanned_count)).filter(
        Registration.event_id == event_id
    ).scalar() or 0

    unique_participants_scanned = db.query(func.count(Registration.id)).filter(
        Registration.event_id == event_id,
        Registration.scanned_count > 0
    ).scalar()

    # ÉTAPE 5 : Calculer le taux de remplissage
    seats_percentage = (confirmed_registrations / event.total_seats * 100) if event.total_seats > 0 else 0

    # ÉTAPE 6 : Retourner les stats
    return EventStats(
        event_id=event.id,
        event_title=event.title,
        total_registrations=total_registrations or 0,
        confirmed_registrations=confirmed_registrations or 0,
        pending_registrations=pending_registrations or 0,
        cancelled_registrations=cancelled_registrations or 0,
        total_revenue=total_revenue,
        currency=event.currency,
        paid_count=paid_count or 0,
        pending_payment_count=pending_payment_count or 0,
        total_scans=total_scans,
        unique_participants_scanned=unique_participants_scanned or 0,
        total_seats=event.total_seats,
        available_seats=event.available_seats,
        seats_percentage=round(seats_percentage, 2)
    )


# ═══════════════════════════════════════════════════════════════
# ROUTE 4 : Liste de TOUS mes événements avec stats rapides
# ═══════════════════════════════════════════════════════════════

class MyEventSummary(BaseModel):
    """Résumé d'un événement avec stats"""
    id: int
    title: str
    slug: str
    format: str
    start_date: datetime
    end_date: datetime
    status: str
    is_free: bool
    price: float
    currency: str | None
    total_seats: int
    available_seats: int

    # Stats rapides
    total_registrations: int
    confirmed_registrations: int
    total_revenue: float

    class Config:
        from_attributes = True


@router.get("/my-events", response_model=List[MyEventSummary])
def get_my_events_with_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Liste de TOUS mes événements avec statistiques rapides

    **Authentification requise**

    Retourne tous les événements créés par l'utilisateur connecté
    avec des statistiques de base pour chacun.
    """

    # ÉTAPE 1 : Récupérer tous mes événements
    events = db.query(Event).filter(
        Event.organizer_id == current_user.id
    ).order_by(Event.created_at.desc()).all()

    # ÉTAPE 2 : Pour chaque événement, calculer les stats rapides
    result = []
    for event in events:
        # Compter inscriptions
        total_reg = db.query(func.count(Registration.id)).filter(
            Registration.event_id == event.id
        ).scalar() or 0

        confirmed_reg = db.query(func.count(Registration.id)).filter(
            Registration.event_id == event.id,
            Registration.status == RegistrationStatus.CONFIRMED
        ).scalar() or 0

        # Revenus
        revenue = db.query(func.sum(Registration.amount_paid)).filter(
            Registration.event_id == event.id,
            Registration.payment_status == PaymentStatus.PAID
        ).scalar() or 0.0

        result.append(MyEventSummary(
            id=event.id,
            title=event.title,
            slug=event.slug,
            format=event.event_format.value,
            start_date=event.start_date,
            end_date=event.end_date,
            status=event.status.value,
            is_free=event.is_free,
            price=event.price,
            currency=event.currency,
            total_seats=event.total_seats,
            available_seats=event.available_seats,
            total_registrations=total_reg,
            confirmed_registrations=confirmed_reg,
            total_revenue=revenue
        ))

    return result
