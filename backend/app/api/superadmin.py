"""
Routes SuperAdmin - Dashboard pour les administrateurs de la plateforme

🔐 TOUTES ces routes nécessitent un compte ADMIN

Fonctionnalités :
- Gestion complète des utilisateurs (voir, suspendre, supprimer, promouvoir)
- Gestion complète des événements (voir tout, modifier, supprimer, modérer)
- Statistiques globales de la plateforme
- Modération et signalements
- Gestion financière
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel

from app.config.database import get_db
from app.models.user import User, UserRole
from app.models.event import Event, EventStatus
from app.models.registration import Registration, RegistrationStatus, PaymentStatus
from app.models.commission import CommissionTransaction
from app.models.category import Category
from app.models.payout import Payout, PayoutStatus
from app.api.deps import get_current_admin


# Créer le routeur
router = APIRouter()


# ═══════════════════════════════════════════════════════════════
# SCHEMAS
# ═══════════════════════════════════════════════════════════════

class UserAdminInfo(BaseModel):
    """Informations détaillées d'un utilisateur pour l'admin"""
    id: int
    email: str
    first_name: str
    last_name: str
    country_code: str
    country_name: str
    phone_full: str
    role: str
    is_active: bool
    is_suspended: bool
    suspension_reason: str | None
    suspended_at: datetime | None
    is_verified: bool
    created_at: datetime
    last_login_at: datetime | None

    # Stats
    total_events_created: int = 0
    total_registrations: int = 0
    total_revenue_generated: float = 0.0

    class Config:
        from_attributes = True


class SuspendUserRequest(BaseModel):
    """Requête pour suspendre un utilisateur"""
    reason: str


class PromoteUserRequest(BaseModel):
    """Requête pour changer le rôle d'un utilisateur"""
    new_role: UserRole


class EventAdminInfo(BaseModel):
    """Informations détaillées d'un événement pour l'admin"""
    id: int
    title: str
    description: str | None = None
    event_format: str  # Changed from 'format' to match DB field
    status: str
    start_date: datetime
    end_date: datetime | None = None
    location: str | None = None
    city: str | None = None
    country_code: str | None = None
    is_free: bool
    price: float | None = None
    currency: str | None = None
    capacity: int  # Changed from 'total_seats' to match DB field
    available_seats: int
    is_featured: bool
    is_flagged: bool
    flag_reason: str | None = None
    admin_notes: str | None = None
    created_at: datetime

    # Organisateur
    organizer_id: int
    organizer_name: str
    organizer_email: str

    # Stats
    total_registrations: int = 0
    total_revenue: float = 0.0

    class Config:
        from_attributes = True


class FlagEventRequest(BaseModel):
    """Requête pour signaler un événement"""
    reason: str


class UpdateAdminNotesRequest(BaseModel):
    """Requête pour mettre à jour les notes admin"""
    notes: str


class PlatformStats(BaseModel):
    """Statistiques globales de la plateforme"""
    # Utilisateurs
    total_users: int
    active_users: int
    suspended_users: int
    admin_users: int
    organizer_users: int
    participant_users: int
    new_users_this_month: int

    # Événements
    total_events: int
    published_events: int
    draft_events: int
    cancelled_events: int
    featured_events: int
    flagged_events: int
    new_events_this_month: int

    # Inscriptions
    total_registrations: int
    confirmed_registrations: int
    pending_registrations: int
    cancelled_registrations: int
    new_registrations_this_month: int

    # Financier
    total_revenue: float
    revenue_this_month: float
    total_paid_registrations: int
    average_ticket_price: float
    commission_revenue: float  # Total des commissions prélevées


class DashboardStats(BaseModel):
    """KPIs synthétiques pour le dashboard SuperAdmin"""
    total_users: int
    active_events: int
    total_revenue: float
    commission_revenue: float
    total_registrations: int
    pending_payouts: int
    active_categories: int
    growth_rate: float


class TopOrganizer(BaseModel):
    """Top organisateur"""
    id: int
    name: str
    email: str
    total_events: int
    total_registrations: int
    total_revenue: float


class TopEvent(BaseModel):
    """Événement le plus populaire"""
    id: int
    title: str
    organizer_name: str
    total_registrations: int
    total_revenue: float


# ═══════════════════════════════════════════════════════════════
# SECTION 1 : GESTION DES UTILISATEURS
# ═══════════════════════════════════════════════════════════════

@router.get("/users", response_model=List[UserAdminInfo])
def get_all_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    role: Optional[str] = None,
    is_suspended: Optional[bool] = None,
    search: Optional[str] = None,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    **[ADMIN ONLY]** Voir tous les utilisateurs de la plateforme

    Filtres disponibles :
    - role : Filtrer par rôle (admin, organizer, participant)
    - is_suspended : Filtrer par statut de suspension
    - search : Rechercher par nom ou email

    Retourne la liste complète avec statistiques pour chaque utilisateur.
    """

    # Base query
    query = db.query(User)

    # Filtres
    if role:
        query = query.filter(User.role == role)

    if is_suspended is not None:
        query = query.filter(User.is_suspended == is_suspended)

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (User.first_name.ilike(search_pattern)) |
            (User.last_name.ilike(search_pattern)) |
            (User.email.ilike(search_pattern))
        )

    # Pagination
    users = query.order_by(desc(User.created_at)).offset(skip).limit(limit).all()

    # Ajouter les stats pour chaque utilisateur
    result = []
    for user in users:
        # Compter événements créés
        total_events = db.query(func.count(Event.id)).filter(
            Event.organizer_id == user.id
        ).scalar() or 0

        # Compter inscriptions
        total_registrations = db.query(func.count(Registration.id)).filter(
            Registration.user_id == user.id
        ).scalar() or 0

        # Calculer revenus générés (pour les organisateurs)
        total_revenue = db.query(func.sum(Registration.amount_paid)).join(Event).filter(
            Event.organizer_id == user.id,
            Registration.payment_status == PaymentStatus.PAID
        ).scalar() or 0.0

        result.append(UserAdminInfo(
            **user.__dict__,
            total_events_created=total_events,
            total_registrations=total_registrations,
            total_revenue_generated=total_revenue
        ))

    return result


@router.get("/users/{user_id}", response_model=UserAdminInfo)
def get_user_details(
    user_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    **[ADMIN ONLY]** Voir les détails complets d'un utilisateur
    """

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur non trouvé"
        )

    # Stats
    total_events = db.query(func.count(Event.id)).filter(
        Event.organizer_id == user.id
    ).scalar() or 0

    total_registrations = db.query(func.count(Registration.id)).filter(
        Registration.user_id == user.id
    ).scalar() or 0

    total_revenue = db.query(func.sum(Registration.amount_paid)).join(Event).filter(
        Event.organizer_id == user.id,
        Registration.payment_status == PaymentStatus.PAID
    ).scalar() or 0.0

    return UserAdminInfo(
        **user.__dict__,
        total_events_created=total_events,
        total_registrations=total_registrations,
        total_revenue_generated=total_revenue
    )


@router.post("/users/{user_id}/suspend")
def suspend_user(
    user_id: int,
    request: SuspendUserRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    **[ADMIN ONLY]** Suspendre un utilisateur

    Quand un utilisateur est suspendu :
    - Il ne peut plus se connecter
    - Ses événements restent visibles mais ne peuvent plus recevoir d'inscriptions
    - Message de suspension affiché lors de la tentative de connexion
    """

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur non trouvé"
        )

    if user.role == UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Impossible de suspendre un administrateur"
        )

    if user.is_suspended:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cet utilisateur est déjà suspendu"
        )

    # Suspendre
    user.is_suspended = True
    user.suspension_reason = request.reason
    user.suspended_at = datetime.utcnow()
    user.suspended_by_admin_id = current_admin.id

    db.commit()

    return {
        "message": "Utilisateur suspendu avec succès",
        "user_id": user_id,
        "reason": request.reason
    }


@router.post("/users/{user_id}/unsuspend")
def unsuspend_user(
    user_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    **[ADMIN ONLY]** Réactiver un utilisateur suspendu
    """

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur non trouvé"
        )

    if not user.is_suspended:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cet utilisateur n'est pas suspendu"
        )

    # Réactiver
    user.is_suspended = False
    user.suspension_reason = None
    user.suspended_at = None
    user.suspended_by_admin_id = None

    db.commit()

    return {
        "message": "Utilisateur réactivé avec succès",
        "user_id": user_id
    }


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    **[ADMIN ONLY]** Supprimer définitivement un utilisateur

    ⚠️ DANGER : Cette action est IRRÉVERSIBLE !

    Conséquences :
    - Tous ses événements seront supprimés (CASCADE)
    - Toutes ses inscriptions seront supprimées
    - Données personnelles effacées définitivement
    """

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur non trouvé"
        )

    if user.role == UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Impossible de supprimer un administrateur"
        )

    if user.id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous ne pouvez pas vous supprimer vous-même"
        )

    # Supprimer
    db.delete(user)
    db.commit()

    return {
        "message": "Utilisateur supprimé définitivement",
        "user_id": user_id
    }


@router.post("/users/{user_id}/promote")
def promote_user(
    user_id: int,
    request: PromoteUserRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    **[ADMIN ONLY]** Changer le rôle d'un utilisateur

    Cas d'usage :
    - Promouvoir un participant en organisateur
    - Promouvoir un organisateur en admin
    - Rétrograder un organisateur en participant
    """

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur non trouvé"
        )

    old_role = user.role
    user.role = request.new_role

    db.commit()

    return {
        "message": f"Rôle modifié : {old_role.value} → {request.new_role.value}",
        "user_id": user_id,
        "old_role": old_role.value,
        "new_role": request.new_role.value
    }


# ═══════════════════════════════════════════════════════════════
# SECTION 2 : GESTION DES ÉVÉNEMENTS
# ═══════════════════════════════════════════════════════════════

@router.get("/events", response_model=List[EventAdminInfo])
def get_all_events(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status: Optional[str] = None,
    is_featured: Optional[bool] = None,
    is_flagged: Optional[bool] = None,
    search: Optional[str] = None,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    **[ADMIN ONLY]** Voir TOUS les événements de la plateforme

    Contrairement aux organisateurs, l'admin voit TOUS les événements,
    même ceux des autres utilisateurs.

    Filtres :
    - status : Filtrer par statut (draft, published, cancelled)
    - is_featured : Événements mis en avant
    - is_flagged : Événements signalés
    - search : Rechercher par titre
    """

    query = db.query(Event)

    # Filtres
    if status:
        query = query.filter(Event.status == status)

    if is_featured is not None:
        query = query.filter(Event.is_featured == is_featured)

    if is_flagged is not None:
        query = query.filter(Event.is_flagged == is_flagged)

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(Event.title.ilike(search_pattern))

    # Pagination
    events = query.order_by(desc(Event.created_at)).offset(skip).limit(limit).all()

    # Ajouter les stats
    result = []
    for event in events:
        # Stats
        total_regs = db.query(func.count(Registration.id)).filter(
            Registration.event_id == event.id
        ).scalar() or 0

        total_revenue = db.query(func.sum(Registration.amount_paid)).filter(
            Registration.event_id == event.id,
            Registration.payment_status == PaymentStatus.PAID
        ).scalar() or 0.0

        # Organisateur
        organizer = db.query(User).filter(User.id == event.organizer_id).first()

        result.append(EventAdminInfo(
            **event.__dict__,
            organizer_name=f"{organizer.first_name} {organizer.last_name}",
            organizer_email=organizer.email,
            total_registrations=total_regs,
            total_revenue=total_revenue
        ))

    return result


@router.get("/events/{event_id}", response_model=EventAdminInfo)
def get_event_by_id(
    event_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    **[ADMIN ONLY]** Récupérer les détails complets d'un événement

    Retourne toutes les informations sur un événement spécifique,
    incluant les stats, l'organisateur, et les notes admin.
    """

    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Événement non trouvé"
        )

    # Récupérer l'organisateur
    organizer = db.query(User).filter(User.id == event.organizer_id).first()

    # Calculer les stats
    total_registrations = db.query(Registration).filter(
        Registration.event_id == event.id
    ).count()

    total_revenue = db.query(func.sum(Registration.amount_paid)).filter(
        Registration.event_id == event.id,
        Registration.payment_status == PaymentStatus.PAID
    ).scalar() or 0.0

    # Construire la réponse
    result = EventAdminInfo(
        id=event.id,
        title=event.title,
        description=event.description,
        event_format=event.event_format,
        status=event.status,
        start_date=event.start_date,
        end_date=event.end_date,
        location=event.location,
        city=event.city,
        country_code=event.country_code,
        is_free=event.is_free,
        price=event.price,
        currency=event.currency,
        capacity=event.capacity,
        available_seats=event.available_seats,
        is_featured=event.is_featured,
        is_flagged=event.is_flagged,
        flag_reason=event.flag_reason,
        admin_notes=event.admin_notes,
        created_at=event.created_at,
        organizer_id=event.organizer_id,
        organizer_name=f"{organizer.first_name or ''} {organizer.last_name or ''}".strip() or organizer.email,
        organizer_email=organizer.email,
        total_registrations=total_registrations,
        total_revenue=float(total_revenue)
    )

    return result


@router.post("/events/{event_id}/feature")
def feature_event(
    event_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    **[ADMIN ONLY]** Mettre un événement en avant

    Les événements mis en avant apparaissent en haut de la liste
    sur le frontend avec un badge "Featured" / "À la une"
    """

    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Événement non trouvé"
        )

    event.is_featured = True
    db.commit()

    return {"message": "Événement mis en avant", "event_id": event_id}


@router.post("/events/{event_id}/unfeature")
def unfeature_event(
    event_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    **[ADMIN ONLY]** Retirer la mise en avant d'un événement
    """

    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Événement non trouvé"
        )

    event.is_featured = False
    db.commit()

    return {"message": "Événement retiré de la une", "event_id": event_id}


@router.post("/events/{event_id}/flag")
def flag_event(
    event_id: int,
    request: FlagEventRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    **[ADMIN ONLY]** Signaler un événement comme suspect

    Cas d'usage :
    - Contenu inapproprié
    - Fraude suspectée
    - Prix anormalement élevés
    - Violation des CGU
    """

    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Événement non trouvé"
        )

    event.is_flagged = True
    event.flag_reason = request.reason
    event.flagged_at = datetime.utcnow()
    event.flagged_by_admin_id = current_admin.id

    db.commit()

    return {
        "message": "Événement signalé",
        "event_id": event_id,
        "reason": request.reason
    }


@router.post("/events/{event_id}/unflag")
def unflag_event(
    event_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    **[ADMIN ONLY]** Retirer le signalement d'un événement
    """

    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Événement non trouvé"
        )

    event.is_flagged = False
    event.flag_reason = None
    event.flagged_at = None
    event.flagged_by_admin_id = None

    db.commit()

    return {"message": "Signalement retiré", "event_id": event_id}


@router.delete("/events/{event_id}")
def delete_event(
    event_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    **[ADMIN ONLY]** Supprimer définitivement un événement

    ⚠️ Cette action supprime :
    - L'événement
    - Toutes les inscriptions associées
    - Tous les QR codes
    """

    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Événement non trouvé"
        )

    db.delete(event)
    db.commit()

    return {
        "message": "Événement supprimé définitivement",
        "event_id": event_id
    }


@router.put("/events/{event_id}/notes")
def update_admin_notes(
    event_id: int,
    request: UpdateAdminNotesRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    **[ADMIN ONLY]** Ajouter/Modifier les notes internes sur un événement

    Ces notes ne sont visibles que par les admins.
    Utile pour garder trace des actions de modération.
    """

    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Événement non trouvé"
        )

    event.admin_notes = request.notes
    db.commit()

    return {
        "message": "Notes admin mises à jour",
        "event_id": event_id
    }


# ═══════════════════════════════════════════════════════════════
# SECTION 3 : STATISTIQUES GLOBALES
# ═══════════════════════════════════════════════════════════════

@router.get("/stats", response_model=PlatformStats)
def get_platform_stats(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    **[ADMIN ONLY]** Statistiques globales de la plateforme

    Dashboard complet avec tous les KPIs importants.
    """

    # Date de début du mois
    now = datetime.utcnow()
    start_of_month = datetime(now.year, now.month, 1)

    # UTILISATEURS
    total_users = db.query(func.count(User.id)).scalar() or 0
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0
    suspended_users = db.query(func.count(User.id)).filter(User.is_suspended == True).scalar() or 0
    admin_users = db.query(func.count(User.id)).filter(User.role == UserRole.ADMIN).scalar() or 0
    organizer_users = db.query(func.count(User.id)).filter(User.role == UserRole.ORGANIZER).scalar() or 0
    participant_users = db.query(func.count(User.id)).filter(User.role == UserRole.PARTICIPANT).scalar() or 0
    new_users_this_month = db.query(func.count(User.id)).filter(User.created_at >= start_of_month).scalar() or 0

    # ÉVÉNEMENTS
    total_events = db.query(func.count(Event.id)).scalar() or 0
    published_events = db.query(func.count(Event.id)).filter(Event.status == EventStatus.PUBLISHED).scalar() or 0
    draft_events = db.query(func.count(Event.id)).filter(Event.status == EventStatus.DRAFT).scalar() or 0
    cancelled_events = db.query(func.count(Event.id)).filter(Event.status == EventStatus.CANCELLED).scalar() or 0
    featured_events = db.query(func.count(Event.id)).filter(Event.is_featured == True).scalar() or 0
    flagged_events = db.query(func.count(Event.id)).filter(Event.is_flagged == True).scalar() or 0
    new_events_this_month = db.query(func.count(Event.id)).filter(Event.created_at >= start_of_month).scalar() or 0

    # INSCRIPTIONS
    total_registrations = db.query(func.count(Registration.id)).scalar() or 0
    confirmed_registrations = db.query(func.count(Registration.id)).filter(
        Registration.status == RegistrationStatus.CONFIRMED
    ).scalar() or 0
    pending_registrations = db.query(func.count(Registration.id)).filter(
        Registration.status == RegistrationStatus.PENDING
    ).scalar() or 0
    cancelled_registrations = db.query(func.count(Registration.id)).filter(
        Registration.status == RegistrationStatus.CANCELLED
    ).scalar() or 0
    new_registrations_this_month = db.query(func.count(Registration.id)).filter(
        Registration.created_at >= start_of_month
    ).scalar() or 0

    # FINANCIER
    total_revenue = db.query(func.sum(Registration.amount_paid)).filter(
        Registration.payment_status == PaymentStatus.PAID
    ).scalar() or 0.0

    revenue_this_month = db.query(func.sum(Registration.amount_paid)).filter(
        Registration.payment_status == PaymentStatus.PAID,
        Registration.created_at >= start_of_month
    ).scalar() or 0.0

    total_paid_registrations = db.query(func.count(Registration.id)).filter(
        Registration.payment_status == PaymentStatus.PAID
    ).scalar() or 0

    average_ticket_price = (total_revenue / total_paid_registrations) if total_paid_registrations > 0 else 0.0

    # COMMISSIONS
    # Calculer le total des commissions prélevées depuis le début
    commission_revenue = db.query(func.sum(CommissionTransaction.commission_amount)).scalar() or 0.0

    return PlatformStats(
        total_users=total_users,
        active_users=active_users,
        suspended_users=suspended_users,
        admin_users=admin_users,
        organizer_users=organizer_users,
        participant_users=participant_users,
        new_users_this_month=new_users_this_month,
        total_events=total_events,
        published_events=published_events,
        draft_events=draft_events,
        cancelled_events=cancelled_events,
        featured_events=featured_events,
        flagged_events=flagged_events,
        new_events_this_month=new_events_this_month,
        total_registrations=total_registrations,
        confirmed_registrations=confirmed_registrations,
        pending_registrations=pending_registrations,
        cancelled_registrations=cancelled_registrations,
        new_registrations_this_month=new_registrations_this_month,
        total_revenue=total_revenue,
        revenue_this_month=revenue_this_month,
        total_paid_registrations=total_paid_registrations,
        average_ticket_price=round(average_ticket_price, 2),
        commission_revenue=round(commission_revenue, 2)
    )


@router.get("/stats/top-organizers", response_model=List[TopOrganizer])
def get_top_organizers(
    limit: int = Query(10, ge=1, le=100),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    **[ADMIN ONLY]** Top organisateurs par revenus générés
    """

    # Query complexe : grouper par organisateur
    results = db.query(
        User.id,
        User.first_name,
        User.last_name,
        User.email,
        func.count(Event.id).label('total_events'),
        func.count(Registration.id).label('total_registrations'),
        func.sum(Registration.amount_paid).label('total_revenue')
    ).join(Event, Event.organizer_id == User.id)\
     .outerjoin(Registration, Registration.event_id == Event.id)\
     .filter(Registration.payment_status == PaymentStatus.PAID)\
     .group_by(User.id)\
     .order_by(desc('total_revenue'))\
     .limit(limit)\
     .all()

    return [
        TopOrganizer(
            id=r.id,
            name=f"{r.first_name} {r.last_name}",
            email=r.email,
            total_events=r.total_events or 0,
            total_registrations=r.total_registrations or 0,
            total_revenue=r.total_revenue or 0.0
        )
        for r in results
    ]


@router.get("/stats/top-events", response_model=List[TopEvent])
def get_top_events(
    limit: int = Query(10, ge=1, le=100),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    **[ADMIN ONLY]** Événements les plus populaires par nombre d'inscriptions
    """

    results = db.query(
        Event.id,
        Event.title,
        User.first_name,
        User.last_name,
        func.count(Registration.id).label('total_registrations'),
        func.sum(Registration.amount_paid).label('total_revenue')
    ).join(User, Event.organizer_id == User.id)\
     .outerjoin(Registration, Registration.event_id == Event.id)\
     .group_by(Event.id, User.id)\
     .order_by(desc('total_registrations'))\
     .limit(limit)\
     .all()

    return [
        TopEvent(
            id=r.id,
            title=r.title,
            organizer_name=f"{r.first_name} {r.last_name}",
            total_registrations=r.total_registrations or 0,
            total_revenue=r.total_revenue or 0.0
        )
        for r in results
    ]


@router.get("/dashboard-stats", response_model=DashboardStats)
def get_dashboard_stats(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    **[ADMIN ONLY]** KPIs synthétiques pour le Dashboard SuperAdmin

    Retourne uniquement les valeurs utilisées sur la page Dashboard.
    """

    now = datetime.utcnow()
    start_of_month = datetime(now.year, now.month, 1)
    # Mois précédent
    prev_month_end = start_of_month - timedelta(days=1)
    start_of_prev_month = datetime(prev_month_end.year, prev_month_end.month, 1)

    total_users = db.query(func.count(User.id)).scalar() or 0

    # "Événements Actifs" = événements publiés
    active_events = db.query(func.count(Event.id)).filter(Event.status == EventStatus.PUBLISHED).scalar() or 0

    total_revenue = db.query(func.sum(Registration.amount_paid)).filter(
        Registration.payment_status == PaymentStatus.PAID
    ).scalar() or 0.0

    revenue_this_month = db.query(func.sum(Registration.amount_paid)).filter(
        Registration.payment_status == PaymentStatus.PAID,
        Registration.created_at >= start_of_month
    ).scalar() or 0.0

    revenue_prev_month = db.query(func.sum(Registration.amount_paid)).filter(
        Registration.payment_status == PaymentStatus.PAID,
        Registration.created_at >= start_of_prev_month,
        Registration.created_at < start_of_month
    ).scalar() or 0.0

    growth_rate = 0.0
    if revenue_prev_month and revenue_prev_month > 0:
        growth_rate = ((revenue_this_month - revenue_prev_month) / revenue_prev_month) * 100

    commission_revenue = db.query(func.sum(CommissionTransaction.commission_amount)).scalar() or 0.0

    total_registrations = db.query(func.count(Registration.id)).scalar() or 0

    pending_payouts = db.query(func.count(Payout.id)).filter(
        Payout.status == PayoutStatus.PENDING
    ).scalar() or 0

    active_categories = db.query(func.count(Category.id)).filter(Category.is_active == True).scalar() or 0

    return DashboardStats(
        total_users=total_users,
        active_events=active_events,
        total_revenue=float(total_revenue),
        commission_revenue=float(commission_revenue),
        total_registrations=total_registrations,
        pending_payouts=pending_payouts,
        active_categories=active_categories,
        growth_rate=round(float(growth_rate), 2)
    )
