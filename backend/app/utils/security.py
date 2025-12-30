"""
Fonctions de sécurité : Hash des mots de passe et gestion des tokens JWT
"""

from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.config.settings import settings


# ÉTAPE 1 : Configurer le contexte de cryptage des mots de passe
# On utilise bcrypt, un algorithme très sécurisé pour hasher les mots de passe
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# FONCTION 1 : Hasher un mot de passe
#ON LE CRYPTE AVANT DE LE STOCKER DANS LA BASE DE DONNÉE
def hash_password(password: str) -> str:
    """
    Hashe (crypte) un mot de passe avec bcrypt

    Exemple:
        password = "MonMotDePasse123!"
        hashed = hash_password(password)
        # Retourne: "$2b$12$KIXkD3j5..."

    Args:
        password: Le mot de passe en clair

    Returns:
        Le mot de passe hashé (crypté)
    """
    return pwd_context.hash(password)


# FONCTION 2 : Vérifier un mot de passe
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Vérifie qu'un mot de passe en clair correspond au mot de passe hashé

    Exemple:
        plain = "MonMotDePasse123!"
        hashed = "$2b$12$KIXkD3j5..."

        if verify_password(plain, hashed):
            print("Mot de passe correct !")
        else:
            print("Mot de passe incorrect !")

    Args:
        plain_password: Le mot de passe en clair (tapé par l'utilisateur)
        hashed_password: Le mot de passe hashé (stocké dans la base de données)

    Returns:
        True si le mot de passe est correct, False sinon
    """
    return pwd_context.verify(plain_password, hashed_password)


# FONCTION 3 : Créer un token JWT (JSON Web Token)
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Crée un token JWT pour authentifier un utilisateur

    Un token JWT contient des informations sur l'utilisateur (user_id, role)
    et a une durée de validité limitée (30 minutes par défaut)

    Exemple:
        token_data = {
            "user_id": 1,
            "role": "participant"
        }

        token = create_access_token(token_data)
        # Retourne: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

        # Le frontend stocke ce token et l'envoie à chaque requête :
        # Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

    Args:
        data: Les données à encoder dans le token (user_id, role, etc.)
        expires_delta: Durée de validité du token (30 min par défaut)

    Returns:
        Le token JWT sous forme de chaîne de caractères
    """
    # Copier les données pour ne pas modifier l'original
    to_encode = data.copy()

    # Définir la date d'expiration du token
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        # Par défaut : 30 minutes (depuis .env)
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    # Ajouter la date d'expiration aux données
    to_encode.update({"exp": expire})

    # Créer le token JWT avec la clé secrète
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,  # Clé secrète depuis .env
        algorithm=settings.ALGORITHM  # Algorithme HS256
    )

    return encoded_jwt


# FONCTION 4 : Décoder un token JWT
def decode_access_token(token: str) -> Optional[dict]:
    """
    Décode un token JWT et retourne les données qu'il contient

    Exemple:
        token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

        payload = decode_access_token(token)
        # Retourne: {"user_id": 1, "role": "participant", "exp": 1234567890}

        if payload:
            user_id = payload.get("user_id")
            role = payload.get("role")
            print(f"Utilisateur {user_id} avec le rôle {role}")
        else:
            print("Token invalide ou expiré")

    Args:
        token: Le token JWT à décoder

    Returns:
        Les données contenues dans le token (dict) ou None si invalide
    """
    try:
        # Décoder le token avec la clé secrète
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        return payload
    except JWTError:
        # Token invalide ou expiré
        return None
