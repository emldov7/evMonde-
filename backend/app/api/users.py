"""
Routes utilisateur - Gestion du profil utilisateur
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.config.database import get_db
from app.schemas.user import UserResponse, UserUpdate
from app.models.user import User
from app.api.deps import get_current_user
from app.utils.security import hash_password
from app.utils.countries import get_country_by_code


# Créer un routeur FastAPI
router = APIRouter()


# ROUTE 1 : Récupérer les informations de l'utilisateur connecté
@router.get("/me", response_model=UserResponse)
def get_my_profile(
    current_user: User = Depends(get_current_user)  # Récupère l'utilisateur depuis le token
):
    """
    Récupère les informations de l'utilisateur connecté

    Cette route est PROTÉGÉE : il faut envoyer un token JWT valide.

    Comment tester dans Swagger :
    1. Clique sur le cadenas 🔒 en haut à droite
    2. Entre ton token dans le champ "Value" (sans "Bearer ", juste le token)
    3. Clique sur "Authorize"
    4. Maintenant tu peux appeler cette route

    Exemple de requête :
    GET /api/v1/users/me
    Headers:
        Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

    Exemple de réponse :
    {
        "id": 1,
        "email": "jean@example.com",
        "first_name": "Jean",
        "last_name": "Dupont",
        "country_code": "FR",
        "country_name": "France",
        "phone": "612345678",
        "phone_country_code": "+33",
        "phone_full": "+33612345678",
        "role": "participant",
        "is_active": true,
        "is_verified": false,
        "created_at": "2025-11-18T12:34:56",
        "updated_at": "2025-11-18T12:34:56"
    }
    """
    # C'est tout ! La dépendance get_current_user fait tout le travail :
    # - Extrait le token du header
    # - Vérifie que le token est valide
    # - Récupère l'utilisateur depuis la base de données
    # - Nous donne l'objet User directement !

    return current_user


# ROUTE 2 : Mettre à jour le profil de l'utilisateur connecté
@router.put("/me", response_model=UserResponse)
def update_my_profile(
    user_update: UserUpdate,  # Les nouvelles données
    current_user: User = Depends(get_current_user),  # L'utilisateur connecté
    db: Session = Depends(get_db)  # La session de base de données
):
    """
    Met à jour les informations de l'utilisateur connecté

    Cette route permet à un utilisateur de modifier son propre profil.
    Tous les champs sont optionnels : on peut modifier juste un champ.

    Exemple de requête :
    PUT /api/v1/users/me
    Headers:
        Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
    Body:
    {
        "first_name": "Jean-Pierre",
        "preferred_language": "en"
    }

    Exemple de réponse :
    {
        "id": 1,
        "email": "jean@example.com",
        "first_name": "Jean-Pierre",  // Modifié
        "last_name": "Dupont",
        "country_code": "FR",
        "country_name": "France",
        "phone": "612345678",
        "phone_country_code": "+33",
        "phone_full": "+33612345678",
        "role": "participant",
        "is_active": true,
        "is_verified": false,
        "preferred_language": "en",  // Modifié
        "created_at": "2025-11-18T12:34:56",
        "updated_at": "2025-11-18T12:50:00"  // Date mise à jour
    }
    """

    # ÉTAPE 1 : Si l'utilisateur change son email, vérifier qu'il n'existe pas déjà
    if user_update.email and user_update.email != current_user.email:
        existing_user = db.query(User).filter(User.email == user_update.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Un utilisateur avec cet email existe déjà"
            )
        current_user.email = user_update.email

    # ÉTAPE 2 : Si l'utilisateur change son pays ou téléphone
    if user_update.country_code or user_update.phone:
        # Utiliser le nouveau country_code ou garder l'ancien
        new_country_code = user_update.country_code or current_user.country_code
        new_phone = user_update.phone or current_user.phone

        # Récupérer les infos du pays
        country_info = get_country_by_code(new_country_code)
        if not country_info:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Code pays invalide : {new_country_code}"
            )

        # Calculer le nouveau phone_full
        new_phone_full = country_info["phone_code"] + new_phone

        # Vérifier que le téléphone n'existe pas déjà
        if new_phone_full != current_user.phone_full:
            existing_user = db.query(User).filter(User.phone_full == new_phone_full).first()
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Un utilisateur avec ce numéro de téléphone existe déjà"
                )

        # Mettre à jour les champs liés au téléphone
        current_user.country_code = new_country_code
        current_user.country_name = country_info["name"]
        current_user.phone = new_phone
        current_user.phone_country_code = country_info["phone_code"]
        current_user.phone_full = new_phone_full

    # ÉTAPE 3 : Mettre à jour les autres champs
    if user_update.first_name:
        current_user.first_name = user_update.first_name

    if user_update.last_name:
        current_user.last_name = user_update.last_name

    if user_update.preferred_language:
        current_user.preferred_language = user_update.preferred_language

    # ÉTAPE 4 : Si l'utilisateur change son mot de passe
    if user_update.password:
        current_user.hashed_password = hash_password(user_update.password)

    # ÉTAPE 5 : Sauvegarder les modifications
    db.commit()  # Valider la transaction
    db.refresh(current_user)  # Rafraîchir pour obtenir les nouvelles valeurs

    return current_user


# ROUTE 3 : Devenir organisateur (Route temporaire pour le développement)
@router.post("/me/become-organizer", response_model=UserResponse)
def become_organizer(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Changer mon rôle en organisateur

    **ROUTE TEMPORAIRE POUR LE DÉVELOPPEMENT**

    Cette route permet à un utilisateur de devenir organisateur.
    En production, il faudra un processus de validation par l'admin.

    Exemple :
    - POST /api/v1/users/me/become-organizer
    """
    from app.models.user import UserRole

    # Changer le rôle en organizer
    current_user.role = UserRole.ORGANIZER

    db.commit()
    db.refresh(current_user)

    return current_user
