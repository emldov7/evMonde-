"""
Routes Events - CRUD pour les événements
Ces routes permettent de créer, lire, modifier et supprimer des événements
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.config.database import get_db
from app.schemas.event import EventCreate, EventUpdate, EventResponse, EventList
from app.models.event import Event, EventStatus
from app.models.user import User, UserRole
from app.models.ticket import Ticket
from app.models.tag import Tag, event_tags
from app.models.event_reminder import EventReminder
from app.schemas.event_reminder import EventReminderCreate, EventReminderUpdate, EventReminderResponse, EventReminderWithEventResponse
from app.api.deps import get_current_user, get_current_organizer_or_admin
from typing import Optional
from datetime import datetime


# Créer un routeur FastAPI
router = APIRouter()


@router.get("/reminders/my", response_model=list[EventReminderWithEventResponse])
def list_my_reminders(
    include_sent: bool = False,
    current_user: User = Depends(get_current_organizer_or_admin),
    db: Session = Depends(get_db),
):
    q = (
        db.query(EventReminder, Event)
        .join(Event, Event.id == EventReminder.event_id)
        .filter(Event.organizer_id == current_user.id)
        .order_by(EventReminder.scheduled_at.asc())
    )

    if not include_sent:
        q = q.filter(EventReminder.sent == False)

    rows = q.all()
    result = []
    for reminder, event in rows:
        result.append({
            "id": reminder.id,
            "event_id": reminder.event_id,
            "event_title": event.title,
            "event_start_date": event.start_date,
            "scheduled_at": reminder.scheduled_at,
            "message": reminder.message,
            "sent": bool(reminder.sent),
            "sent_at": reminder.sent_at,
            "created_at": reminder.created_at,
        })
    return result


@router.get("/{event_id}/reminders", response_model=list[EventReminderResponse])
def list_event_reminders(
    event_id: int,
    current_user: User = Depends(get_current_organizer_or_admin),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Événement non trouvé")

    if current_user.role != UserRole.ADMIN and event.organizer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")

    reminders = (
        db.query(EventReminder)
        .filter(EventReminder.event_id == event_id)
        .order_by(EventReminder.scheduled_at.asc())
        .all()
    )
    return reminders


@router.post("/{event_id}/reminders", response_model=EventReminderResponse, status_code=status.HTTP_201_CREATED)
def create_event_reminder(
    event_id: int,
    payload: EventReminderCreate,
    current_user: User = Depends(get_current_organizer_or_admin),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Événement non trouvé")

    if current_user.role != UserRole.ADMIN and event.organizer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")

    scheduled_at = payload.scheduled_at
    if getattr(scheduled_at, "tzinfo", None) is not None:
        scheduled_at = scheduled_at.astimezone(None).replace(tzinfo=None)

    # Pas de validation de date - on peut créer des rappels pour n'importe quelle date

    existing = db.query(EventReminder).filter(
        EventReminder.event_id == event_id,
        EventReminder.scheduled_at == scheduled_at,
    ).first()
    if existing:
        return existing

    reminder = EventReminder(
        event_id=event_id,
        scheduled_at=scheduled_at,
        message=payload.message,
        sent=False,
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return reminder


@router.delete("/{event_id}/reminders/{reminder_id}", response_model=dict)
def delete_event_reminder(
    event_id: int,
    reminder_id: int,
    current_user: User = Depends(get_current_organizer_or_admin),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Événement non trouvé")

    if current_user.role != UserRole.ADMIN and event.organizer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")

    reminder = db.query(EventReminder).filter(
        EventReminder.id == reminder_id,
        EventReminder.event_id == event_id,
    ).first()
    if not reminder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rappel introuvable")

    db.delete(reminder)
    db.commit()
    return {"message": "OK"}


@router.put("/{event_id}/reminders/{reminder_id}", response_model=EventReminderResponse)
def update_event_reminder(
    event_id: int,
    reminder_id: int,
    payload: EventReminderUpdate,
    current_user: User = Depends(get_current_organizer_or_admin),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Événement non trouvé")

    if current_user.role != UserRole.ADMIN and event.organizer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")

    reminder = db.query(EventReminder).filter(
        EventReminder.id == reminder_id,
        EventReminder.event_id == event_id,
    ).first()
    if not reminder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rappel introuvable")

    scheduled_at = payload.scheduled_at
    if getattr(scheduled_at, "tzinfo", None) is not None:
        scheduled_at = scheduled_at.astimezone(None).replace(tzinfo=None)

    # Pas de validation de date - on peut modifier les rappels pour n'importe quelle date

    reminder.scheduled_at = scheduled_at
    reminder.message = payload.message
    db.commit()
    db.refresh(reminder)
    return reminder


# ROUTE 1 : Créer un événement (Organisateur ou Admin seulement)
@router.post("/", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
def create_event(
    event_data: EventCreate,
    current_user: User = Depends(get_current_organizer_or_admin),  # Vérifier le rôle
    db: Session = Depends(get_db)
):
    """
    Créer un nouvel événement

    **Authentification requise** : Organisateur ou Admin

    Le statut par défaut est DRAFT (brouillon).
    L'événement ne sera visible qu'après publication.

    Exemple de requête :
    ```json
    {
        "title": "Conférence Tech Lomé 2025",
        "description": "La plus grande conférence tech de l'Afrique de l'Ouest",
        "event_type": "conference",
        "start_date": "2025-12-15T09:00:00",
        "end_date": "2025-12-15T18:00:00",
        "location": "Palais des Congrès",
        "city": "Lomé",
        "country_code": "TG",
        "capacity": 500,
        "is_free": false,
        "price": 25000,
        "currency": "XOF"
    }
    ```
    """
    # DEBUG: Log des données reçues
    import json
    print("="*80)
    print("DONNÉES REÇUES POUR CRÉATION D'ÉVÉNEMENT:")
    print(json.dumps(event_data.model_dump(), indent=2, default=str))
    print("="*80)

    # ÉTAPE 1 : Calculer capacity depuis les tickets (si pas fournie)
    if event_data.tickets:
        calculated_capacity = sum(ticket.quantity_available for ticket in event_data.tickets)
    else:
        calculated_capacity = event_data.capacity or 0

    # Déterminer l'organisateur effectif
    organizer_id = current_user.id
    if event_data.organizer_id is not None:
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous n'êtes pas autorisé à créer un événement pour un autre organisateur"
            )

        organizer = db.query(User).filter(User.id == event_data.organizer_id).first()
        if not organizer or organizer.role != UserRole.ORGANIZER:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Organisateur invalide"
            )
        organizer_id = organizer.id

    # ÉTAPE 2 : Exclure les champs spéciaux (category_id, tag_ids, tickets, capacity, organizer_id)
    event_dict = event_data.model_dump(exclude={"category_id", "tag_ids", "tickets", "capacity", "organizer_id"})

    # ÉTAPE 3 : Créer l'événement
    new_event = Event(
        **event_dict,
        organizer_id=organizer_id,  # L'organisateur = utilisateur connecté ou sélectionné (ADMIN)
        capacity=calculated_capacity,  # Capacité calculée depuis tickets
        available_seats=calculated_capacity,  # Au départ, toutes les places sont disponibles
        status=EventStatus.DRAFT,  # Par défaut : brouillon
        is_published=False,  # Pas publié par défaut
        category_id=event_data.category_id  # Assigner la catégorie
    )

    # ÉTAPE 3 : Sauvegarder l'événement d'abord (pour avoir un ID)
    db.add(new_event)
    db.commit()
    db.refresh(new_event)

    # ÉTAPE 4 : Assigner les tags (Many-to-Many)
    if event_data.tag_ids:
        tags = db.query(Tag).filter(Tag.id.in_(event_data.tag_ids)).all()
        new_event.tags = tags
        db.commit()

    # ÉTAPE 5 : Créer les tickets
    if event_data.tickets:
        for ticket_data in event_data.tickets:
            ticket = Ticket(
                event_id=new_event.id,
                name=ticket_data.name,
                description=ticket_data.description,
                price=ticket_data.price,
                currency=ticket_data.currency,
                quantity_available=ticket_data.quantity_available,
                is_active=ticket_data.is_active
            )
            db.add(ticket)

        db.commit()
        db.refresh(new_event)  # Rafraîchir pour charger les tickets

    return new_event


# ROUTE 2 : Lister tous les événements publiés (Public)
@router.get("/", response_model=EventList)
def list_events(
    page: int = Query(1, ge=1, description="Numéro de page"),
    page_size: int = Query(10, ge=1, le=100, description="Nombre d'événements par page"),
    city: Optional[str] = Query(None, description="Filtrer par ville"),
    country_code: Optional[str] = Query(None, description="Filtrer par pays"),
    event_type: Optional[str] = Query(None, description="Filtrer par type"),
    is_free: Optional[bool] = Query(None, description="Filtrer les événements gratuits"),
    db: Session = Depends(get_db)
):
    """
    Lister tous les événements publiés

    **Pas d'authentification requise** (route publique)

    Retourne uniquement les événements avec status = PUBLISHED.
    Supporte la pagination et les filtres.

    Exemple :
    - GET /api/v1/events?page=1&page_size=10
    - GET /api/v1/events?city=Lomé&is_free=true
    - GET /api/v1/events?country_code=TG&event_type=conference
    """

    # ÉTAPE 1 : Construire la requête de base
    query = db.query(Event).filter(Event.status == EventStatus.PUBLISHED)

    # ÉTAPE 2 : Appliquer les filtres
    if city:
        query = query.filter(Event.city.ilike(f"%{city}%"))  # ilike = insensible à la casse

    if country_code:
        query = query.filter(Event.country_code == country_code.upper())

    if event_type:
        query = query.filter(Event.event_type == event_type)

    if is_free is not None:
        query = query.filter(Event.is_free == is_free)

    # ÉTAPE 3 : Compter le total
    total = query.count()

    # ÉTAPE 4 : Pagination
    skip = (page - 1) * page_size
    events = query.order_by(Event.start_date.asc()).offset(skip).limit(page_size).all()

    # ÉTAPE 5 : Retourner la liste paginée
    return EventList(
        total=total,
        page=page,
        page_size=page_size,
        events=events
    )


# ROUTE 3 : Voir un événement spécifique (Public)
@router.get("/{event_id}", response_model=EventResponse)
def get_event(
    event_id: int,
    db: Session = Depends(get_db)
):
    """
    Récupérer un événement par son ID

    **Pas d'authentification requise** (route publique)

    Retourne uniquement les événements publiés.

    Exemple :
    - GET /api/v1/events/1
    """

    # Chercher l'événement
    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Événement non trouvé"
        )

    # Vérifier que l'événement est publié
    if event.status != EventStatus.PUBLISHED:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Événement non disponible"
        )

    return event


# ROUTE 4c : Voir un événement pour édition (Organisateur propriétaire ou Admin)
@router.get("/admin/events/{event_id}", response_model=EventResponse)
def get_event_for_editing(
    event_id: int,
    current_user: User = Depends(get_current_organizer_or_admin),
    db: Session = Depends(get_db)
):
    """
    Récupérer un événement (même en DRAFT) pour l'éditer.

    - Si ORGANIZER : uniquement ses événements
    - Si ADMIN : tous les événements

    Retourne un EventResponse complet (incluant tickets et tags) pour pré-remplir le formulaire.
    """

    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Événement non trouvé"
        )

    if current_user.role != UserRole.ADMIN and event.organizer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Événement non trouvé ou vous n'êtes pas l'organisateur"
        )

    return event


# ROUTE 4 : Mes événements créés (Organisateur ou Admin seulement)
@router.get("/my/events")
def get_my_events(
    current_user: User = Depends(get_current_organizer_or_admin),
    db: Session = Depends(get_db)
):
    """
    Récupérer tous mes événements créés avec le comptage des inscriptions

    **Authentification requise** : Organisateur ou Admin

    Retourne tous les événements créés par l'utilisateur connecté,
    quel que soit leur statut (brouillon, publié, annulé, etc.)

    **NOUVEAU**: Inclut le nombre d'inscriptions CONFIRMÉES pour chaque événement

    Exemple :
    - GET /api/v1/events/my/events
    """

    from app.models.registration import Registration, RegistrationStatus, PaymentStatus
    from sqlalchemy import func

    events = db.query(Event).filter(Event.organizer_id == current_user.id).all()

    # Pour chaque événement, calculer le nombre d'inscriptions CONFIRMÉES
    result = []
    for event in events:
        # Compter les inscriptions CONFIRMÉES pour cet événement
        total_registrations = db.query(func.count(Registration.id)).filter(
            Registration.event_id == event.id,
            Registration.status == RegistrationStatus.CONFIRMED
        ).scalar() or 0

        # Calculer les revenus (paiements PAYÉS) pour cet événement
        total_revenue = db.query(func.sum(Registration.amount_paid)).filter(
            Registration.event_id == event.id,
            Registration.payment_status == PaymentStatus.PAID
        ).scalar() or 0.0

        # Convertir l'événement en dictionnaire et ajouter total_registrations
        event_dict = {
            **event.__dict__,
            "total_registrations": total_registrations,
            "total_revenue": float(total_revenue)
        }
        result.append(event_dict)

    return result


# ROUTE 4b : Voir UN de mes événements (Organisateur ou Admin seulement)
@router.get("/my/events/{event_id}", response_model=EventResponse)
def get_my_event(
    event_id: int,
    current_user: User = Depends(get_current_organizer_or_admin),
    db: Session = Depends(get_db)
):
    """
    Récupérer UN de mes événements par son ID

    **Authentification requise** : Organisateur ou Admin

    Permet de voir ses propres événements même en DRAFT.

    Exemple :
    - GET /api/v1/events/my/events/1
    """

    event = db.query(Event).filter(
        Event.id == event_id,
        Event.organizer_id == current_user.id
    ).first()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Événement non trouvé ou vous n'êtes pas l'organisateur"
        )

    return event


# ROUTE 5 : Modifier un événement (Créateur ou Admin seulement)
@router.put("/{event_id}", response_model=EventResponse)
def update_event(
    event_id: int,
    event_update: EventUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Modifier un événement

    **Authentification requise** : Créateur de l'événement ou Admin

    Seul le créateur de l'événement (ou un admin) peut le modifier.

    Exemple :
    ```json
    {
        "title": "Nouveau titre",
        "capacity": 600
    }
    ```
    """

    # ÉTAPE 1 : Chercher l'événement
    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Événement non trouvé"
        )

    # ÉTAPE 2 : Vérifier que l'utilisateur est le créateur ou un admin
    if event.organizer_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'êtes pas autorisé à modifier cet événement"
        )

    # ÉTAPE 3 : Mettre à jour les champs
    update_data = event_update.model_dump(exclude_unset=True)  # Seulement les champs fournis

    # Extraire tickets, tag_ids et category_id pour traitement spécial
    tickets_data = update_data.pop("tickets", None)
    tag_ids = update_data.pop("tag_ids", None)
    category_id = update_data.pop("category_id", None)

    # Ne jamais écraser des champs NOT NULL avec None
    if update_data.get("capacity") is None:
        update_data.pop("capacity", None)

    # Mettre à jour les champs simples
    for field, value in update_data.items():
        setattr(event, field, value)

    # Mettre à jour category_id si fourni
    if category_id is not None:
        event.category_id = category_id

    # Mettre à jour les tags si fournis
    if tag_ids is not None:
        # Supprimer les anciennes associations
        db.execute(event_tags.delete().where(event_tags.c.event_id == event.id))
        # Créer les nouvelles associations
        for tag_id in tag_ids:
            db.execute(event_tags.insert().values(event_id=event.id, tag_id=tag_id))

    # Mettre à jour les tickets si fournis
    if tickets_data is not None:
        # Supprimer tous les anciens tickets
        db.query(Ticket).filter(Ticket.event_id == event.id).delete()

        # Créer les nouveaux tickets
        for ticket_data in tickets_data:
            new_ticket = Ticket(
                event_id=event.id,
                name=ticket_data["name"],
                description=ticket_data.get("description"),
                price=ticket_data["price"],
                currency=ticket_data["currency"],
                quantity_available=ticket_data["quantity_available"],
                is_active=ticket_data.get("is_active", True)
            )
            db.add(new_ticket)

        # Recalculer la capacité depuis les tickets
        try:
            new_capacity = sum(int(t["quantity_available"]) for t in tickets_data)
            if new_capacity > 0:
                event.capacity = new_capacity
                event.available_seats = new_capacity
        except Exception:
            pass

    # Si la capacité change explicitement, recalculer les places disponibles
    if "capacity" in update_data and update_data.get("capacity") is not None:
        event.available_seats = event.capacity

    # ÉTAPE 4 : Sauvegarder
    db.commit()
    db.refresh(event)

    return event


# ROUTE 6 : Supprimer un événement (Créateur ou Admin seulement)
@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Supprimer un événement

    **Authentification requise** : Créateur de l'événement ou Admin

    Seul le créateur de l'événement (ou un admin) peut le supprimer.

    Exemple :
    - DELETE /api/v1/events/1
    """

    # ÉTAPE 1 : Chercher l'événement
    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Événement non trouvé"
        )

    # ÉTAPE 2 : Vérifier que l'utilisateur est le créateur ou un admin
    if event.organizer_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'êtes pas autorisé à supprimer cet événement"
        )

    # ÉTAPE 3 : Supprimer
    db.delete(event)
    db.commit()

    return None  # 204 No Content


# ROUTE 7 : Publier un événement (Créateur ou Admin seulement)
@router.post("/{event_id}/publish", response_model=EventResponse)
def publish_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Publier un événement (le rendre visible)

    **Authentification requise** : Créateur de l'événement ou Admin

    Change le statut de DRAFT à PUBLISHED.

    Exemple :
    - POST /api/v1/events/1/publish
    """

    # ÉTAPE 1 : Chercher l'événement
    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Événement non trouvé"
        )

    # ÉTAPE 2 : Vérifier que l'utilisateur est le créateur ou un admin
    if event.organizer_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'êtes pas autorisé à publier cet événement"
        )

    # ÉTAPE 3 : Publier
    event.status = EventStatus.PUBLISHED
    event.is_published = True

    db.commit()
    db.refresh(event)

    return event


# ROUTE 8 : Annuler un événement (Créateur ou Admin seulement)
@router.post("/{event_id}/cancel", response_model=EventResponse)
def cancel_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Annuler un événement

    **Authentification requise** : Créateur de l'événement ou Admin

    Change le statut à CANCELLED.
    Plus tard, on enverra des emails de remboursement aux participants.

    Exemple :
    - POST /api/v1/events/1/cancel
    """

    # ÉTAPE 1 : Chercher l'événement
    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Événement non trouvé"
        )

    # ÉTAPE 2 : Vérifier que l'utilisateur est le créateur ou un admin
    if event.organizer_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'êtes pas autorisé à annuler cet événement"
        )

    # ÉTAPE 3 : Annuler
    event.status = EventStatus.CANCELLED
    event.is_published = False

    db.commit()
    db.refresh(event)

    # TODO : Envoyer des emails de remboursement aux participants

    return event

