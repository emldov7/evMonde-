"""
Configuration de la base de données PostgreSQL
Ce fichier gère la connexion à la base de données avec SQLAlchemy
"""

import os

# CRITICAL FIX: Forcer l'encodage UTF-8 pour résoudre les problèmes Windows avec psycopg2
# Cela doit être fait AVANT tout import de psycopg2 ou SQLAlchemy
os.environ['PGCLIENTENCODING'] = 'UTF8'
os.environ['PGSYSCONFDIR'] = ''  # Désactiver les fichiers de config système PostgreSQL
os.environ['PGSERVICEFILE'] = ''  # Désactiver le fichier de service PostgreSQL

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config.settings import settings


# ÉTAPE 1 : Créer le moteur de base de données
# Le "moteur" est la connexion principale à PostgreSQL
#C'est comme une cable USB qui relie python a PostgreSQL
engine = create_engine(
    settings.DATABASE_URL,  # URL de connexion (depuis .env)
    pool_pre_ping=True,     # Vérifier que la connexion est vivante avant de l'utiliser
    echo=settings.DEBUG,    # Afficher les requêtes SQL dans la console (en mode DEBUG)
    connect_args={
        "options": "-c client_encoding=utf8"  # Forcer l'encodage UTF-8 pour Windows
    }
)


# ÉTAPE 2 : Créer une fabrique de sessions
# Une "session" = une conversation temporaire avec la base de données
SessionLocal = sessionmaker(
    autocommit=False,  # Ne pas valider automatiquement les changements
    autoflush=False,   # Ne pas envoyer automatiquement les changements
    bind=engine        # Lier à notre moteur de base de données
)


# ÉTAPE 3 : Créer la classe de base pour tous les modèles
# Tous nos modèles (User, Event, etc.) vont hériter de cette classe
Base = declarative_base()


# ÉTAPE 4 : Fonction pour obtenir une session de base de données
def get_db():
    """
    Fonction qui crée une session de base de données pour chaque requête

    Fonctionnement :
    1. Crée une nouvelle session
    2. Donne la session à la route API
    3. Ferme automatiquement la session après utilisation

    Utilisation dans FastAPI :
    @app.get("/users")
    def get_users(db: Session = Depends(get_db)):
        # db est une session de base de données
        users = db.query(User).all()
        return users
    """
    db = SessionLocal()  # Créer une nouvelle session
    try:
        yield db  # Donner la session à la route API
    finally:
        db.close()  # Fermer la session après utilisation
