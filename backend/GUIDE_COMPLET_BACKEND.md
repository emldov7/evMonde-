# 📚 GUIDE COMPLET DU BACKEND - evMonde

**De zéro à héros: Comprendre TOUT le backend FastAPI**

---

## 📖 TABLE DES MATIÈRES

1. [Architecture Globale](#1-architecture-globale)
2. [Les Modèles (Models)](#2-les-modèles-models)
3. [Les Relations entre Tables](#3-les-relations-entre-tables)
4. [La Configuration (Settings)](#4-la-configuration-settings)
5. [L'Authentification (JWT)](#5-lauthentification-jwt)
6. [Les Routes API (Endpoints)](#6-les-routes-api-endpoints)
7. [Le Système de Commission](#7-le-système-de-commission)
8. [Le Système de Payout](#8-le-système-de-payout)
9. [Le Chiffrement des Données](#9-le-chiffrement-des-données)
10. [Les Webhooks Stripe](#10-les-webhooks-stripe)
11. [Le Système SuperAdmin](#11-le-système-superadmin)
12. [Comment Tout se Connecte](#12-comment-tout-se-connecte)

---

# 1. ARCHITECTURE GLOBALE

## 1.1 Structure des Dossiers

```
backend/
├── app/
│   ├── models/          # Les tables de la base de données
│   │   ├── user.py
│   │   ├── event.py
│   │   ├── registration.py
│   │   ├── category.py
│   │   ├── tag.py
│   │   ├── commission.py
│   │   └── payout.py
│   │
│   ├── api/             # Les routes (endpoints)
│   │   ├── auth.py
│   │   ├── users.py
│   │   ├── events.py
│   │   ├── registrations.py
│   │   ├── webhooks.py
│   │   ├── admin.py
│   │   ├── superadmin.py
│   │   ├── marketplace.py
│   │   ├── upload.py
│   │   └── deps.py      # Dépendances (vérification token, rôle, etc.)
│   │
│   ├── config/          # Configuration
│   │   ├── settings.py  # Variables d'environnement
│   │   └── database.py  # Connexion PostgreSQL
│   │
│   ├── utils/           # Utilitaires
│   │   ├── countries.py
│   │   ├── qr_code.py
│   │   └── encryption.py
│   │
│   └── main.py          # Point d'entrée de l'application
│
├── .env                 # Variables secrètes
├── requirements.txt     # Dépendances Python
└── uploads/             # Fichiers uploadés (images, QR codes)
```

## 1.2 Le Flux de Requête

Quand un utilisateur fait une requête (ex: `POST /api/v1/auth/login`):

```
1. CLIENT (frontend React)
   ↓ HTTP Request
2. MAIN.PY (FastAPI app)
   ↓ Router
3. API/AUTH.PY (route /login)
   ↓ Appelle
4. DEPS.PY (vérifications: token, rôle, suspension)
   ↓ Si OK
5. DATABASE (PostgreSQL via SQLAlchemy)
   ↓ Retourne données
6. API/AUTH.PY (génère token JWT)
   ↓ HTTP Response
7. CLIENT (reçoit le token)
```

---

# 2. LES MODÈLES (MODELS)

Les modèles = Les tables de la base de données PostgreSQL.

## 2.1 Modèle User (app/models/user.py)

### Pourquoi ce modèle?
Un utilisateur peut être:
- **PARTICIPANT** → S'inscrit aux événements
- **ORGANIZER** → Crée des événements
- **ADMIN** → Gère toute la plateforme

### Le Code:

```python
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.sql import func
from app.config.database import Base
import enum

# ÉTAPE 1: Définir les rôles possibles
class UserRole(str, enum.Enum):
    PARTICIPANT = "participant"
    ORGANIZER = "organizer"
    ADMIN = "admin"

# ÉTAPE 2: Créer la classe User qui représente la table "users"
class User(Base):
    __tablename__ = "users"  # Nom de la table dans PostgreSQL

    # COLONNES DE BASE
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String, unique=True, nullable=False, index=True)
    phone_full = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)

    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)

    # RÔLE (PARTICIPANT, ORGANIZER, ADMIN)
    role = Column(Enum(UserRole), default=UserRole.PARTICIPANT, nullable=False)

    # STATUTS
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)

    # SUSPENSION (ajouté pour le SuperAdmin)
    is_suspended = Column(Boolean, default=False, nullable=False)
    suspension_reason = Column(String, nullable=True)
    suspended_at = Column(DateTime(timezone=True), nullable=True)
    suspended_by_admin_id = Column(Integer, nullable=True)

    # DATES
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_login_at = Column(DateTime(timezone=True), nullable=True)
```

### Explication Ligne par Ligne:

#### `__tablename__ = "users"`
- Indique à SQLAlchemy de créer une table nommée `users` dans PostgreSQL

#### `id = Column(Integer, primary_key=True, ...)`
- **Integer**: Type de donnée (nombre entier)
- **primary_key=True**: Clé primaire (identifiant unique)
- **index=True**: Créer un index pour accélérer les recherches
- **autoincrement=True**: 1, 2, 3, 4... automatiquement

#### `email = Column(String, unique=True, nullable=False, index=True)`
- **String**: Type texte
- **unique=True**: Aucun doublon autorisé (2 users ne peuvent pas avoir le même email)
- **nullable=False**: Obligatoire (ne peut pas être vide)
- **index=True**: Index pour recherche rapide par email

#### `role = Column(Enum(UserRole), default=UserRole.PARTICIPANT, nullable=False)`
- **Enum(UserRole)**: Doit être une des 3 valeurs (PARTICIPANT, ORGANIZER, ADMIN)
- **default=UserRole.PARTICIPANT**: Si non spécifié, sera PARTICIPANT
- **nullable=False**: Obligatoire

#### `created_at = Column(DateTime(timezone=True), server_default=func.now())`
- **DateTime(timezone=True)**: Date avec fuseau horaire
- **server_default=func.now()**: PostgreSQL ajoute automatiquement la date du jour

#### `updated_at = Column(..., onupdate=func.now())`
- **onupdate=func.now()**: PostgreSQL met à jour automatiquement la date à chaque modification

### Ce qui se passe dans PostgreSQL:

Quand SQLAlchemy crée cette table, PostgreSQL exécute:

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR UNIQUE NOT NULL,
    phone_full VARCHAR UNIQUE NOT NULL,
    hashed_password VARCHAR NOT NULL,
    first_name VARCHAR NOT NULL,
    last_name VARCHAR NOT NULL,
    role userrole NOT NULL DEFAULT 'participant',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
    suspension_reason VARCHAR,
    suspended_at TIMESTAMP WITH TIME ZONE,
    suspended_by_admin_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX ix_users_id ON users (id);
CREATE UNIQUE INDEX ix_users_email ON users (email);
CREATE UNIQUE INDEX ix_users_phone_full ON users (phone_full);
```

---

## 2.2 Modèle Event (app/models/event.py)

### Pourquoi ce modèle?
Un événement peut être:
- **PHYSICAL** → Lieu physique (adresse)
- **VIRTUAL** → En ligne (Zoom, Teams, etc.)
- **HYBRID** → Les deux

### Le Code (extrait):

```python
class EventType(str, enum.Enum):
    PUBLIC = "public"
    PRIVATE = "private"

class EventFormat(str, enum.Enum):
    PHYSICAL = "physical"
    VIRTUAL = "virtual"
    HYBRID = "hybrid"

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(200), nullable=False, index=True)
    description = Column(String(500), nullable=True)

    # Type et format
    event_type = Column(Enum(EventType), default=EventType.PUBLIC, nullable=False)
    event_format = Column(Enum(EventFormat), nullable=False)

    # Dates
    start_date = Column(DateTime, nullable=False, index=True)
    end_date = Column(DateTime, nullable=False)

    # Lieu physique
    location = Column(String(300), nullable=True)
    address = Column(String(500), nullable=True)
    city = Column(String(100), nullable=True, index=True)
    country_code = Column(String(2), nullable=True, index=True)

    # Capacité
    capacity = Column(Integer, nullable=False)
    available_seats = Column(Integer, nullable=False)

    # Prix
    is_free = Column(Boolean, default=False, nullable=False)
    price = Column(Float, default=0.0, nullable=False)
    currency = Column(String(3), nullable=False)

    # Virtuel
    virtual_platform = Column(Enum(VirtualPlatform), nullable=True)
    virtual_meeting_url = Column(String(500), nullable=True)

    # RELATION AVEC USER (organisateur)
    organizer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # RELATION AVEC CATEGORY (ajouté pour marketplace)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)

    # Modération admin
    is_featured = Column(Boolean, default=False, nullable=False)
    is_flagged = Column(Boolean, default=False, nullable=False)
    flag_reason = Column(String, nullable=True)
    admin_notes = Column(Text, nullable=True)

    # RELATIONS
    category = relationship("Category", back_populates="events")
    tags = relationship("Tag", secondary="event_tags", back_populates="events")
```

### Les Foreign Keys (Clés Étrangères):

#### `organizer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))`

**Ce que ça signifie:**
- Chaque événement DOIT être lié à un utilisateur (l'organisateur)
- `ForeignKey("users.id")` = Référence à la colonne `id` de la table `users`
- `ondelete="CASCADE"` = Si l'utilisateur est supprimé, ses événements sont aussi supprimés

**Dans PostgreSQL:**
```sql
organizer_id INTEGER NOT NULL,
FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE
```

**Exemple concret:**
```python
# User avec id=5
user = User(id=5, email="jean@example.com", ...)

# Event lié à ce user
event = Event(title="Concert", organizer_id=5, ...)

# Si on supprime le user id=5, PostgreSQL supprime automatiquement cet event
```

#### `category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"))`

**Ce que ça signifie:**
- Chaque événement PEUT être lié à une catégorie (optionnel)
- `ondelete="SET NULL"` = Si la catégorie est supprimée, category_id devient NULL (mais l'event reste)

---

## 2.3 Modèle Registration (app/models/registration.py)

### Pourquoi ce modèle?
Quand quelqu'un s'inscrit à un événement, on crée une Registration.

### Le Code (extrait):

```python
class RegistrationType(str, enum.Enum):
    USER = "user"           # Utilisateur connecté
    GUEST = "guest"         # Invité non connecté

class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"

class Registration(Base):
    __tablename__ = "registrations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Type d'inscription
    registration_type = Column(Enum(RegistrationType), nullable=False, index=True)

    # RELATION AVEC EVENT
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)

    # RELATION AVEC USER (optionnel si guest)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)

    # Infos guest (si registration_type = guest)
    guest_first_name = Column(String(100), nullable=True)
    guest_last_name = Column(String(100), nullable=True)
    guest_email = Column(String(255), nullable=True, index=True)

    # Paiement
    payment_status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING, nullable=False)
    amount_paid = Column(Float, nullable=False)
    currency = Column(String(3), nullable=True)
    stripe_payment_intent_id = Column(String(255), nullable=True, unique=True, index=True)

    # QR Code
    qr_code_url = Column(String(500), nullable=True)
    qr_code_data = Column(String(500), nullable=True, unique=True, index=True)
    scanned_count = Column(Integer, default=0, nullable=False)
```

### Les Relations Multiples:

**Une Registration est liée à:**
1. UN Event (event_id)
2. UN User OU Guest (user_id peut être NULL si guest)

**Exemple:**
```python
# Inscription d'un user connecté
registration1 = Registration(
    event_id=10,
    user_id=5,              # User connecté
    registration_type="user",
    guest_email=None        # Pas besoin
)

# Inscription d'un guest (non connecté)
registration2 = Registration(
    event_id=10,
    user_id=None,           # Pas de user
    registration_type="guest",
    guest_email="invite@example.com"  # Info du guest
)
```

---

## 2.4 Modèle Category (app/models/category.py)

### Pourquoi ce modèle?
Pour organiser les événements en catégories (Concerts, Conférences, Sports, etc.)

### Le Code:

```python
class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Nom et slug
    name = Column(String(100), unique=True, nullable=False, index=True)
    slug = Column(String(100), unique=True, nullable=False, index=True)

    # Description
    description = Column(Text, nullable=True)

    # Visuel
    icon = Column(String(50), nullable=True)   # Ex: "🎵"
    color = Column(String(7), nullable=True)   # Ex: "#FF6B6B"

    # Actif ou non
    is_active = Column(Boolean, default=True, nullable=False)

    # Ordre d'affichage
    display_order = Column(Integer, default=0, nullable=False)

    # Commission personnalisée (en %)
    custom_commission_rate = Column(Integer, nullable=True)

    # Dates
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # RELATION avec les events
    events = relationship("Event", back_populates="category")
```

### Le Slug (URL-friendly):

**C'est quoi un slug?**
- Nom → "Concerts & Musique Live!"
- Slug → "concerts-musique-live"

**Comment on le génère?**
```python
from slugify import slugify

name = "Concerts & Musique Live!"
slug = slugify(name)  # "concerts-musique-live"
```

**Pourquoi?**
Pour avoir de belles URLs:
- ❌ Mauvais: `/events?category=Concerts%20%26%20Musique%20Live!`
- ✅ Bon: `/events?category=concerts-musique-live`

### La Relation avec Event:

```python
# Dans Category
events = relationship("Event", back_populates="category")

# Dans Event
category = relationship("Category", back_populates="events")
```

**Ce que ça fait:**
```python
# Récupérer une catégorie
category = db.query(Category).filter(Category.id == 1).first()

# Accéder à TOUS ses événements automatiquement!
print(category.events)  # Liste de tous les events avec category_id=1
```

**Sans relationship:**
```python
# Il faudrait faire:
events = db.query(Event).filter(Event.category_id == 1).all()
```

**Avec relationship:**
```python
# SQLAlchemy le fait automatiquement!
category.events  # Plus simple!
```

---

## 2.5 Modèle Tag (app/models/tag.py)

### Pourquoi ce modèle?
Pour taguer les événements (Live, Musique, Tech, Business, etc.)

### Le Code:

```python
from sqlalchemy import Table

# TABLE DE LIAISON Many-to-Many
event_tags = Table(
    'event_tags',
    Base.metadata,
    Column('event_id', Integer, ForeignKey('events.id', ondelete='CASCADE'), primary_key=True),
    Column('tag_id', Integer, ForeignKey('tags.id', ondelete='CASCADE'), primary_key=True),
    Column('created_at', DateTime(timezone=True), server_default=func.now())
)

class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(50), unique=True, nullable=False, index=True)
    slug = Column(String(50), unique=True, nullable=False, index=True)
    color = Column(String(7), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    # RELATION Many-to-Many avec Event
    events = relationship("Event", secondary=event_tags, back_populates="tags")
```

### La Relation Many-to-Many (Plusieurs à Plusieurs):

**Le problème:**
- Un événement peut avoir PLUSIEURS tags (Live, Musique, Gratuit)
- Un tag peut être utilisé par PLUSIEURS événements

**La solution: Table de liaison `event_tags`**

```
events          event_tags              tags
------          ----------              ----
id | title      event_id | tag_id       id | name
1  | Concert    1        | 1            1  | Live
2  | Conf       1        | 2            2  | Musique
               2        | 3            3  | Tech
```

**En code:**
```python
# Créer des tags
tag_live = Tag(id=1, name="Live", slug="live")
tag_music = Tag(id=2, name="Musique", slug="musique")

# Créer un event
event = Event(id=1, title="Concert Rock")

# Ajouter les tags à l'event
event.tags.append(tag_live)
event.tags.append(tag_music)

# PostgreSQL crée automatiquement dans event_tags:
# event_id=1, tag_id=1
# event_id=1, tag_id=2
```

**Récupérer:**
```python
event = db.query(Event).filter(Event.id == 1).first()
print(event.tags)  # [Tag(name="Live"), Tag(name="Musique")]
```

---

## 2.6 Modèle Commission (app/models/commission.py)

### Pourquoi 2 tables?

1. **CommissionSettings** = Configuration globale (UNE SEULE LIGNE)
2. **CommissionTransaction** = Historique de chaque commission prélevée

### Le Code:

```python
class CommissionSettings(Base):
    """Configuration globale (singleton: id toujours = 1)"""
    __tablename__ = "commission_settings"

    id = Column(Integer, primary_key=True, default=1)

    # Taux global (ex: 5%)
    default_commission_rate = Column(Float, default=5.0, nullable=False)

    # Montant minimum (ex: 0.5 dollar minimum)
    minimum_commission_amount = Column(Float, default=0.0, nullable=False)

    # Actif ou non
    is_active = Column(Boolean, default=True, nullable=False)

    # Notes admin
    notes = Column(Text, nullable=True)


class CommissionTransaction(Base):
    """Historique de chaque commission prélevée"""
    __tablename__ = "commission_transactions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Quelle inscription?
    registration_id = Column(Integer, nullable=False, index=True)

    # Quel événement?
    event_id = Column(Integer, nullable=False, index=True)

    # Quel organisateur?
    organizer_id = Column(Integer, nullable=False, index=True)

    # Montants
    ticket_amount = Column(Float, nullable=False)        # 100 XOF
    commission_rate = Column(Float, nullable=False)      # 5%
    commission_amount = Column(Float, nullable=False)    # 5 XOF
    net_amount = Column(Float, nullable=False)           # 95 XOF

    currency = Column(String(3), nullable=False)
    stripe_payment_intent_id = Column(String(255), nullable=True, index=True)
```

### Comment ça marche?

**Étape 1: Admin configure la commission**
```python
# Créer ou modifier la config (id toujours = 1)
settings = CommissionSettings(
    id=1,
    default_commission_rate=5.0,  # 5%
    minimum_commission_amount=0.5,
    is_active=True
)
```

**Étape 2: Participant achète un billet de 100 XOF**
```python
registration = Registration(
    event_id=10,
    user_id=5,
    amount_paid=100.0,
    currency="XOF"
)
```

**Étape 3: Webhook Stripe confirme le paiement**
```python
# Dans app/api/webhooks.py

# 1. Récupérer la config
settings = db.query(CommissionSettings).first()

if settings.is_active:
    # 2. Calculer la commission
    ticket_amount = 100.0
    commission_rate = 5.0  # Peut être overridé par category.custom_commission_rate
    commission_amount = (100.0 * 5.0) / 100 = 5.0 XOF
    net_amount = 100.0 - 5.0 = 95.0 XOF

    # 3. Enregistrer la transaction
    transaction = CommissionTransaction(
        registration_id=registration.id,
        event_id=10,
        organizer_id=event.organizer_id,
        ticket_amount=100.0,
        commission_rate=5.0,
        commission_amount=5.0,
        net_amount=95.0,
        currency="XOF"
    )
    db.add(transaction)
```

**Résultat:**
- Plateforme gagne: 5 XOF
- Organisateur reçoit: 95 XOF

---

## 2.7 Modèle Payout (app/models/payout.py)

### Pourquoi ce modèle?
L'organisateur veut retirer ses revenus → Il fait une demande de payout → Admin approuve et paie.

### Le Code:

```python
class PayoutStatus(str, enum.Enum):
    PENDING = "pending"          # En attente
    APPROVED = "approved"        # Approuvé par admin
    PROCESSING = "processing"    # En cours (Stripe)
    COMPLETED = "completed"      # Payé!
    REJECTED = "rejected"        # Refusé
    FAILED = "failed"            # Échec technique
    CANCELLED = "cancelled"      # Annulé

class Payout(Base):
    __tablename__ = "payouts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Quel organisateur?
    organizer_id = Column(Integer, nullable=False, index=True)

    # Montant demandé
    amount = Column(Float, nullable=False)
    currency = Column(String(3), nullable=False)

    # Statut
    status = Column(Enum(PayoutStatus), default=PayoutStatus.PENDING, nullable=False, index=True)

    # Méthode
    payout_method = Column(String(50), nullable=False)  # bank_transfer, mobile_money, etc.

    # INFOS BANCAIRES (CHIFFRÉES!)
    account_details = Column(Text, nullable=True)

    # Messages
    organizer_message = Column(Text, nullable=True)
    admin_notes = Column(Text, nullable=True)

    # Traitement
    processed_by_admin_id = Column(Integer, nullable=True)
    stripe_payout_id = Column(String(255), nullable=True, unique=True, index=True)

    # Dates
    requested_at = Column(DateTime(timezone=True), server_default=func.now())
    approved_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
```

### Le Workflow:

```
1. ORGANIZER demande payout
   POST /api/v1/marketplace/payouts/request
   {
     "amount": 5000,
     "payout_method": "bank_transfer",
     "account_details": "IBAN: FR76 1234..."  ← SERA CHIFFRÉ
   }

   Status: PENDING

2. ADMIN voit la demande
   GET /api/v1/marketplace/payouts
   → Voit account_details DÉCHIFFRÉ

3. ADMIN approuve
   PUT /api/v1/marketplace/payouts/123
   {
     "status": "approved",
     "admin_notes": "Validé, virement effectué"
   }

   Status: APPROVED → COMPLETED
```

---

# 3. LES RELATIONS ENTRE TABLES

## 3.1 Vue d'Ensemble

```
users
  ↓ organizer_id
events ←──── category_id ──── categories
  ↓ event_id       ↑
registrations      └─── event_tags ──── tags
  ↓
commission_transactions

users (organizers)
  ↓ organizer_id
payouts
```

## 3.2 One-to-Many (Un à Plusieurs)

### User → Events

**Un utilisateur peut créer PLUSIEURS événements**
**Un événement a UN SEUL organisateur**

```python
# Dans Event
organizer_id = Column(Integer, ForeignKey("users.id"))

# Dans User (optionnel, pour faciliter l'accès)
events = relationship("Event", back_populates="organizer")
```

**Exemple:**
```python
user = db.query(User).filter(User.id == 5).first()
print(user.events)  # Tous les events créés par ce user
```

### Event → Registrations

**Un événement peut avoir PLUSIEURS inscriptions**
**Une inscription est pour UN SEUL événement**

```python
# Dans Registration
event_id = Column(Integer, ForeignKey("events.id"))
```

## 3.3 Many-to-Many (Plusieurs à Plusieurs)

### Event ↔ Tags

**Un événement peut avoir PLUSIEURS tags**
**Un tag peut être sur PLUSIEURS événements**

```python
# Table de liaison
event_tags = Table(
    'event_tags',
    Base.metadata,
    Column('event_id', Integer, ForeignKey('events.id')),
    Column('tag_id', Integer, ForeignKey('tags.id'))
)

# Dans Event
tags = relationship("Tag", secondary=event_tags, back_populates="events")

# Dans Tag
events = relationship("Event", secondary=event_tags, back_populates="tags")
```

**PostgreSQL crée 3 tables:**
```sql
-- Table events
CREATE TABLE events (...);

-- Table tags
CREATE TABLE tags (...);

-- Table de liaison
CREATE TABLE event_tags (
    event_id INTEGER REFERENCES events(id),
    tag_id INTEGER REFERENCES tags(id),
    PRIMARY KEY (event_id, tag_id)
);
```

---

# 4. LA CONFIGURATION (SETTINGS)

## 4.1 Le fichier .env

**C'est quoi?**
Un fichier contenant TOUTES les variables secrètes/sensibles.

**Pourquoi?**
- ❌ NE JAMAIS mettre de secrets dans le code
- ✅ Les mettre dans .env (qui est dans .gitignore)

**Contenu:**
```bash
# Base de données
DATABASE_URL="postgresql://postgres:1230984756@localhost:5432/event_db"

# Sécurité
SECRET_KEY="dev-secret-key-change-this-in-production"
ENCRYPTION_KEY="asBmvu_RwiO800snxDBC_PHsEhPz6FBO60gTjR0_bdI="

# Stripe
STRIPE_SECRET_KEY="sk_test_placeholder"
STRIPE_PUBLISHABLE_KEY="pk_test_placeholder"

# Email
SMTP_USER="kossiemmanueldovon@gmail.com"
SMTP_PASSWORD="dkcvybbgumcpslsj"
```

## 4.2 Le fichier settings.py

**Rôle:** Lire le .env et exposer les variables au code.

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Base de données
    DATABASE_URL: str

    # Sécurité
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ENCRYPTION_KEY: str  ← NOUVEAU

    # Stripe
    STRIPE_SECRET_KEY: str
    STRIPE_PUBLISHABLE_KEY: str

    # Email
    SMTP_USER: str
    SMTP_PASSWORD: str

    class Config:
        env_file = ".env"  # Lire depuis .env
        case_sensitive = True

# Instance unique
settings = Settings()
```

**Utilisation:**
```python
from app.config.settings import settings

print(settings.DATABASE_URL)  # "postgresql://..."
print(settings.SECRET_KEY)    # "dev-secret-key..."
print(settings.ENCRYPTION_KEY)  # "asBmvu_R..."
```

**Pydantic lit automatiquement .env!**

---

# 5. L'AUTHENTIFICATION (JWT)

## 5.1 Le Workflow Complet

```
1. USER s'inscrit
   POST /api/v1/auth/register
   {
     "email": "jean@example.com",
     "password": "motdepasse123"
   }

   → Hash le mot de passe avec bcrypt
   → Sauvegarde dans users

2. USER se connecte
   POST /api/v1/auth/login
   {
     "email": "jean@example.com",
     "password": "motdepasse123"
   }

   → Vérifie le hash
   → Génère un token JWT
   → Retourne le token

3. USER fait une requête protégée
   GET /api/v1/users/me
   Headers: {
     "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   }

   → Vérifie le token
   → Extrait user_id du token
   → Charge le user depuis la DB
   → Retourne les données
```

## 5.2 Le Hashing du Mot de Passe

**Pourquoi?**
- ❌ Stocker "motdepasse123" en clair dans la DB
- ✅ Stocker "$2b$12$KIXxGz3..." (hash bcrypt)

**Code:**
```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Hash le mot de passe
password = "motdepasse123"
hashed = pwd_context.hash(password)
# "$2b$12$KIXxGz3vF8uN9bQZ5XqYJe7..."

# Vérifier le mot de passe
is_correct = pwd_context.verify("motdepasse123", hashed)  # True
is_correct = pwd_context.verify("mauvais", hashed)        # False
```

## 5.3 Le Token JWT

**C'est quoi?**
Un jeton qui contient des informations chiffrées.

**Structure:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo1LCJleHAiOjE3MzI...
│                                      │                                      │
│       HEADER (algorithme)            │       PAYLOAD (données)             │ SIGNATURE
```

**Payload décodé:**
```json
{
  "user_id": 5,
  "exp": 1732036800  // Expiration (30 minutes)
}
```

**Génération:**
```python
from jose import jwt
from datetime import datetime, timedelta
from app.config.settings import settings

def create_access_token(user_id: int):
    # Données à mettre dans le token
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(minutes=30)
    }

    # Générer le token avec SECRET_KEY
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")
    return token
```

**Vérification:**
```python
from jose import jwt, JWTError

def verify_token(token: str):
    try:
        # Décoder avec SECRET_KEY
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("user_id")
        return user_id
    except JWTError:
        return None  # Token invalide ou expiré
```

## 5.4 Les Dépendances (deps.py)

**Rôle:** Vérifier le token et charger le user automatiquement.

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session

security = HTTPBearer()

def get_current_user(
    token: str = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Vérifie le token et retourne le user connecté
    """

    # Extraire le token (enlever "Bearer ")
    credentials = token.credentials

    # Décoder le token
    try:
        payload = jwt.decode(credentials, settings.SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("user_id")
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide"
        )

    # Charger le user depuis la DB
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur introuvable"
        )

    # Vérifier si suspendu
    if user.is_suspended:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Compte suspendu. Raison: {user.suspension_reason}"
        )

    # Tout est OK!
    return user
```

**Utilisation dans une route:**
```python
@router.get("/users/me")
def get_my_profile(current_user: User = Depends(get_current_user)):
    """
    current_user est automatiquement le user connecté!
    """
    return {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role
    }
```

**Ce qui se passe:**
1. Client envoie: `Authorization: Bearer eyJhbGc...`
2. FastAPI appelle `get_current_user()`
3. `get_current_user()` décode le token → user_id=5
4. `get_current_user()` charge User id=5 depuis DB
5. `get_current_user()` retourne le User
6. La route reçoit `current_user = User(id=5, ...)`

---

# 6. LES ROUTES API (ENDPOINTS)

## 6.1 Structure d'une Route

```python
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

router = APIRouter()

# SCHEMA (validation des données)
class EventCreate(BaseModel):
    title: str
    description: str
    price: float

# ROUTE
@router.post("/events", status_code=status.HTTP_201_CREATED)
def create_event(
    event_data: EventCreate,                        # Corps de la requête
    current_user: User = Depends(get_current_user), # User connecté
    db: Session = Depends(get_db)                   # Session DB
):
    """
    Créer un nouvel événement
    """

    # Créer l'event
    event = Event(
        title=event_data.title,
        description=event_data.description,
        price=event_data.price,
        organizer_id=current_user.id  # Lié au user connecté
    )

    # Sauvegarder dans la DB
    db.add(event)
    db.commit()
    db.refresh(event)  # Recharger pour avoir l'id auto-généré

    return event
```

**Explication:**

### `@router.post("/events")`
- Définit une route POST sur `/events`
- Méthode HTTP: POST (création)

### `event_data: EventCreate`
- FastAPI lit le corps JSON de la requête
- Valide avec Pydantic (EventCreate)
- Si invalide → erreur 422

### `current_user: User = Depends(get_current_user)`
- FastAPI appelle `get_current_user()` automatiquement
- Si token invalide → erreur 401
- Sinon → `current_user` contient le User

### `db: Session = Depends(get_db)`
- FastAPI crée une session DB automatiquement
- À la fin de la requête, ferme la session

## 6.2 Les Méthodes HTTP

| Méthode | Action | Exemple |
|---------|--------|---------|
| GET | Lire | `GET /events` → Liste des events |
| POST | Créer | `POST /events` → Créer un event |
| PUT | Modifier (complet) | `PUT /events/123` → Modifier event 123 |
| PATCH | Modifier (partiel) | `PATCH /events/123` → Modifier juste le titre |
| DELETE | Supprimer | `DELETE /events/123` → Supprimer event 123 |

## 6.3 Les Paramètres

### Dans l'URL (Path Parameter)
```python
@router.get("/events/{event_id}")
def get_event(event_id: int):
    # URL: /events/123
    # event_id = 123
    pass
```

### Dans la Query String (Query Parameter)
```python
from fastapi import Query

@router.get("/events")
def list_events(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    category: Optional[str] = None
):
    # URL: /events?skip=0&limit=10&category=concerts
    # skip = 0
    # limit = 10
    # category = "concerts"
    pass
```

### Dans le Corps (Body)
```python
class EventCreate(BaseModel):
    title: str
    price: float

@router.post("/events")
def create_event(event_data: EventCreate):
    # Body JSON:
    # {
    #   "title": "Concert",
    #   "price": 5000
    # }
    # event_data.title = "Concert"
    # event_data.price = 5000
    pass
```

---

# 7. LE SYSTÈME DE COMMISSION

## 7.1 Le Flow Complet

```
┌─────────────────────────────────────────────────────────────┐
│ ÉTAPE 1: ADMIN CONFIGURE LA COMMISSION                     │
└─────────────────────────────────────────────────────────────┘
Admin → PUT /api/v1/marketplace/commission/settings
{
  "default_commission_rate": 5.0,
  "minimum_commission_amount": 0.5,
  "is_active": true
}

PostgreSQL → commission_settings (id=1, default_commission_rate=5.0)

┌─────────────────────────────────────────────────────────────┐
│ ÉTAPE 2: ADMIN CRÉE UNE CATÉGORIE AVEC COMMISSION CUSTOM   │
└─────────────────────────────────────────────────────────────┘
Admin → POST /api/v1/marketplace/categories
{
  "name": "Concerts",
  "custom_commission_rate": 7.0  ← Override global 5%
}

PostgreSQL → categories (id=1, name="Concerts", custom_commission_rate=7)

┌─────────────────────────────────────────────────────────────┐
│ ÉTAPE 3: ORGANIZER CRÉE UN EVENT                           │
└─────────────────────────────────────────────────────────────┘
Organizer → POST /api/v1/events
{
  "title": "Concert Rock",
  "price": 5000,
  "currency": "XOF",
  "category_id": 1  ← Catégorie "Concerts"
}

PostgreSQL → events (id=10, category_id=1, price=5000)

┌─────────────────────────────────────────────────────────────┐
│ ÉTAPE 4: PARTICIPANT ACHÈTE UN BILLET                      │
└─────────────────────────────────────────────────────────────┘
Participant → POST /api/v1/registrations/10/register

Backend:
1. Crée Registration (status=PENDING, amount_paid=5000)
2. Crée Stripe Checkout Session
3. Redirige vers Stripe

Stripe:
Participant paie 5000 XOF

┌─────────────────────────────────────────────────────────────┐
│ ÉTAPE 5: WEBHOOK STRIPE CONFIRME LE PAIEMENT              │
└─────────────────────────────────────────────────────────────┘
Stripe → POST /webhooks/stripe
{
  "type": "checkout.session.completed",
  "data": {
    "payment_intent": "pi_123",
    "amount_total": 5000
  }
}

Backend (app/api/webhooks.py):

# 1. Charger la registration
registration = db.query(Registration).filter(...).first()

# 2. Charger l'event
event = db.query(Event).filter(Event.id == registration.event_id).first()

# 3. Charger commission settings
settings = db.query(CommissionSettings).first()

# 4. Déterminer le taux de commission
commission_rate = settings.default_commission_rate  # 5% par défaut

if event.category_id:
    category = db.query(Category).filter(Category.id == event.category_id).first()
    if category and category.custom_commission_rate:
        commission_rate = category.custom_commission_rate  # 7% pour Concerts

# 5. Calculer la commission
ticket_amount = 5000.0
commission_amount = (5000 * 7) / 100 = 350.0 XOF
net_amount = 5000 - 350 = 4650.0 XOF

# 6. Enregistrer la transaction
transaction = CommissionTransaction(
    registration_id=registration.id,
    event_id=10,
    organizer_id=event.organizer_id,
    ticket_amount=5000.0,
    commission_rate=7.0,
    commission_amount=350.0,
    net_amount=4650.0,
    currency="XOF"
)
db.add(transaction)

# 7. Confirmer la registration
registration.payment_status = PaymentStatus.PAID
db.commit()

PostgreSQL → commission_transactions (350 XOF prélevés)

┌─────────────────────────────────────────────────────────────┐
│ RÉSULTAT FINAL                                             │
└─────────────────────────────────────────────────────────────┘
Plateforme reçoit: 350 XOF (commission)
Organisateur reçoit (net): 4650 XOF
```

## 7.2 Le Code Détaillé (webhooks.py)

```python
@router.post("/stripe")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    # 1. Récupérer le payload Stripe
    payload = await request.body()

    # 2. Vérifier la signature (sécurité)
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")

    # 3. Si c'est un paiement confirmé
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]

        # 4. Charger la registration
        registration = db.query(Registration).filter(
            Registration.stripe_session_id == session["id"]
        ).first()

        if not registration:
            return {"status": "registration not found"}

        # 5. Charger l'event
        event_obj = db.query(Event).filter(
            Event.id == registration.event_id
        ).first()

        # 6. CALCULER LA COMMISSION
        commission_settings = db.query(CommissionSettings).first()

        if commission_settings and commission_settings.is_active:
            # Taux par défaut
            commission_rate = commission_settings.default_commission_rate

            # Override si catégorie a un taux custom
            if event_obj.category_id:
                category = db.query(Category).filter(
                    Category.id == event_obj.category_id
                ).first()

                if category and category.custom_commission_rate is not None:
                    commission_rate = category.custom_commission_rate

            # Calculer les montants
            ticket_amount = registration.amount_paid
            commission_amount = (ticket_amount * commission_rate) / 100

            # Appliquer le minimum si défini
            if commission_settings.minimum_commission_amount > 0:
                commission_amount = max(
                    commission_amount,
                    commission_settings.minimum_commission_amount
                )

            net_amount = ticket_amount - commission_amount

            # Enregistrer la transaction
            commission_transaction = CommissionTransaction(
                registration_id=registration.id,
                event_id=event_obj.id,
                organizer_id=event_obj.organizer_id,
                ticket_amount=ticket_amount,
                commission_rate=commission_rate,
                commission_amount=commission_amount,
                net_amount=net_amount,
                currency=registration.currency,
                stripe_payment_intent_id=session.get("payment_intent")
            )
            db.add(commission_transaction)

        # 7. Confirmer la registration
        registration.payment_status = PaymentStatus.PAID
        db.commit()

    return {"status": "success"}
```

---

# 8. LE SYSTÈME DE PAYOUT

## 8.1 Le Flow Complet

```
┌─────────────────────────────────────────────────────────────┐
│ ÉTAPE 1: ORGANIZER CONSULTE SON SOLDE                      │
└─────────────────────────────────────────────────────────────┘
Organizer → GET /api/v1/marketplace/my-balance

Backend calcule:
- total_revenue = SUM(registrations.amount_paid) WHERE payment_status=PAID
- total_commissions = SUM(commission_transactions.commission_amount)
- total_payouts = SUM(payouts.amount) WHERE status=COMPLETED
- pending_payouts = SUM(payouts.amount) WHERE status IN (PENDING, APPROVED)
- available_balance = total_revenue - total_commissions - total_payouts - pending_payouts

Exemple:
{
  "total_revenue": 50000,      // 10 billets * 5000 XOF
  "total_commissions": 3500,   // 7% sur chaque billet
  "total_payouts": 0,          // Aucun payout effectué
  "pending_payouts": 0,        // Aucune demande en cours
  "available_balance": 46500,  // 50000 - 3500 = 46500 XOF
  "currency": "XOF"
}

┌─────────────────────────────────────────────────────────────┐
│ ÉTAPE 2: ORGANIZER DEMANDE UN PAYOUT                       │
└─────────────────────────────────────────────────────────────┘
Organizer → POST /api/v1/marketplace/payouts/request
{
  "amount": 40000,
  "payout_method": "bank_transfer",
  "account_details": "IBAN: FR76 1234 5678 9012 3456 7890 123\nTitulaire: Jean Dupont\nBanque: BNP Paribas",
  "message": "Demande de retrait pour événements du mois"
}

Backend (app/api/marketplace.py):

# 1. Vérifier le solde
balance = get_my_balance(current_user, db)
if payout_data.amount > balance.available_balance:
    raise HTTPException(400, "Solde insuffisant")

# 2. CHIFFRER les infos bancaires
encrypted_account_details = encrypt_data(payout_data.account_details)
# "IBAN: FR76..." → "gAAAAABpHj_Z9_NMIuwi6pJnc_3_..."

# 3. Créer le payout
payout = Payout(
    organizer_id=current_user.id,
    amount=40000,
    currency="XOF",
    status=PayoutStatus.PENDING,
    payout_method="bank_transfer",
    account_details=encrypted_account_details,  # CHIFFRÉ!
    organizer_message="Demande de retrait pour événements du mois"
)
db.add(payout)
db.commit()

PostgreSQL → payouts (id=1, account_details="gAAAAABpHj...")

┌─────────────────────────────────────────────────────────────┐
│ ÉTAPE 3: ADMIN VOIT LA DEMANDE                             │
└─────────────────────────────────────────────────────────────┘
Admin → GET /api/v1/marketplace/payouts

Backend (app/api/marketplace.py):

# 1. Charger les payouts
payouts = db.query(Payout).order_by(desc(Payout.requested_at)).all()

# 2. Pour chaque payout, DÉCHIFFRER les infos bancaires
result = []
for payout in payouts:
    organizer = db.query(User).filter(User.id == payout.organizer_id).first()

    # DÉCHIFFRER
    decrypted_account_details = decrypt_data(payout.account_details)
    # "gAAAAABpHj..." → "IBAN: FR76 1234 5678 9012..."

    result.append(PayoutAdminResponse(
        id=payout.id,
        organizer_name=f"{organizer.first_name} {organizer.last_name}",
        organizer_email=organizer.email,
        amount=40000,
        currency="XOF",
        status="pending",
        account_details=decrypted_account_details,  # DÉCHIFFRÉ!
        ...
    ))

Response:
[
  {
    "id": 1,
    "organizer_name": "Jean Dupont",
    "organizer_email": "jean@example.com",
    "amount": 40000,
    "currency": "XOF",
    "status": "pending",
    "account_details": "IBAN: FR76 1234 5678 9012 3456 7890 123\nTitulaire: Jean Dupont\nBanque: BNP Paribas",
    "payout_method": "bank_transfer"
  }
]

┌─────────────────────────────────────────────────────────────┐
│ ÉTAPE 4: ADMIN APPROUVE LE PAYOUT                          │
└─────────────────────────────────────────────────────────────┘
Admin → PUT /api/v1/marketplace/payouts/1
{
  "status": "approved",
  "admin_notes": "Payout validé, virement bancaire effectué le 19/11/2025"
}

Backend:
payout = db.query(Payout).filter(Payout.id == 1).first()
payout.status = PayoutStatus.APPROVED
payout.approved_at = datetime.utcnow()
payout.processed_by_admin_id = current_admin.id
payout.admin_notes = "Payout validé..."
db.commit()

Plus tard, quand le virement est effectué:
payout.status = PayoutStatus.COMPLETED
payout.completed_at = datetime.utcnow()
db.commit()

┌─────────────────────────────────────────────────────────────┐
│ RÉSULTAT FINAL                                             │
└─────────────────────────────────────────────────────────────┘
Organisateur reçoit: 40000 XOF sur son compte bancaire
Solde disponible: 46500 - 40000 = 6500 XOF
```

---

# 9. LE CHIFFREMENT DES DONNÉES

## 9.1 Pourquoi Chiffrer?

**Le problème:**
Les infos bancaires sont stockées dans PostgreSQL.
Si quelqu'un accède à la DB, il voit tout en clair!

```sql
SELECT account_details FROM payouts;
-- "IBAN: FR76 1234 5678 9012..."  ← DANGEREUX!
```

**La solution: Chiffrement**
```sql
SELECT account_details FROM payouts;
-- "gAAAAABpHj_Z9_NMIuwi..."  ← ILLISIBLE!
```

Seul le backend avec la clé `ENCRYPTION_KEY` peut déchiffrer.

## 9.2 L'Algorithme Fernet (AES-128)

**Fernet = AES-128 en mode CBC + HMAC pour l'authentification**

- **AES-128**: Algorithme de chiffrement symétrique très sécurisé
- **HMAC**: Garantit que les données n'ont pas été modifiées
- **Symétrique**: La même clé chiffre ET déchiffre

## 9.3 Le Module encryption.py

```python
from cryptography.fernet import Fernet
from app.config.settings import settings

def get_encryption_key() -> bytes:
    """Récupère la clé depuis .env"""
    key = settings.ENCRYPTION_KEY
    if isinstance(key, str):
        key = key.encode()
    return key

def encrypt_data(plaintext: str) -> str:
    """
    Chiffre une string

    Input:  "IBAN: FR76 1234 5678 9012"
    Output: "gAAAAABpHj_Z9_NMIuwi6pJnc_3_..."
    """
    if not plaintext:
        return ""

    # Créer cipher avec la clé
    cipher = Fernet(get_encryption_key())

    # Chiffrer
    encrypted_bytes = cipher.encrypt(plaintext.encode())

    # Retourner en string (base64)
    return encrypted_bytes.decode()

def decrypt_data(ciphertext: str) -> str:
    """
    Déchiffre une string

    Input:  "gAAAAABpHj_Z9_NMIuwi6pJnc_3_..."
    Output: "IBAN: FR76 1234 5678 9012"
    """
    if not ciphertext:
        return ""

    # Créer cipher avec la clé
    cipher = Fernet(get_encryption_key())

    try:
        # Déchiffrer
        decrypted_bytes = cipher.decrypt(ciphertext.encode())
        return decrypted_bytes.decode()
    except Exception as e:
        raise ValueError(f"Erreur déchiffrement: {e}")

def generate_encryption_key() -> str:
    """
    Génère une nouvelle clé (UNE SEULE FOIS!)

    Output: "asBmvu_RwiO800snxDBC_PHsEhPz6FBO60gTjR0_bdI="
    """
    key = Fernet.generate_key()
    return key.decode()
```

## 9.4 Comment ça Marche en Détail?

### Générer la clé (FAIT UNE SEULE FOIS):

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
# asBmvu_RwiO800snxDBC_PHsEhPz6FBO60gTjR0_bdI=
```

Cette clé est ajoutée dans `.env`:
```bash
ENCRYPTION_KEY="asBmvu_RwiO800snxDBC_PHsEhPz6FBO60gTjR0_bdI="
```

### Chiffrer:

```python
from app.utils.encryption import encrypt_data

original = "IBAN: FR76 1234 5678 9012 3456 7890 123"
encrypted = encrypt_data(original)

print(encrypted)
# "gAAAAABpHj_Z9_NMIuwi6pJnc_3_Y2JBEzmvGaNb6_xbSCZQr6P9-QgAYZ..."
```

**Ce qui se passe:**
1. Fernet prend la clé `ENCRYPTION_KEY`
2. Génère un IV (Initialization Vector) aléatoire
3. Chiffre le texte avec AES-128
4. Ajoute un HMAC pour l'authentification
5. Encode en base64

### Déchiffrer:

```python
from app.utils.encryption import decrypt_data

encrypted = "gAAAAABpHj_Z9_NMIuwi6pJnc_3_Y2JBEzmvGaNb6_xbSCZ..."
decrypted = decrypt_data(encrypted)

print(decrypted)
# "IBAN: FR76 1234 5678 9012 3456 7890 123"
```

**Ce qui se passe:**
1. Fernet prend la clé `ENCRYPTION_KEY`
2. Décode le base64
3. Vérifie le HMAC (authentification)
4. Déchiffre avec AES-128
5. Retourne le texte original

### ⚠️ Sans la clé:

```python
# Avec une mauvaise clé
settings.ENCRYPTION_KEY = "MAUVAISE_CLE"

decrypt_data("gAAAAABpHj...")
# ERREUR: "Erreur déchiffrement: Invalid token"
```

**IMPOSSIBLE de déchiffrer sans la bonne clé!**

## 9.5 Utilisation dans marketplace.py

### Lors de la demande de payout (CHIFFRER):

```python
@router.post("/payouts/request")
def request_payout(payout_data: PayoutRequest, current_user: User, db: Session):
    # 1. Les infos bancaires arrivent en CLAIR
    account_details_plaintext = payout_data.account_details
    # "IBAN: FR76 1234 5678 9012..."

    # 2. CHIFFRER avant de sauvegarder
    encrypted_account_details = encrypt_data(account_details_plaintext)
    # "gAAAAABpHj_Z9_NMIuwi..."

    # 3. Sauvegarder le CHIFFRÉ dans la DB
    payout = Payout(
        organizer_id=current_user.id,
        amount=payout_data.amount,
        account_details=encrypted_account_details  # CHIFFRÉ!
    )
    db.add(payout)
    db.commit()
```

**Dans PostgreSQL:**
```sql
SELECT account_details FROM payouts WHERE id = 1;
-- "gAAAAABpHj_Z9_NMIuwi6pJnc_3_Y2JBEzmvGaNb..."
```

### Lorsque l'admin consulte (DÉCHIFFRER):

```python
@router.get("/payouts", response_model=List[PayoutAdminResponse])
def get_all_payouts(current_admin: User, db: Session):
    # 1. Charger les payouts depuis la DB
    payouts = db.query(Payout).all()

    result = []
    for payout in payouts:
        # 2. DÉCHIFFRER les infos bancaires
        decrypted_account_details = decrypt_data(payout.account_details)
        # "gAAAAABpHj..." → "IBAN: FR76 1234 5678 9012..."

        # 3. Retourner à l'admin avec les infos DÉCHIFFRÉES
        result.append(PayoutAdminResponse(
            id=payout.id,
            account_details=decrypted_account_details  # EN CLAIR pour admin!
        ))

    return result
```

**L'admin voit:**
```json
{
  "id": 1,
  "account_details": "IBAN: FR76 1234 5678 9012 3456 7890 123\nTitulaire: Jean Dupont"
}
```

---

# 10. LES WEBHOOKS STRIPE

## 10.1 C'est Quoi un Webhook?

**Définition:** Un webhook = une URL que Stripe appelle pour nous prévenir d'un événement.

**Exemple:**
```
1. CLIENT paie sur Stripe
2. Stripe traite le paiement
3. Stripe appelle notre backend: POST /webhooks/stripe
4. Notre backend confirme la registration
```

## 10.2 Le Flow Complet

```
┌─────────────────────────────────────────────────────────────┐
│ ÉTAPE 1: USER DEMANDE À S'INSCRIRE                         │
└─────────────────────────────────────────────────────────────┘
User → POST /api/v1/registrations/10/register

Backend:
1. Créer Registration (status=PENDING)
2. Créer Stripe Checkout Session
3. Retourner checkout_url

User est redirigé vers Stripe

┌─────────────────────────────────────────────────────────────┘
│ ÉTAPE 2: USER PAIE SUR STRIPE                              │
└─────────────────────────────────────────────────────────────┘
User entre sa carte bancaire sur Stripe
Stripe traite le paiement

┌─────────────────────────────────────────────────────────────┐
│ ÉTAPE 3: STRIPE ENVOIE UN WEBHOOK                          │
└─────────────────────────────────────────────────────────────┘
Stripe → POST https://mon-backend.com/webhooks/stripe
Headers: {
  "stripe-signature": "t=1234,v1=abc123..."
}
Body: {
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_test_123",
      "payment_intent": "pi_123",
      "amount_total": 5000,
      "currency": "xof"
    }
  }
}

┌─────────────────────────────────────────────────────────────┐
│ ÉTAPE 4: BACKEND TRAITE LE WEBHOOK                         │
└─────────────────────────────────────────────────────────────┘
Backend (app/api/webhooks.py):

@router.post("/stripe")
async def stripe_webhook(request: Request, db: Session):
    # 1. Récupérer le payload
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    # 2. VÉRIFIER LA SIGNATURE (SÉCURITÉ!)
    try:
        event = stripe.Webhook.construct_event(
            payload,
            sig_header,
            settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        # Payload invalide
        raise HTTPException(400, "Invalid payload")
    except stripe.error.SignatureVerificationError:
        # Signature invalide = ce n'est pas Stripe!
        raise HTTPException(400, "Invalid signature")

    # 3. Traiter selon le type
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]

        # 4. Charger la registration
        registration = db.query(Registration).filter(
            Registration.stripe_session_id == session["id"]
        ).first()

        if not registration:
            return {"status": "not found"}

        # 5. Charger l'event
        event_obj = db.query(Event).filter(
            Event.id == registration.event_id
        ).first()

        # 6. CALCULER LA COMMISSION (voir section 7)
        # ...

        # 7. CONFIRMER LA REGISTRATION
        registration.payment_status = PaymentStatus.PAID
        registration.stripe_payment_intent_id = session.get("payment_intent")

        # 8. GÉNÉRER LE QR CODE
        qr_data = f"REG-{registration.id}-{uuid.uuid4()}"
        qr_code_url = generate_qr_code(qr_data)
        registration.qr_code_data = qr_data
        registration.qr_code_url = qr_code_url

        # 9. ENVOYER L'EMAIL avec le QR code
        # ...

        # 10. SAUVEGARDER
        db.commit()

    return {"status": "success"}
```

## 10.3 La Vérification de Signature

**Pourquoi?**
Pour s'assurer que c'est vraiment Stripe qui appelle, et pas un hacker!

**Comment?**
Stripe signe chaque webhook avec `STRIPE_WEBHOOK_SECRET`.

```python
# Stripe génère la signature avec:
signature = HMAC(payload, STRIPE_WEBHOOK_SECRET)

# Nous vérifions avec:
stripe.Webhook.construct_event(payload, signature, STRIPE_WEBHOOK_SECRET)
# Si signature invalide → Exception!
```

---

# 11. LE SYSTÈME SUPERADMIN

## 11.1 Les Routes SuperAdmin

### Gestion des Utilisateurs:

```python
# Voir tous les users
GET /api/v1/superadmin/users

# Suspendre un user
POST /api/v1/superadmin/users/5/suspend
{
  "suspension_reason": "Comportement inapproprié"
}

# Promouvoir en ORGANIZER ou ADMIN
POST /api/v1/superadmin/users/5/promote
{
  "new_role": "organizer"
}

# Supprimer un user
DELETE /api/v1/superadmin/users/5
```

### Gestion des Événements:

```python
# Voir tous les events
GET /api/v1/superadmin/events

# Mettre en vedette
POST /api/v1/superadmin/events/10/feature

# Signaler (flag)
POST /api/v1/superadmin/events/10/flag
{
  "flag_reason": "Contenu suspect"
}

# Supprimer
DELETE /api/v1/superadmin/events/10
```

### Statistiques:

```python
# Stats globales
GET /api/v1/superadmin/stats
{
  "total_users": 150,
  "total_organizers": 25,
  "total_events": 80,
  "total_registrations": 450,
  "total_revenue": 2250000,
  "total_commissions": 112500
}

# Top organisateurs
GET /api/v1/superadmin/stats/top-organizers
[
  {
    "organizer_id": 5,
    "organizer_name": "Jean Dupont",
    "total_events": 15,
    "total_revenue": 750000,
    "total_commissions": 52500
  }
]
```

## 11.2 La Suspension d'Utilisateur

**Code (superadmin.py):**

```python
@router.post("/users/{user_id}/suspend")
def suspend_user(
    user_id: int,
    suspend_data: SuspendUser,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    # Charger le user
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(404, "Utilisateur introuvable")

    # Suspendre
    user.is_suspended = True
    user.suspension_reason = suspend_data.suspension_reason
    user.suspended_at = datetime.utcnow()
    user.suspended_by_admin_id = current_admin.id

    db.commit()

    return {"message": "Utilisateur suspendu"}
```

**Effet:**
Quand le user suspendu essaye de se connecter:

```python
# Dans app/api/deps.py

def get_current_user(token: str, db: Session):
    # ... vérifier token ...

    user = db.query(User).filter(User.id == user_id).first()

    # VÉRIFIER SUSPENSION
    if user.is_suspended:
        raise HTTPException(
            403,
            f"Compte suspendu. Raison: {user.suspension_reason}"
        )

    return user
```

**Résultat:**
```
HTTP 403 Forbidden
{
  "detail": "Compte suspendu. Raison: Comportement inapproprié"
}
```

---

# 12. COMMENT TOUT SE CONNECTE

## 12.1 Le Fichier main.py

**Rôle:** Point d'entrée qui assemble TOUT.

```python
from fastapi import FastAPI
from app.config.settings import settings
from app.config.database import engine, Base

# IMPORTER TOUS LES MODÈLES
from app.models import user
from app.models import event
from app.models import registration
from app.models import category
from app.models import tag
from app.models import commission
from app.models import payout

# CRÉER LES TABLES
Base.metadata.create_all(bind=engine)

# CRÉER L'APP FASTAPI
app = FastAPI(
    title=settings.PROJECT_NAME,
    docs_url="/api/docs"
)

# CONFIGURER CORS
app.add_middleware(CORSMiddleware, ...)

# ENREGISTRER LES ROUTES
from app.api import auth, users, events, marketplace, superadmin, ...

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(events.router, prefix="/api/v1/events", tags=["Events"])
app.include_router(marketplace.router, prefix="/api/v1/marketplace", tags=["Marketplace"])
app.include_router(superadmin.router, prefix="/api/v1/superadmin", tags=["SuperAdmin"])
# ... etc
```

## 12.2 Démarrage du Serveur

```bash
uvicorn app.main:app --reload
```

**Ce qui se passe:**
1. Uvicorn charge `app.main:app`
2. Python exécute `app/main.py`
3. SQLAlchemy se connecte à PostgreSQL
4. SQLAlchemy vérifie les tables existantes
5. SQLAlchemy crée les tables manquantes
6. FastAPI enregistre toutes les routes
7. Le serveur écoute sur http://localhost:8000
8. Swagger est disponible sur http://localhost:8000/api/docs

## 12.3 Le Cycle de Vie d'une Requête

```
CLIENT
  ↓ HTTP Request: POST /api/v1/events

FASTAPI (main.py)
  ↓ Route vers events.router

EVENTS.PY
  ↓ @router.post("/events")
  ↓ def create_event(...)

DEPS.PY
  ↓ get_current_user(token)
  ↓ Vérifie le token JWT
  ↓ Charge le User depuis DB
  ↓ Vérifie suspension

DATABASE.PY
  ↓ get_db()
  ↓ Crée une session SQLAlchemy

EVENTS.PY
  ↓ event = Event(...)
  ↓ db.add(event)
  ↓ db.commit()

POSTGRESQL
  ↓ INSERT INTO events (...)
  ↓ RETURNING id

EVENTS.PY
  ↓ return event

FASTAPI
  ↓ Sérialise en JSON

CLIENT
  ↓ Reçoit la réponse
```

## 12.4 Exemple Complet: Créer un Événement avec Catégorie

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CLIENT ENVOIE LA REQUÊTE                                 │
└─────────────────────────────────────────────────────────────┘
POST /api/v1/events
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "title": "Concert Rock",
  "event_type": "public",
  "event_format": "physical",
  "start_date": "2025-12-01T20:00:00",
  "end_date": "2025-12-01T23:00:00",
  "location": "Salle des fêtes",
  "city": "Lomé",
  "country_code": "TG",
  "capacity": 200,
  "is_free": false,
  "price": 5000,
  "currency": "XOF",
  "category_id": 1
}

┌─────────────────────────────────────────────────────────────┐
│ 2. FASTAPI ROUTE LA REQUÊTE                                 │
└─────────────────────────────────────────────────────────────┘
main.py → events.router (prefix="/api/v1/events")

┌─────────────────────────────────────────────────────────────┐
│ 3. EVENTS.PY TRAITE LA REQUÊTE                              │
└─────────────────────────────────────────────────────────────┘
@router.post("", status_code=201)
def create_event(
    event_data: EventCreate,                    # Valide le JSON
    current_user: User = Depends(get_current_user),  # Vérifie token
    db: Session = Depends(get_db)               # Session DB
):

┌─────────────────────────────────────────────────────────────┐
│ 4. DEPS.PY VÉRIFIE LE TOKEN                                 │
└─────────────────────────────────────────────────────────────┘
get_current_user():
  token = "eyJhbGc..."
  payload = jwt.decode(token, SECRET_KEY)  # {"user_id": 5}
  user = db.query(User).filter(User.id == 5).first()

  if user.is_suspended:
    raise HTTPException(403, "Compte suspendu")

  return user  # User(id=5, role="organizer")

┌─────────────────────────────────────────────────────────────┐
│ 5. EVENTS.PY CRÉE L'ÉVÉNEMENT                               │
└─────────────────────────────────────────────────────────────┘
# Vérifier que category_id existe
category = db.query(Category).filter(Category.id == 1).first()
if not category:
    raise HTTPException(404, "Catégorie introuvable")

# Créer l'event
event = Event(
    title="Concert Rock",
    event_type=EventType.PUBLIC,
    event_format=EventFormat.PHYSICAL,
    start_date=datetime(2025, 12, 1, 20, 0),
    end_date=datetime(2025, 12, 1, 23, 0),
    location="Salle des fêtes",
    city="Lomé",
    country_code="TG",
    capacity=200,
    available_seats=200,
    is_free=False,
    price=5000.0,
    currency="XOF",
    organizer_id=5,        # current_user.id
    category_id=1,         # Lié à la catégorie!
    status=EventStatus.DRAFT
)

db.add(event)
db.commit()
db.refresh(event)  # event.id = 10 (auto-généré)

┌─────────────────────────────────────────────────────────────┐
│ 6. POSTGRESQL EXÉCUTE                                       │
└─────────────────────────────────────────────────────────────┘
INSERT INTO events (
    title, event_type, event_format, start_date, end_date,
    location, city, country_code, capacity, available_seats,
    is_free, price, currency, organizer_id, category_id, status
) VALUES (
    'Concert Rock', 'public', 'physical', '2025-12-01 20:00:00',
    '2025-12-01 23:00:00', 'Salle des fêtes', 'Lomé', 'TG',
    200, 200, FALSE, 5000.0, 'XOF', 5, 1, 'draft'
) RETURNING id;

-- Retourne: id = 10

┌─────────────────────────────────────────────────────────────┐
│ 7. EVENTS.PY RETOURNE LA RÉPONSE                            │
└─────────────────────────────────────────────────────────────┘
return EventResponse(
    id=10,
    title="Concert Rock",
    organizer_id=5,
    category_id=1,
    ...
)

┌─────────────────────────────────────────────────────────────┐
│ 8. FASTAPI SÉRIALISE EN JSON                                │
└─────────────────────────────────────────────────────────────┘
HTTP 201 Created
Content-Type: application/json

{
  "id": 10,
  "title": "Concert Rock",
  "organizer_id": 5,
  "category_id": 1,
  "price": 5000.0,
  "currency": "XOF",
  ...
}

┌─────────────────────────────────────────────────────────────┐
│ 9. CLIENT REÇOIT LA RÉPONSE                                 │
└─────────────────────────────────────────────────────────────┘
Frontend affiche: "Événement créé avec succès!"
```

---

# 13. CONCLUSION

## 13.1 Récapitulatif de l'Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                            │
│                     (React / Vue.js)                        │
└─────────────────────────────────────────────────────────────┘
                              ↓ HTTP
┌─────────────────────────────────────────────────────────────┐
│                       FASTAPI (main.py)                     │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  Routes: auth, users, events, marketplace, etc.     │   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    SQLALCHEMY (ORM)                         │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  Models: User, Event, Registration, Category, etc.  │   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     POSTGRESQL                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  Tables: users, events, registrations, etc.         │   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 13.2 Les Concepts Clés

1. **ORM (SQLAlchemy)**: Transformer des objets Python en requêtes SQL
2. **JWT**: Authentification sans état avec tokens
3. **Foreign Keys**: Relations entre tables
4. **Enums**: Types de données restreints (ex: UserRole)
5. **Relationships**: Accès automatique aux données liées
6. **Webhooks**: Notifications asynchrones de Stripe
7. **Chiffrement**: Sécuriser les données sensibles
8. **Pydantic**: Validation des données entrantes
9. **FastAPI**: Framework web moderne et rapide
10. **Dépendances**: Injection automatique (token, DB session)

## 13.3 Points Importants à Retenir

### Modèles
- Un modèle = une table PostgreSQL
- `Column()` = définir une colonne
- `ForeignKey()` = lien vers une autre table
- `relationship()` = accès facile aux données liées

### Relations
- **One-to-Many**: Un user → plusieurs events
- **Many-to-Many**: Events ↔ Tags (avec table de liaison)
- `ondelete="CASCADE"` = suppression en cascade
- `ondelete="SET NULL"` = mettre à NULL si parent supprimé

### Routes
- `@router.get()` = Lire
- `@router.post()` = Créer
- `@router.put()` = Modifier
- `@router.delete()` = Supprimer
- `Depends()` = Injection de dépendances

### Sécurité
- Hasher les mots de passe (bcrypt)
- Utiliser JWT pour l'authentification
- Chiffrer les données sensibles (Fernet)
- Vérifier les signatures Stripe
- Vérifier les rôles (ADMIN, ORGANIZER, PARTICIPANT)

---

**Tu es maintenant PRÊT pour demain!** 🚀

Tu comprends:
- ✅ Comment les modèles créent les tables
- ✅ Comment les relations fonctionnent
- ✅ Comment l'authentification JWT marche
- ✅ Comment le chiffrement protège les données
- ✅ Comment le système de commission calcule
- ✅ Comment le système de payout fonctionne
- ✅ Comment tout se connecte ensemble

**Bonne chance pour ta présentation!** 💪
