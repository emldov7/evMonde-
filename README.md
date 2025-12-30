# 🎉 evMonde - Plateforme de Gestion d'Événements

Une plateforme moderne et complète de gestion d'événements avec interface SuperAdmin ultra-premium, système de commissions et gestion des payouts.

## 📋 Table des Matières

- [Fonctionnalités](#-fonctionnalités)
- [Technologies](#-technologies)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Lancement](#-lancement)
- [Comptes de Test](#-comptes-de-test)
- [Structure du Projet](#-structure-du-projet)
- [API Documentation](#-api-documentation)
- [Scripts Utiles](#-scripts-utiles)

---

## ✨ Fonctionnalités

### 🔐 **Authentification & Autorisation**
- Système JWT complet avec refresh tokens
- Rôles: SuperAdmin, Organisateur, Participant
- Protection des routes côté frontend et backend

### 👤 **Gestion des Utilisateurs (SuperAdmin)**
- Visualisation de tous les utilisateurs
- Suspension/Activation des comptes
- Promotion des rôles
- Statistiques détaillées

### 📅 **Gestion des Événements**
- Création d'événements (physiques, virtuels, hybrides)
- Modération et mise en vedette
- Catégories et tags personnalisables
- Gestion des inscriptions et QR codes

### 💰 **Système de Commissions**
- Commission globale configurable
- Commissions personnalisées par catégorie
- Tracking automatique des transactions
- Historique complet

### 💸 **Gestion des Payouts**
- Demandes de payout des organisateurs
- Approbation/Rejet par le SuperAdmin
- Multiples méthodes de paiement
- Suivi des statuts en temps réel

### 📊 **Statistiques & Dashboard**
- Dashboard ultra-premium avec animations
- Statistiques en temps réel
- Graphiques et métriques
- Croissance et tendances

---

## 🛠 Technologies

### **Backend**
- **FastAPI** (Python 3.12) - Framework web moderne
- **PostgreSQL** - Base de données relationnelle
- **SQLAlchemy** - ORM Python
- **Pydantic** - Validation des données
- **JWT** - Authentification sécurisée
- **Passlib + bcrypt** - Hashing des mots de passe

### **Frontend**
- **React 19.2.0** - Bibliothèque UI
- **React Router 7.1.1** - Navigation
- **Axios** - Requêtes HTTP
- **Tailwind CSS 3.4.17** - Framework CSS
- **React Icons** - Bibliothèque d'icônes
- **React Toastify** - Notifications toast

---

## 📦 Installation

### **Prérequis**
- Python 3.12+
- Node.js 18+
- PostgreSQL 14+
- Git

### **1. Cloner le projet**
```bash
git clone <repository-url>
cd evMonde
```

### **2. Configuration Backend**

```bash
cd backend

# Créer l'environnement virtuel
python -m venv venv

# Activer l'environnement (Windows)
venv\Scripts\activate

# Activer l'environnement (Linux/Mac)
source venv/bin/activate

# Installer les dépendances
pip install -r requirements.txt
```

### **3. Configuration Frontend**

```bash
cd frontend

# Installer les dépendances
npm install
```

---

## ⚙️ Configuration

### **Base de Données PostgreSQL**

1. Créer la base de données:
```sql
CREATE DATABASE evmonde_db;
```

2. Configurer `backend/.env`:
```env
# Base de données
DATABASE_URL=postgresql://postgres:votre_mot_de_passe@localhost:5432/evmonde_db

# JWT
SECRET_KEY=votre_secret_key_très_sécurisée
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS
FRONTEND_URL=http://localhost:3000
```

3. Créer les tables:
```bash
cd backend
python -c "from app.config.database import Base, engine; Base.metadata.create_all(bind=engine)"
```

---

## 🚀 Lancement

### **Méthode 1 : Lancement Manuel**

#### **Backend (Terminal 1)**
```bash
cd backend
venv\Scripts\activate  # Windows
# ou: source venv/bin/activate  # Linux/Mac
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend accessible sur: `http://localhost:8000`
Documentation API: `http://localhost:8000/docs`

#### **Frontend (Terminal 2)**
```bash
cd frontend
npm start
```

Frontend accessible sur: `http://localhost:3000`

### **Méthode 2 : Génération de Données de Test**

```bash
cd backend
venv\Scripts\python.exe seed_data.py
```

Ce script génère:
- ✅ 6 catégories (dont 3 avec commissions personnalisées)
- ✅ 8 tags
- ✅ 5 organisateurs
- ✅ 5 participants
- ✅ 8 événements variés
- ✅ 408 inscriptions
- ✅ 408 transactions de commission
- ✅ 4 demandes de payout (statuts variés)

---

## 🔐 Comptes de Test

### **SuperAdmin**
```
Email    : admin@evmonde.com
Password : Admin123!
```

### **Organisateurs**
```
Email    : jean.dupont@evmonde.com
Password : password123

Email    : marie.martin@evmonde.com
Password : password123
```

### **Participants**
```
Email    : pierre.dubois@email.com
Password : password123

Email    : emma.bernard@email.com
Password : password123
```

---

## 📁 Structure du Projet

```
evMonde/
├── backend/                    # API FastAPI
│   ├── app/
│   │   ├── api/               # Routes API
│   │   │   ├── auth.py        # Authentification
│   │   │   ├── users.py       # Gestion utilisateurs
│   │   │   ├── events.py      # Gestion événements
│   │   │   ├── categories.py  # Catégories & tags
│   │   │   ├── payouts.py     # Gestion payouts
│   │   │   └── commission.py  # Configuration commission
│   │   ├── models/            # Modèles SQLAlchemy
│   │   ├── schemas/           # Schémas Pydantic
│   │   ├── config/            # Configuration
│   │   └── utils/             # Utilitaires
│   ├── seed_data.py           # Script de génération de données
│   ├── create_superadmin.py   # Script création SuperAdmin
│   └── requirements.txt       # Dépendances Python
│
├── frontend/                   # Application React
│   ├── src/
│   │   ├── api/               # Couche API (Axios)
│   │   ├── components/        # Composants réutilisables
│   │   ├── pages/             # Pages de l'application
│   │   │   ├── superadmin/    # Pages SuperAdmin
│   │   │   │   ├── DashboardSuperAdmin.js
│   │   │   │   ├── UsersManagement.js
│   │   │   │   ├── EventsManagement.js
│   │   │   │   ├── StatsManagement.js
│   │   │   │   ├── CategoriesManagement.js
│   │   │   │   ├── PayoutsManagement.js
│   │   │   │   └── CommissionSettings.js
│   │   │   └── auth/          # Pages d'authentification
│   │   ├── App.js             # Configuration des routes
│   │   └── index.js           # Point d'entrée
│   └── package.json           # Dépendances Node
│
└── README.md                   # Ce fichier
```

---

## 📚 API Documentation

L'API est auto-documentée avec **Swagger/OpenAPI**.

### **Accès à la Documentation**
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### **Endpoints Principaux**

#### **Authentification**
```
POST   /api/v1/auth/register      - Créer un compte
POST   /api/v1/auth/login         - Se connecter
POST   /api/v1/auth/refresh       - Rafraîchir le token
POST   /api/v1/auth/logout        - Se déconnecter
GET    /api/v1/auth/me            - Obtenir l'utilisateur connecté
```

#### **Utilisateurs (SuperAdmin)**
```
GET    /api/v1/admin/users        - Liste des utilisateurs
PUT    /api/v1/admin/users/{id}/suspend    - Suspendre un utilisateur
PUT    /api/v1/admin/users/{id}/activate   - Activer un utilisateur
PUT    /api/v1/admin/users/{id}/promote    - Promouvoir un utilisateur
```

#### **Événements (SuperAdmin)**
```
GET    /api/v1/admin/events       - Liste des événements
PUT    /api/v1/admin/events/{id}/feature   - Mettre en vedette
PUT    /api/v1/admin/events/{id}/flag      - Signaler un événement
```

#### **Catégories & Tags**
```
GET    /api/v1/marketplace/categories      - Liste des catégories
POST   /api/v1/marketplace/categories      - Créer une catégorie
PUT    /api/v1/marketplace/categories/{id} - Modifier une catégorie
DELETE /api/v1/marketplace/categories/{id} - Supprimer une catégorie

GET    /api/v1/marketplace/tags            - Liste des tags
POST   /api/v1/marketplace/tags            - Créer un tag
```

#### **Payouts**
```
GET    /api/v1/marketplace/payouts         - Liste des payouts (SuperAdmin)
PUT    /api/v1/marketplace/payouts/{id}    - Traiter un payout

GET    /api/v1/marketplace/my-balance      - Solde de l'organisateur
POST   /api/v1/marketplace/payouts/request - Demander un payout
GET    /api/v1/marketplace/my-payouts      - Mes payouts
```

#### **Commission**
```
GET    /api/v1/marketplace/commission/settings     - Configuration actuelle
PUT    /api/v1/marketplace/commission/settings     - Modifier la configuration
GET    /api/v1/marketplace/commission/transactions - Historique des commissions
```

---

## 🔧 Scripts Utiles

### **Backend**

```bash
# Créer le SuperAdmin
cd backend
venv\Scripts\python.exe create_superadmin.py

# Générer des données de test
venv\Scripts\python.exe seed_data.py

# Lancer le serveur en mode développement
uvicorn app.main:app --reload

# Lancer le serveur en mode production
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### **Frontend**

```bash
# Lancer en mode développement
npm start

# Build pour la production
npm run build

# Lancer les tests
npm test
```

---

## 🎨 Design & UX

### **Couleurs Principales**
- **Bleu** (`#3B82F6`) - Actions principales
- **Purple** (`#8B5CF6`) - Événements
- **Vert** (`#10B981`) - Succès, revenus
- **Orange** (`#F59E0B`) - Commissions
- **Rouge** (`#EF4444`) - Danger, suppression
- **Jaune** (`#F59E0B`) - Avertissements, attente

### **Fonctionnalités Premium**
- ✨ Animations fluides et transitions
- 🎨 Design ultra-moderne avec gradients
- 📱 Responsive (mobile, tablet, desktop)
- 🌈 Palette de couleurs cohérente
- 💫 Effets hover sophistiqués
- 🎯 UX optimisée

---

## 📊 Statistiques du Projet

### **Backend**
- **Modèles**: 10 (User, Event, Category, Tag, Registration, Ticket, Payout, Commission, etc.)
- **Endpoints API**: 50+
- **Middlewares**: CORS, JWT, Error Handling
- **Validation**: Pydantic schemas pour toutes les requêtes

### **Frontend**
- **Pages**: 8 pages SuperAdmin + authentification
- **Composants**: 10+ composants réutilisables
- **Routes protégées**: Oui (JWT + Guards)
- **Gestion d'état**: React Hooks (useState, useEffect)

---

## 🚀 Données Générées (Seed Script)

Le script `seed_data.py` génère automatiquement:

### **Utilisateurs**
- 1 SuperAdmin
- 5 Organisateurs (France, Sénégal)
- 5 Participants

### **Catégories (avec commissions personnalisées)**
- 🎵 **Musique** - Commission: 7%
- 🎤 **Conférences** - Commission: 5% (globale)
- ⚽ **Sport** - Commission: 10%
- 💻 **Tech** - Commission: 5% (globale)
- 🎨 **Art & Culture** - Commission: 6%
- 💼 **Business** - Commission: 5% (globale)

### **Événements**
- Festival Jazz International 2025
- Tech Summit Africa 2025
- Marathon de Dakar 2025
- Exposition Art Contemporain
- Startup Pitch Night
- Concert Youssou N'Dour - Live
- Webinaire: Future of AI in Africa
- Formation Leadership & Management

### **Finances**
- **Revenus totaux**: 5,825,000 XOF
- **Commissions prélevées**: 340,500 XOF
- **Taux moyen**: 5.8%
- **408 inscriptions** générées

---

## 🐛 Dépannage

### **Problème: Port 8000 déjà utilisé**
```bash
# Trouver le processus
netstat -ano | findstr :8000

# Tuer le processus (Windows)
taskkill /PID <PID> /F
```

### **Problème: Connexion à PostgreSQL échoue**
- Vérifier que PostgreSQL est démarré
- Vérifier les identifiants dans `.env`
- Vérifier que la base de données `evmonde_db` existe

### **Problème: npm start échoue**
```bash
# Supprimer node_modules et réinstaller
rm -rf node_modules package-lock.json
npm install
```

---

## 📝 Licence

Ce projet est sous licence MIT.

---

## 👥 Contributeurs

- **Développeur Principal**: Équipe evMonde

---

## 📞 Support

Pour toute question ou problème:
- 📧 Email: support@evmonde.com
- 💬 Discord: [Lien vers Discord]
- 📚 Documentation: `http://localhost:8000/docs`

---

## 🎉 Remerciements

Merci d'utiliser evMonde ! 🚀

---

**Dernière mise à jour**: Novembre 2025
**Version**: 1.0.0
