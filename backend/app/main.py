"""
Fichier principal de l'application FastAPI
C'est le point d'entrée de notre API
"""

import os

# CRITICAL FIX: Forcer l'encodage UTF-8 pour résoudre les problèmes Windows avec psycopg2
# Cela doit être fait AVANT tout autre import
os.environ['PGCLIENTENCODING'] = 'UTF8'
os.environ['PGSYSCONFDIR'] = ''
os.environ['PGSERVICEFILE'] = ''

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config.settings import settings
from app.config.database import engine, Base

# IMPORTANT : Importer tous les modèles AVANT de créer les tables
# Sinon SQLAlchemy ne sait pas quelles tables créer !
from app.models import user  # Importer le modèle User
from app.models import event  # Importer le modèle Event
from app.models import registration  # Importer le modèle Registration
from app.models import category  # Importer le modèle Category
from app.models import tag  # Importer le modèle Tag
from app.models import commission  # Importer les modèles Commission
from app.models import payout  # Importer le modèle Payout
from app.models import ticket  # Importer le modèle Ticket
from app.models import notification_preferences  # Importer le modèle NotificationPreferences
from app.models import notification  # Importer le modèle Notification (in-app)
from app.models import event_reminder  # Importer le modèle EventReminder

# Créer toutes les tables dans PostgreSQL
# Cette ligne crée automatiquement toutes les tables définies dans nos modèles
Base.metadata.create_all(bind=engine)


# ÉTAPE 1 : Créer l'application FastAPI
app = FastAPI(
    title=settings.PROJECT_NAME,  # Nom de l'application
    version=settings.VERSION,     # Version
    description="API de gestion d'événements - Backend FastAPI",
    docs_url="/api/docs",     #On peut tester le doc ici quand on lancera l'application    # URL de la documentation Swagger : http://localhost:8000/api/docs
    redoc_url="/api/redoc"        # URL de la documentation ReDoc : http://localhost:8000/api/redoc
)


reminder_scheduler = None
waitlist_scheduler = None


@app.on_event("startup")
def _start_background_schedulers():
    global reminder_scheduler
    global waitlist_scheduler
    try:
        from app.services.reminder_scheduler import start_reminder_scheduler
        reminder_scheduler = start_reminder_scheduler()
    except Exception as e:
        print(f"⚠️ Impossible de démarrer le scheduler de rappels: {e}")

    try:
        from app.services.waitlist_scheduler import start_waitlist_scheduler
        waitlist_scheduler = start_waitlist_scheduler()
    except Exception as e:
        print(f"⚠️ Impossible de démarrer le scheduler de waitlist: {e}")


@app.on_event("shutdown")
def _shutdown_background_schedulers():
    global reminder_scheduler
    global waitlist_scheduler
    try:
        if reminder_scheduler:
            reminder_scheduler.shutdown(wait=False)
            reminder_scheduler = None
    except Exception as e:
        print(f"⚠️ Erreur arrêt scheduler de rappels: {e}")

    try:
        if waitlist_scheduler:
            waitlist_scheduler.shutdown(wait=False)
            waitlist_scheduler = None
    except Exception as e:
        print(f"⚠️ Erreur arrêt scheduler de waitlist: {e}")


# ÉTAPE 2 : Configurer le CORS (Cross-Origin Resource Sharing)
# Le CORS permet au frontend React (sur un autre port) de communiquer avec le backend
# Sans cela, sa bloque
app.add_middleware(
    CORSMiddleware,
    allow_origins=[   # Ici je met la liste des urls que j'autorise, coté frontend
        settings.FRONTEND_URL,  # URL du frontend (ex: http://localhost:3000)
        "http://localhost:3000",
        "http://localhost:5173",  # Vite (autre outil pour React)
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$" if settings.ENVIRONMENT == "development" else None,
    allow_credentials=True,  # Autoriser les cookies
    allow_methods=["*"],     # Autoriser toutes les méthodes HTTP (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],     # Autoriser tous les headers
)


# ÉTAPE 3 : Route de base pour tester que l'API fonctionne
@app.get("/")
def read_root():  #Ici, @app.get("/") transforme read_root() en une route API
    # Sa ajoute d'autres fonctionnalité a notre fonction
    """
    Route de base - Test de l'API

    Appeler : GET http://localhost:8000/
    Retourne : Message de bienvenue avec la version
    """
    return {
        "message": "Bienvenue sur l'API de gestion d'événements !",
        "version": settings.VERSION,
        "docs": "/api/docs",
        "status": "running"
    }


# ÉTAPE 4 : Route de santé (Health Check)
@app.get("/health") #Verifie si L'API fonctionne
def health_check():
    """
    Route de santé - Vérifier que l'API fonctionne

    Utilisée par les services de monitoring pour vérifier que l'API est en ligne
    """
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT
    }


# ÉTAPE 5 : Route pour récupérer la liste des pays
@app.get("/api/v1/countries")
def get_countries():
    """
    Récupère la liste de tous les pays supportés

    Cette route sera appelée par le frontend pour afficher
    le dropdown de sélection du pays

    Retourne :
    [
        {"code": "TG", "name": "Togo", "phone_code": "+228", "currency": "XOF"},
        {"code": "CA", "name": "Canada", "phone_code": "+1", "currency": "CAD"},
        {"code": "FR", "name": "France", "phone_code": "+33", "currency": "EUR"}
    ]
    """
    from app.utils.countries import get_all_countries
    return get_all_countries()


# ÉTAPE 6 : Inclure les routes d'authentification
from app.api import auth

# Enregistrer le routeur d'authentification
# prefix = le préfixe des routes (/api/v1)
# tags = catégorie dans la documentation Swagger
app.include_router(
    auth.router,
    prefix=f"{settings.API_V1_PREFIX}/auth",  # Routes : /api/v1/auth/register, /api/v1/auth/login
    tags=["Authentication"]  # Catégorie "Authentication" dans Swagger
)


# ÉTAPE 7 : Inclure les routes utilisateur
from app.api import users

# Enregistrer le routeur utilisateur
app.include_router(
    users.router,
    prefix=f"{settings.API_V1_PREFIX}/users",  # Routes : /api/v1/users/me
    tags=["Users"]  # Catégorie "Users" dans Swagger
)


# ÉTAPE 8 : Inclure les routes événements
from app.api import events

# Enregistrer le routeur événements
app.include_router(
    events.router,
    prefix=f"{settings.API_V1_PREFIX}/events",  # Routes : /api/v1/events
    tags=["Events"]  # Catégorie "Events" dans Swagger
)


# ÉTAPE 9 : Inclure les routes upload
from app.api import upload
from fastapi.staticfiles import StaticFiles

# Enregistrer le routeur upload
app.include_router(
    upload.router,
    prefix=f"{settings.API_V1_PREFIX}/upload",  # Routes : /api/v1/upload
    tags=["Upload"]  # Catégorie "Upload" dans Swagger
)

# Servir les fichiers statiques (images uploadées)
# Permet d'accéder aux images via HTTP
# Exemple : http://localhost:8000/uploads/events/photo_123.jpg
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


# ÉTAPE 10 : Inclure les routes inscriptions
from app.api import registrations

# Enregistrer le routeur inscriptions
app.include_router(
    registrations.router,
    prefix=f"{settings.API_V1_PREFIX}/registrations",  # Routes : /api/v1/registrations
    tags=["Registrations"]  # Catégorie "Registrations" dans Swagger
)


# ÉTAPE 11 : Inclure les routes webhooks
from app.api import webhooks

# Enregistrer le routeur webhooks
app.include_router(
    webhooks.router,
    prefix=f"{settings.API_V1_PREFIX}/webhooks",  # Routes : /api/v1/webhooks/stripe
    tags=["Webhooks"]  # Catégorie "Webhooks" dans Swagger
)


# ÉTAPE 12 : Inclure les routes admin (dashboard organisateur)
from app.api import admin

# Enregistrer le routeur admin
app.include_router(
    admin.router,
    prefix=f"{settings.API_V1_PREFIX}/admin",  # Routes : /api/v1/admin
    tags=["Admin"]  # Catégorie "Admin" dans Swagger
)


# ÉTAPE 13 : Inclure les routes superadmin (gestion plateforme)
from app.api import superadmin

# Enregistrer le routeur superadmin
app.include_router(
    superadmin.router,
    prefix=f"{settings.API_V1_PREFIX}/superadmin",  # Routes : /api/v1/superadmin
    tags=["SuperAdmin"]  # Catégorie "SuperAdmin" dans Swagger
)


# ÉTAPE 14 : Inclure les routes marketplace (commission, payouts, catégories, tags)
from app.api import marketplace

# Enregistrer le routeur marketplace
app.include_router(
    marketplace.router,
    prefix=f"{settings.API_V1_PREFIX}/marketplace",  # Routes : /api/v1/marketplace
    tags=["Marketplace"]  # Catégorie "Marketplace" dans Swagger
)


# ÉTAPE 15 : Inclure les routes notifications (préférences)
from app.api import notifications

app.include_router(
    notifications.router,
    prefix=f"{settings.API_V1_PREFIX}/notifications",  # Routes : /api/v1/notifications/preferences
    tags=["Notifications"]
)


# Point d'entrée pour lancer l'application avec Uvicorn
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",      # Chemin vers l'application
        host="0.0.0.0",      # Écouter sur toutes les interfaces réseau
        port=8000,           # Port 8000
        reload=True          # Redémarrer automatiquement quand le code change (mode développement)
    )
