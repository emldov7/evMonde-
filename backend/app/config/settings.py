"""
Fichier de configuration de l'application
Ce fichier charge les variables d'environnement depuis le fichier .env
"""

from pydantic_settings import BaseSettings  # on importe pydantic qui va lire automatiquement notre fichier .env et on cree une classe qui va contenir toutes nos configurations
from typing import List 


class Settings(BaseSettings):
    """
    Classe de configuration qui charge automatiquement les variables
    depuis le fichier .env
    """

    # Informations de l'application
    PROJECT_NAME: str = "Plateforme de Gestion d'Événements"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"

    # Base de données PostgreSQL
    DATABASE_URL: str

    # Sécurité & Authentification
    SECRET_KEY: str  # Clé secrète pour crypter les tokens JWT
    ALGORITHM: str = "HS256"  # Algorithme de cryptage
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30  # Durée de validité du token (30 min)
    ENCRYPTION_KEY: str  # Clé pour chiffrer les données sensibles (infos bancaires)

    # Stripe (Paiements)
    STRIPE_SECRET_KEY: str
    STRIPE_PUBLISHABLE_KEY: str
    STRIPE_WEBHOOK_SECRET: str

    # Email (SMTP)
    SMTP_HOST: str
    SMTP_PORT: int
    SMTP_USER: str
    SMTP_PASSWORD: str
    EMAILS_FROM_EMAIL: str
    EMAILS_FROM_NAME: str

    # Twilio (SMS)
    TWILIO_ACCOUNT_SID: str
    TWILIO_AUTH_TOKEN: str
    TWILIO_PHONE_NUMBER: str

    # Frontend URL
    FRONTEND_URL: str

    # Backend URL (for QR codes, file uploads, webhooks, etc.)
    BACKEND_URL: str = "http://localhost:8000"

    # Environnement
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Langues supportées
    DEFAULT_LANGUAGE: str = "fr"
    SUPPORTED_LANGUAGES: str = "fr,en"

    # Devises supportées
    SUPPORTED_CURRENCIES: str = "CAD,EUR,USD,XOF"

    # Limites
    MAX_REGISTRATIONS_PER_EMAIL: int = 8

    class Config:
        """
        Configuration de Pydantic
        - env_file : indique quel fichier lire pour charger les variables
        - case_sensitive : respecte les majuscules/minuscules
        """
        env_file = ".env"
        case_sensitive = True


# Créer une instance unique de Settings qui sera utilisée partout
settings = Settings()
