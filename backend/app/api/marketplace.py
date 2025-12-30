"""
Routes Marketplace - Système de commission et payout

🎯 FONCTIONNALITÉS :
1. Catégories & Tags (Admin only)
2. Configuration commission (Admin only)
3. Demandes de payout (Organizers)
4. Gestion payouts (Admin)
5. Statistiques revenus (Admin + Organizers)
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field

from app.config.database import get_db
from app.models.user import User
from app.models.category import Category
from app.models.tag import Tag
from app.models.commission import CommissionSettings, CommissionTransaction
from app.models.payout import Payout, PayoutStatus
from app.models.event import Event, EventStatus
from app.models.registration import Registration, PaymentStatus
from app.models.ticket import Ticket
from app.api.deps import get_current_admin, get_current_user
from slugify import slugify
from app.utils.encryption import encrypt_data, decrypt_data


router = APIRouter()


# ═══════════════════════════════════════════════════════════════
# SCHEMAS
# ═══════════════════════════════════════════════════════════════

class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    custom_commission_rate: Optional[int] = Field(None, ge=0, le=100)

class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None
    custom_commission_rate: Optional[int] = Field(None, ge=0, le=100)

class CategoryResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: str | None
    icon: str | None
    color: str | None
    is_active: bool
    display_order: int
    custom_commission_rate: int | None
    total_events: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class TagCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    color: Optional[str] = None

class TagUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=50)
    color: Optional[str] = None
    is_active: Optional[bool] = None

class TagResponse(BaseModel):
    id: int
    name: str
    slug: str
    color: str | None
    is_active: bool
    total_events: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class CommissionSettingsUpdate(BaseModel):
    default_commission_rate: Optional[float] = Field(None, ge=0, le=100)
    minimum_commission_amount: Optional[float] = Field(None, ge=0)
    is_active: Optional[bool] = None
    notes: Optional[str] = None

class CommissionSettingsResponse(BaseModel):
    id: int
    default_commission_rate: float
    minimum_commission_amount: float
    is_active: bool
    notes: str | None
    updated_at: datetime

    class Config:
        from_attributes = True


class PayoutRequest(BaseModel):
    amount: float = Field(..., gt=0)
    payout_method: str = Field(..., min_length=2)
    account_details: Optional[str] = None
    message: Optional[str] = None

class PayoutAdminAction(BaseModel):
    status: PayoutStatus
    admin_notes: Optional[str] = None
    stripe_payout_id: Optional[str] = None

class PayoutResponse(BaseModel):
    id: int
    organizer_id: int
    amount: float
    currency: str
    status: str
    payout_method: str
    organizer_message: str | None
    admin_notes: str | None
    requested_at: datetime
    approved_at: datetime | None
    completed_at: datetime | None
    rejected_at: datetime | None

    class Config:
        from_attributes = True


class PayoutAdminResponse(BaseModel):
    """Response avec account_details déchiffrés (ADMIN ONLY)"""
    id: int
    organizer_id: int
    organizer_name: str  # Nom de l'organisateur
    organizer_email: str  # Email de l'organisateur
    amount: float
    currency: str
    status: str
    payout_method: str
    account_details: str | None  # 🔓 DÉCHIFFRÉ pour l'admin
    organizer_message: str | None
    admin_notes: str | None
    requested_at: datetime
    approved_at: datetime | None
    completed_at: datetime | None
    rejected_at: datetime | None

    class Config:
        from_attributes = True


class OrganizerBalance(BaseModel):
    """Solde disponible d'un organisateur"""
    total_revenue: float
    total_commissions: float
    total_payouts: float
    pending_payouts: float
    available_balance: float
    currency: str


# ═══════════════════════════════════════════════════════════════
# SECTION 0 : ÉVÉNEMENTS PUBLICS
# ═══════════════════════════════════════════════════════════════

class EventPublicResponse(BaseModel):
    """Response pour les événements publics"""
    id: int
    title: str
    description: Optional[str]
    full_description: Optional[str]
    event_type: str
    event_format: str
    start_date: datetime
    end_date: Optional[datetime]
    location: Optional[str]
    address: Optional[str]
    city: Optional[str]
    country_code: Optional[str]
    capacity: Optional[int]
    available_seats: Optional[int]
    is_free: bool
    price: Optional[float]
    currency: Optional[str]
    image_url: Optional[str]
    status: str
    is_featured: bool
    category_id: Optional[int]
    category: Optional[CategoryResponse]
    created_at: datetime

    class Config:
        from_attributes = True


class EventDetailPublicResponse(BaseModel):
    """Response détaillée pour un événement public avec tickets"""
    id: int
    title: str
    description: Optional[str]
    full_description: Optional[str]
    event_type: str
    event_format: str
    start_date: datetime
    end_date: Optional[datetime]
    location: Optional[str]
    address: Optional[str]
    city: Optional[str]
    country_code: Optional[str]
    capacity: Optional[int]
    available_seats: Optional[int]
    is_free: bool
    price: Optional[float]
    currency: Optional[str]
    image_url: Optional[str]
    virtual_platform: Optional[str]
    virtual_meeting_url: Optional[str]
    virtual_instructions: Optional[str]
    status: str
    is_featured: bool
    category_id: Optional[int]
    category: Optional[CategoryResponse]
    tickets: List[dict] = []
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/events", response_model=List[EventPublicResponse])
def get_public_events(
    category_id: Optional[int] = None,
    is_free: Optional[bool] = None,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """
    **[PUBLIC]** Liste des événements publics (publiés)

    Filtres :
    - category_id : Filtrer par catégorie
    - is_free : True = gratuits, False = payants
    - search : Recherche par titre ou description
    """

    query = db.query(Event).filter(
        Event.status == EventStatus.PUBLISHED,
        Event.is_published == True
    )

    if category_id:
        query = query.filter(Event.category_id == category_id)

    if is_free is not None:
        query = query.filter(Event.is_free == is_free)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Event.title.ilike(search_term)) |
            (Event.description.ilike(search_term))
        )

    events = query.order_by(desc(Event.is_featured), desc(Event.created_at)).offset(skip).limit(limit).all()

    result = []
    for event in events:
        category_data = None
        if event.category:
            category_data = CategoryResponse(
                **event.category.__dict__,
                total_events=0
            )

        # Construire manuellement pour éviter le conflit avec category
        event_dict = {
            "id": event.id,
            "title": event.title,
            "description": event.description,
            "full_description": event.full_description,
            "event_type": event.event_type,
            "event_format": event.event_format,
            "start_date": event.start_date,
            "end_date": event.end_date,
            "location": event.location,
            "address": event.address,
            "city": event.city,
            "country_code": event.country_code,
            "capacity": event.capacity,
            "available_seats": event.available_seats,
            "is_free": event.is_free,
            "price": event.price,
            "currency": event.currency,
            "image_url": event.image_url,
            "status": event.status,
            "is_featured": event.is_featured,
            "category_id": event.category_id,
            "category": category_data,
            "created_at": event.created_at
        }

        result.append(EventPublicResponse(**event_dict))

    return result


@router.get("/events/{event_id}", response_model=EventDetailPublicResponse)
def get_public_event_detail(
    event_id: int,
    db: Session = Depends(get_db)
):
    """
    **[PUBLIC]** Détails d'un événement public avec tickets
    """

    event = db.query(Event).filter(
        Event.id == event_id,
        Event.status == EventStatus.PUBLISHED,
        Event.is_published == True
    ).first()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Événement non trouvé"
        )

    # Récupérer les tickets
    tickets = db.query(Ticket).filter(Ticket.event_id == event_id).all()
    tickets_data = [{
        "id": t.id,
        "name": t.name,
        "description": t.description,
        "price": t.price,
        "currency": t.currency,
        "quantity_available": t.quantity_available,
        "quantity_sold": t.quantity_sold,
        "is_active": t.is_active
    } for t in tickets]

    # Catégorie
    category_data = None
    if event.category:
        category_data = CategoryResponse(
            **event.category.__dict__,
            total_events=0
        )

    # Construire manuellement pour éviter le conflit avec category
    event_dict = {
        "id": event.id,
        "title": event.title,
        "description": event.description,
        "full_description": event.full_description,
        "event_type": event.event_type,
        "event_format": event.event_format,
        "start_date": event.start_date,
        "end_date": event.end_date,
        "location": event.location,
        "address": event.address,
        "city": event.city,
        "country_code": event.country_code,
        "capacity": event.capacity,
        "available_seats": event.available_seats,
        "is_free": event.is_free,
        "price": event.price,
        "currency": event.currency,
        "image_url": event.image_url,
        "virtual_platform": event.virtual_platform,
        "virtual_meeting_url": event.virtual_meeting_url,
        "virtual_instructions": event.virtual_instructions,
        "status": event.status,
        "is_featured": event.is_featured,
        "category_id": event.category_id,
        "category": category_data,
        "tickets": tickets_data,
        "created_at": event.created_at
    }

    return EventDetailPublicResponse(**event_dict)


# ═══════════════════════════════════════════════════════════════
# SECTION 1 : CATÉGORIES (Admin Only)
# ═══════════════════════════════════════════════════════════════

@router.get("/categories", response_model=List[CategoryResponse])
def get_categories(
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """
    **[PUBLIC]** Liste des catégories

    Accessible à tous (pas besoin d'être admin).
    Les organisateurs ont besoin de voir les catégories pour créer un événement.
    """

    query = db.query(Category)

    if is_active is not None:
        query = query.filter(Category.is_active == is_active)

    categories = query.order_by(Category.display_order, Category.name).all()

    # Ajouter le compte d'événements
    result = []
    for cat in categories:
        total_events = db.query(func.count(Event.id)).filter(Event.category_id == cat.id).scalar() or 0
        result.append(CategoryResponse(
            **cat.__dict__,
            total_events=total_events
        ))

    return result


@router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    category_data: CategoryCreate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    **[ADMIN ONLY]** Créer une catégorie
    """

    # Générer le slug
    slug = slugify(category_data.name)

    # Vérifier que le slug n'existe pas déjà
    existing = db.query(Category).filter(Category.slug == slug).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Une catégorie avec ce nom existe déjà"
        )

    # Créer
    category = Category(
        name=category_data.name,
        slug=slug,
        description=category_data.description,
        icon=category_data.icon,
        color=category_data.color,
        custom_commission_rate=category_data.custom_commission_rate
    )

    db.add(category)
    db.commit()
    db.refresh(category)

    return CategoryResponse(**category.__dict__, total_events=0)


@router.put("/categories/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: int,
    category_data: CategoryUpdate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    **[ADMIN ONLY]** Modifier une catégorie
    """

    category = db.query(Category).filter(Category.id == category_id).first()

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Catégorie non trouvée"
        )

    # Mettre à jour
    if category_data.name:
        category.name = category_data.name
        category.slug = slugify(category_data.name)
    if category_data.description is not None:
        category.description = category_data.description
    if category_data.icon is not None:
        category.icon = category_data.icon
    if category_data.color is not None:
        category.color = category_data.color
    if category_data.is_active is not None:
        category.is_active = category_data.is_active
    if category_data.display_order is not None:
        category.display_order = category_data.display_order
    if category_data.custom_commission_rate is not None:
        category.custom_commission_rate = category_data.custom_commission_rate

    db.commit()
    db.refresh(category)

    total_events = db.query(func.count(Event.id)).filter(Event.category_id == category.id).scalar() or 0

    return CategoryResponse(**category.__dict__, total_events=total_events)


@router.delete("/categories/{category_id}")
def delete_category(
    category_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    **[ADMIN ONLY]** Supprimer une catégorie

    Les événements de cette catégorie ne seront PAS supprimés,
    ils auront juste category_id = NULL.
    """

    category = db.query(Category).filter(Category.id == category_id).first()

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Catégorie non trouvée"
        )

    db.delete(category)
    db.commit()

    return {"message": "Catégorie supprimée", "category_id": category_id}


# ═══════════════════════════════════════════════════════════════
# SECTION 2 : TAGS (Admin Only)
# ═══════════════════════════════════════════════════════════════

@router.get("/tags", response_model=List[TagResponse])
def get_tags(
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """
    **[PUBLIC]** Liste des tags

    Accessible à tous.
    """

    query = db.query(Tag)

    if is_active is not None:
        query = query.filter(Tag.is_active == is_active)

    tags = query.order_by(Tag.name).all()

    # Compter événements
    result = []
    for tag in tags:
        total_events = len(tag.events)  # Relation many-to-many
        result.append(TagResponse(
            **tag.__dict__,
            total_events=total_events
        ))

    return result


@router.post("/tags", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
def create_tag(
    tag_data: TagCreate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    **[ADMIN ONLY]** Créer un tag
    """

    slug = slugify(tag_data.name)

    existing = db.query(Tag).filter(Tag.slug == slug).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un tag avec ce nom existe déjà"
        )

    tag = Tag(
        name=tag_data.name,
        slug=slug,
        color=tag_data.color
    )

    db.add(tag)
    db.commit()
    db.refresh(tag)

    return TagResponse(**tag.__dict__, total_events=0)


@router.put("/tags/{tag_id}", response_model=TagResponse)
def update_tag(
    tag_id: int,
    tag_data: TagUpdate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    **[ADMIN ONLY]** Modifier un tag
    """

    tag = db.query(Tag).filter(Tag.id == tag_id).first()

    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag non trouvé"
        )

    if tag_data.name:
        tag.name = tag_data.name
        tag.slug = slugify(tag_data.name)
    if tag_data.color is not None:
        tag.color = tag_data.color
    if tag_data.is_active is not None:
        tag.is_active = tag_data.is_active

    db.commit()
    db.refresh(tag)

    return TagResponse(**tag.__dict__, total_events=len(tag.events))


@router.delete("/tags/{tag_id}")
def delete_tag(
    tag_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    **[ADMIN ONLY]** Supprimer un tag
    """

    tag = db.query(Tag).filter(Tag.id == tag_id).first()

    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag non trouvé"
        )

    db.delete(tag)
    db.commit()

    return {"message": "Tag supprimé", "tag_id": tag_id}


# ═══════════════════════════════════════════════════════════════
# SECTION 3 : COMMISSION (Admin Only)
# ═══════════════════════════════════════════════════════════════

@router.get("/commission/settings", response_model=CommissionSettingsResponse)
def get_commission_settings(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    **[ADMIN ONLY]** Voir la configuration des commissions
    """

    settings = db.query(CommissionSettings).first()

    if not settings:
        # Créer les settings par défaut
        settings = CommissionSettings(
            id=1,
            default_commission_rate=5.0,
            minimum_commission_amount=0.0,
            is_active=True
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)

    return CommissionSettingsResponse(**settings.__dict__)


@router.put("/commission/settings", response_model=CommissionSettingsResponse)
def update_commission_settings(
    settings_data: CommissionSettingsUpdate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    **[ADMIN ONLY]** Modifier la configuration des commissions

    Exemple :
    - default_commission_rate: 5.0 = 5%
    - minimum_commission_amount: 1.0 = minimum 1 dollar/euro
    """

    settings = db.query(CommissionSettings).first()

    if not settings:
        settings = CommissionSettings(id=1)
        db.add(settings)

    # Mettre à jour
    if settings_data.default_commission_rate is not None:
        settings.default_commission_rate = settings_data.default_commission_rate
    if settings_data.minimum_commission_amount is not None:
        settings.minimum_commission_amount = settings_data.minimum_commission_amount
    if settings_data.is_active is not None:
        settings.is_active = settings_data.is_active
    if settings_data.notes is not None:
        settings.notes = settings_data.notes

    db.commit()
    db.refresh(settings)

    return CommissionSettingsResponse(**settings.__dict__)


@router.get("/commission/transactions")
def get_commission_transactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    organizer_id: Optional[int] = None,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    **[ADMIN ONLY]** Historique des commissions prélevées
    """

    query = db.query(CommissionTransaction)

    if organizer_id:
        query = query.filter(CommissionTransaction.organizer_id == organizer_id)

    transactions = query.order_by(desc(CommissionTransaction.created_at)).offset(skip).limit(limit).all()

    return transactions


# ═══════════════════════════════════════════════════════════════
# SECTION 4 : PAYOUTS - Organisateur
# ═══════════════════════════════════════════════════════════════

@router.get("/my-balance", response_model=OrganizerBalance)
def get_my_balance(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    **[ORGANIZER]** Voir mon solde disponible

    Calcul :
    - Total revenus = Somme de tous les paiements confirmés de mes événements
    - Total commissions = Somme des commissions prélevées
    - Total payouts = Somme des payouts effectués
    - Disponible = (Total revenus - Total commissions) - Total payouts
    """

    # Revenus totaux (tous les paiements confirmés)
    total_revenue = db.query(func.sum(Registration.amount_paid)).join(Event).filter(
        Event.organizer_id == current_user.id,
        Registration.payment_status == PaymentStatus.PAID
    ).scalar() or 0.0

    # Commissions prélevées
    total_commissions = db.query(func.sum(CommissionTransaction.commission_amount)).filter(
        CommissionTransaction.organizer_id == current_user.id
    ).scalar() or 0.0

    # Payouts effectués (completed)
    total_payouts = db.query(func.sum(Payout.amount)).filter(
        Payout.organizer_id == current_user.id,
        Payout.status == PayoutStatus.COMPLETED
    ).scalar() or 0.0

    # Payouts en attente
    pending_payouts = db.query(func.sum(Payout.amount)).filter(
        Payout.organizer_id == current_user.id,
        Payout.status.in_([PayoutStatus.PENDING, PayoutStatus.APPROVED, PayoutStatus.PROCESSING])
    ).scalar() or 0.0

    # Disponible
    available_balance = (total_revenue - total_commissions) - total_payouts - pending_payouts

    # Devise (prendre la première trouvée)
    currency = db.query(Registration.currency).join(Event).filter(
        Event.organizer_id == current_user.id
    ).first()
    currency_code = currency[0] if currency else "USD"

    return OrganizerBalance(
        total_revenue=round(total_revenue, 2),
        total_commissions=round(total_commissions, 2),
        total_payouts=round(total_payouts, 2),
        pending_payouts=round(pending_payouts, 2),
        available_balance=round(available_balance, 2),
        currency=currency_code
    )


@router.post("/payouts/request", response_model=PayoutResponse, status_code=status.HTTP_201_CREATED)
def request_payout(
    payout_data: PayoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    **[ORGANIZER]** Demander un payout (retrait)

    L'organisateur peut demander un retrait de ses revenus disponibles.
    La demande sera examinée par l'admin.
    """

    # Vérifier le solde disponible
    balance = get_my_balance(current_user, db)

    if payout_data.amount > balance.available_balance:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Solde insuffisant. Disponible: {balance.available_balance} {balance.currency}"
        )

    # Chiffrer les informations bancaires AVANT de les sauvegarder
    encrypted_account_details = None
    if payout_data.account_details:
        encrypted_account_details = encrypt_data(payout_data.account_details)

    # Créer la demande
    payout = Payout(
        organizer_id=current_user.id,
        amount=payout_data.amount,
        currency="USD",
        status=PayoutStatus.PENDING,
        payout_method=payout_data.payout_method,
        account_details=encrypted_account_details,  # 🔒 CHIFFRÉ
        organizer_message=payout_data.message
    )

    db.add(payout)
    db.commit()
    db.refresh(payout)

    return PayoutResponse(**payout.__dict__)


@router.get("/my-payouts", response_model=List[PayoutResponse])
def get_my_payouts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    **[ORGANIZER]** Voir l'historique de mes demandes de payout
    """

    payouts = db.query(Payout).filter(
        Payout.organizer_id == current_user.id
    ).order_by(desc(Payout.requested_at)).all()

    result = []
    for p in payouts:
        d = dict(p.__dict__)
        if d.get("currency") and str(d.get("currency")).upper() == "XOF":
            d["currency"] = "USD"
        result.append(PayoutResponse(**d))
    return result


# ═══════════════════════════════════════════════════════════════
# SECTION 5 : PAYOUTS - Admin
# ═══════════════════════════════════════════════════════════════

@router.get("/payouts", response_model=List[PayoutAdminResponse])
def get_all_payouts(
    status: Optional[PayoutStatus] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    **[ADMIN ONLY]** Voir toutes les demandes de payout

    Filtres :
    - status : Filtrer par statut (pending, approved, completed, rejected...)

    ⚠️ Cette route déchiffre les informations bancaires pour l'admin!
    """

    query = db.query(Payout).join(User, Payout.organizer_id == User.id)

    if status:
        query = query.filter(Payout.status == status)

    payouts = query.order_by(desc(Payout.requested_at)).offset(skip).limit(limit).all()

    # Déchiffrer les account_details pour l'admin
    result = []
    for payout in payouts:
        organizer = db.query(User).filter(User.id == payout.organizer_id).first()

        currency_code = payout.currency
        if currency_code and currency_code.upper() == "XOF":
            currency_code = "USD"

        # Déchiffrer les informations bancaires 🔓
        decrypted_account_details = None
        if payout.account_details:
            try:
                decrypted_account_details = decrypt_data(payout.account_details)
            except Exception as e:
                # Si déchiffrement échoue, on met un message d'erreur
                decrypted_account_details = f"[Erreur déchiffrement: {str(e)}]"

        result.append(PayoutAdminResponse(
            id=payout.id,
            organizer_id=payout.organizer_id,
            organizer_name=f"{organizer.first_name} {organizer.last_name}",
            organizer_email=organizer.email,
            amount=payout.amount,
            currency=currency_code,
            status=payout.status.value,
            payout_method=payout.payout_method,
            account_details=decrypted_account_details,  # 🔓 DÉCHIFFRÉ
            organizer_message=payout.organizer_message,
            admin_notes=payout.admin_notes,
            requested_at=payout.requested_at,
            approved_at=payout.approved_at,
            completed_at=payout.completed_at,
            rejected_at=payout.rejected_at
        ))

    return result


@router.put("/payouts/{payout_id}", response_model=PayoutResponse)
def process_payout(
    payout_id: int,
    action_data: PayoutAdminAction,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    **[ADMIN ONLY]** Traiter une demande de payout

    Actions possibles :
    - APPROVED : Approuver la demande
    - COMPLETED : Marquer comme effectué (après transfert Stripe)
    - REJECTED : Rejeter la demande
    """

    payout = db.query(Payout).filter(Payout.id == payout_id).first()

    if not payout:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payout non trouvé"
        )

    # Mettre à jour
    payout.status = action_data.status
    payout.admin_notes = action_data.admin_notes
    payout.processed_by_admin_id = current_admin.id

    if action_data.stripe_payout_id:
        payout.stripe_payout_id = action_data.stripe_payout_id

    # Dates
    now = datetime.utcnow()
    if action_data.status == PayoutStatus.APPROVED:
        payout.approved_at = now
    elif action_data.status == PayoutStatus.COMPLETED:
        payout.completed_at = now
    elif action_data.status == PayoutStatus.REJECTED:
        payout.rejected_at = now

    db.commit()
    db.refresh(payout)

    return PayoutResponse(**payout.__dict__)

