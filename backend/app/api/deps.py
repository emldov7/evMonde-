"""
Dépendances FastAPI - Fonctions réutilisables pour les routes

Ce fichier contient les dépendances utilisées dans les routes API. C'est quoi une dépendance FastAPI ?
C'est une fonction qui s'exécute avant la fonction de la route
Elle vérifie des choses (token valide ? utilisateur connecté ?) avant de laisser passer
"""

from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.config.database import get_db
from app.utils.security import decode_access_token
from app.models.user import User
from app.schemas.user import TokenData


# ÉTAPE 1 : Configurer OAuth2 avec Bearer Token
# OAuth2PasswordBearer dit à FastAPI : "Le token est dans le header Authorization: Bearer <token>"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
#Il extrait automatiquement le token du header
# tokenUrl = l'URL où l'utilisateur se connecte pour obtenir un token


# DÉPENDANCE 1 : Obtenir l'utilisateur connecté depuis le token JWT
def get_current_user(
    token: str = Depends(oauth2_scheme),  # Récupère le token depuis le header
    db: Session = Depends(get_db)  # Récupère une session de base de données
) -> User:
    """
    Dépendance qui récupère l'utilisateur connecté depuis le token JWT

    Cette fonction est utilisée dans les routes protégées pour vérifier
    que l'utilisateur est bien connecté et récupérer ses informations.

    Exemple d'utilisation dans une route :
        @app.get("/users/me")
        def get_my_profile(current_user: User = Depends(get_current_user)):
            return current_user

    Flow :
    1. Le frontend envoie : Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
    2. oauth2_scheme extrait le token : "eyJhbGciOiJIUzI1NiIs..."
    3. decode_access_token() décode le token
    4. On récupère user_id depuis le token
    5. On cherche l'utilisateur dans la base de données
    6. On retourne l'utilisateur à la route

    Args:
        token: Le token JWT extrait du header Authorization
        db: La session de base de données

    Returns:
        L'utilisateur connecté (objet User)

    Raises:
        HTTPException 401: Si le token est invalide ou si l'utilisateur n'existe pas
    """
    # Exception à lever si les credentials sont invalides
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Impossible de valider les credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Décoder le token JWT
    payload = decode_access_token(token)

    if payload is None:
        # Token invalide ou expiré
        raise credentials_exception

    # Récupérer le user_id depuis le token
    user_id: Optional[int] = payload.get("user_id")

    if user_id is None:
        # Le token ne contient pas de user_id
        raise credentials_exception

    # Chercher l'utilisateur dans la base de données
    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        # L'utilisateur n'existe pas (peut-être supprimé)
        raise credentials_exception

    if not user.is_active:
        # L'utilisateur est désactivé par l'admin
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Utilisateur désactivé"
        )

    if user.is_suspended:
        # L'utilisateur est suspendu par l'admin
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Compte suspendu. Raison : {user.suspension_reason or 'Non spécifiée'}"
        )

    # Tout est OK ! On retourne l'utilisateur
    return user


# DÉPENDANCE 2 : Vérifier que l'utilisateur est un administrateur
def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dépendance qui vérifie que l'utilisateur connecté est un administrateur

    Cette fonction est utilisée dans les routes réservées aux admins.

    Exemple d'utilisation :
        @app.delete("/users/{user_id}")
        def delete_user(
            user_id: int,
            current_admin: User = Depends(get_current_admin)
        ):
            # Seuls les admins peuvent supprimer des utilisateurs
            db.delete(user)
            return {"message": "Utilisateur supprimé"}

    Args:
        current_user: L'utilisateur connecté (récupéré par get_current_user)

    Returns:
        L'utilisateur (qui est un admin)

    Raises:
        HTTPException 403: Si l'utilisateur n'est pas un admin
    """
    from app.models.user import UserRole

    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="🚫 Accès refusé : Vous devez être administrateur pour accéder à cette ressource"
        )
    return current_user


# DÉPENDANCE 3 : Vérifier que l'utilisateur est un organisateur ou un admin
def get_current_organizer_or_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dépendance qui vérifie que l'utilisateur est un organisateur ou un admin

    Cette fonction est utilisée dans les routes de gestion d'événements.

    Exemple d'utilisation :
        @app.post("/events")
        def create_event(
            event_data: EventCreate,
            current_user: User = Depends(get_current_organizer_or_admin)
        ):
            # Seuls les organisateurs et admins peuvent créer des événements
            new_event = Event(**event_data.dict(), organizer_id=current_user.id)
            db.add(new_event)
            return new_event

    Args:
        current_user: L'utilisateur connecté

    Returns:
        L'utilisateur (qui est organisateur ou admin)

    Raises:
        HTTPException 403: Si l'utilisateur n'est ni organisateur ni admin
    """
    if current_user.role not in ["organizer", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous devez être organisateur ou administrateur"
        )
    return current_user


# DÉPENDANCE 4 : Obtenir l'utilisateur connecté (optionnel)
#SA FONCTIONNE AVEC OU SANS UTILISATEUR CONNECTÉ
def get_current_user_optional(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Dépendance qui récupère l'utilisateur connecté, mais ne renvoie pas d'erreur
    s'il n'est pas connecté (retourne None à la place)

    Utilisée pour les routes qui fonctionnent différemment selon que l'utilisateur
    est connecté ou non.

    Exemple d'utilisation :
        @app.get("/events")
        def get_events(current_user: Optional[User] = Depends(get_current_user_optional)):
            if current_user:
                # Utilisateur connecté : afficher aussi ses événements privés
                events = db.query(Event).filter(Event.organizer_id == current_user.id).all()
            else:
                # Utilisateur non connecté : afficher seulement les événements publics
                events = db.query(Event).filter(Event.is_public == True).all()
            return events

    Args:
        token: Le token JWT (optionnel)
        db: La session de base de données

    Returns:
        L'utilisateur connecté ou None
    """
    if not token:
        return None

    payload = decode_access_token(token)
    if payload is None:
        return None

    user_id = payload.get("user_id")
    if user_id is None:
        return None

    user = db.query(User).filter(User.id == user_id).first()
    return user
