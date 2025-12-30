"""
Routes d'authentification - Inscription et Connexion
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.config.database import get_db
from app.schemas.user import UserCreate, UserResponse, Token, PasswordChange, UserUpdate
from app.models.user import User
from app.utils.security import hash_password, verify_password, create_access_token
from app.utils.countries import get_country_by_code
from app.api.deps import get_current_user


# Créer un routeur FastAPI
# Un routeur = un groupe de routes avec un préfixe commun
router = APIRouter()


# ROUTE 1 : Inscription d'un nouvel utilisateur
@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(
    user_data: UserCreate,  # Les données envoyées par le frontend
    db: Session = Depends(get_db)  # La session de base de données
):
    """
    Inscription d'un nouvel utilisateur

    Cette route permet de créer un nouveau compte utilisateur.

    Étapes :
    1. Vérifier que l'email n'existe pas déjà
    2. Vérifier que le téléphone n'existe pas déjà
    3. Récupérer les infos du pays (nom, indicatif)
    4. Hasher le mot de passe
    5. Créer l'utilisateur dans la base de données
    6. Retourner l'utilisateur créé

    Exemple de requête :
    POST /api/v1/auth/register
    {
        "email": "jean@example.com",
        "country_code": "FR",
        "phone": "612345678",
        "password": "Password123!",
        "first_name": "Jean",
        "last_name": "Dupont",
        "preferred_language": "fr",
        "role": "participant"
    }

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

    # ÉTAPE 1 : Vérifier que l'email n'existe pas déjà
    existing_user_email = db.query(User).filter(User.email == user_data.email).first()
    if existing_user_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un utilisateur avec cet email existe déjà"
        )

    # ÉTAPE 2 : Récupérer les infos du pays depuis le code pays
    country_info = get_country_by_code(user_data.country_code)
    if not country_info:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Code pays invalide : {user_data.country_code}"
        )

    # ÉTAPE 3 : Calculer le numéro de téléphone complet
    phone_full = country_info["phone_code"] + user_data.phone

    # ÉTAPE 4 : Vérifier que le téléphone n'existe pas déjà
    existing_user_phone = db.query(User).filter(User.phone_full == phone_full).first()
    if existing_user_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un utilisateur avec ce numéro de téléphone existe déjà"
        )

    # ÉTAPE 5 : Hasher le mot de passe
    hashed_password = hash_password(user_data.password)

    # ÉTAPE 6 : Créer le nouvel utilisateur
    new_user = User(
        email=user_data.email,
        country_code=user_data.country_code,
        country_name=country_info["name"],
        phone=user_data.phone,
        phone_country_code=country_info["phone_code"],
        phone_full=phone_full,
        hashed_password=hashed_password,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        role=user_data.role,
        preferred_language=user_data.preferred_language,
    )

    # ÉTAPE 7 : Ajouter l'utilisateur à la base de données
    db.add(new_user)
    db.commit()  # Valider la transaction
    db.refresh(new_user)  # Rafraîchir pour obtenir l'ID généré

    # ÉTAPE 8 : 🔥 LIAISON AUTOMATIQUE DES INSCRIPTIONS INVITÉS
    # Si cet email (case-insensitive) OU ce téléphone a déjà été utilisé pour des inscriptions invités,
    # on lie automatiquement ces inscriptions au nouveau compte.
    from app.models.registration import Registration, RegistrationType

    email_lc = (new_user.email or "").strip().lower()
    phone_full = (new_user.phone_full or "").strip()

    guest_registrations_query = db.query(Registration).filter(
        Registration.registration_type == RegistrationType.GUEST,
        Registration.user_id == None  # Pas encore liées à un compte
    )

    if email_lc and phone_full:
        guest_registrations_query = guest_registrations_query.filter(
            (func.lower(Registration.guest_email) == email_lc) | (Registration.guest_phone_full == phone_full)
        )
    elif email_lc:
        guest_registrations_query = guest_registrations_query.filter(func.lower(Registration.guest_email) == email_lc)
    elif phone_full:
        guest_registrations_query = guest_registrations_query.filter(Registration.guest_phone_full == phone_full)
    else:
        guest_registrations_query = guest_registrations_query.filter(False)

    guest_registrations = guest_registrations_query.all()

    linked_count = 0
    if guest_registrations:
        for registration in guest_registrations:
            # Lier l'inscription au nouveau compte
            registration.user_id = new_user.id
            registration.registration_type = RegistrationType.USER
            linked_count += 1

        db.commit()

    # ÉTAPE 9 : Retourner l'utilisateur créé avec le nombre d'inscriptions liées
    # Note : On ne peut pas modifier le schéma de réponse ici directement
    # mais on pourrait logger cette info ou l'ajouter dans un header
    if linked_count > 0:
        # Logger pour le debug
        print(f"✅ {linked_count} inscription(s) invité(s) liée(s) au compte de {new_user.email}")

    return new_user


# ROUTE 2 : Connexion d'un utilisateur
@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),  # Formulaire de connexion OAuth2
    db: Session = Depends(get_db)
):
    """
    Connexion d'un utilisateur

    Cette route permet à un utilisateur de se connecter et obtenir un token JWT.

    L'utilisateur peut se connecter avec son email OU son numéro de téléphone.

    Étapes :
    1. Chercher l'utilisateur par email ou téléphone
    2. Vérifier que le mot de passe est correct
    3. Vérifier que l'utilisateur est actif
    4. Créer un token JWT
    5. Retourner le token

    Exemple de requête :
    POST /api/v1/auth/login
    {
        "username": "jean@example.com",  # Peut être un email ou un téléphone
        "password": "Password123!"
    }

    Exemple de réponse :
    {
        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "token_type": "bearer"
    }

    Le frontend doit ensuite stocker ce token et l'envoyer à chaque requête :
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    """

    # ÉTAPE 1 : Chercher l'utilisateur par email ou téléphone
    # form_data.username peut être un email ou un numéro de téléphone
    user = db.query(User).filter(
        (User.email == form_data.username) | (User.phone_full == form_data.username)
    ).first()

    # ÉTAPE 2 : Vérifier que l'utilisateur existe
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email/téléphone ou mot de passe incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # ÉTAPE 3 : Vérifier le mot de passe
    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email/téléphone ou mot de passe incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # ÉTAPE 4 : Vérifier que l'utilisateur est actif
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Votre compte a été désactivé"
        )

    # ÉTAPE 5 : Créer le token JWT
    access_token = create_access_token(
        data={
            "user_id": user.id,
            "role": user.role.value  # .value pour convertir l'Enum en string
        }
    )

    # ÉTAPE 6 : Retourner le token
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


# ROUTE 3 : Récupérer le profil de l'utilisateur connecté
@router.get("/me", response_model=UserResponse)
def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    """
    Récupérer le profil de l'utilisateur connecté

    **Authentification requise**

    Retourne toutes les informations de l'utilisateur actuellement connecté.

    Exemple de requête :
    GET /api/v1/auth/me
    Headers: Authorization: Bearer <token>

    Exemple de réponse :
    {
        "id": 1,
        "email": "user@example.com",
        "first_name": "John",
        "last_name": "Doe",
        "phone": "90123456",
        "phone_full": "+22890123456",
        "country_code": "TG",
        "country_name": "Togo",
        "role": "organizer",
        ...
    }
    """
    return current_user


# ROUTE 4 : Mettre à jour le profil de l'utilisateur connecté
@router.put("/profile", response_model=UserResponse)
def update_user_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mettre à jour le profil de l'utilisateur connecté

    **Authentification requise**

    Permet de mettre à jour les informations du profil (nom, prénom, téléphone, etc.)

    Exemple de requête :
    PUT /api/v1/auth/profile
    Headers: Authorization: Bearer <token>
    {
        "first_name": "Nouveau prénom",
        "last_name": "Nouveau nom"
    }

    Exemple de réponse :
    {
        "id": 1,
        "email": "user@example.com",
        "first_name": "Nouveau prénom",
        "last_name": "Nouveau nom",
        ...
    }
    """
    from app.utils.countries import get_country_by_code

    # Extraire les données à mettre à jour (uniquement les champs fournis)
    update_data = user_update.model_dump(exclude_unset=True)

    # Si le pays change, mettre à jour le nom du pays et l'indicatif
    if "country_code" in update_data:
        country_info = get_country_by_code(update_data["country_code"])
        if country_info:
            update_data["country_name"] = country_info["name"]
            update_data["phone_country_code"] = country_info["phone_code"]

    # Si le téléphone change, recalculer le phone_full
    if "phone" in update_data or "country_code" in update_data:
        phone = update_data.get("phone", current_user.phone)
        phone_country_code = update_data.get("phone_country_code", current_user.phone_country_code)
        update_data["phone_full"] = phone_country_code + phone

    # Mettre à jour les champs du profil
    for field, value in update_data.items():
        if hasattr(current_user, field) and field != "password":
            setattr(current_user, field, value)

    # Sauvegarder
    db.commit()
    db.refresh(current_user)

    return current_user


# ROUTE 5 : Changer le mot de passe
@router.post("/change-password", response_model=dict)
def change_password(
    password_data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Changer le mot de passe de l'utilisateur connecté

    **Authentification requise**

    L'utilisateur doit fournir son mot de passe actuel et le nouveau mot de passe.

    Étapes :
    1. Vérifier que le mot de passe actuel est correct
    2. Vérifier que le nouveau mot de passe est différent de l'ancien
    3. Hasher le nouveau mot de passe
    4. Mettre à jour le mot de passe dans la base de données
    5. Retourner un message de succès

    Exemple de requête :
    POST /api/v1/auth/change-password
    Headers: Authorization: Bearer <token>
    {
        "current_password": "AncienMotDePasse123!",
        "new_password": "NouveauMotDePasse456!"
    }

    Exemple de réponse :
    {
        "message": "Mot de passe changé avec succès"
    }
    """

    # ÉTAPE 1 : Vérifier que le mot de passe actuel est correct
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le mot de passe actuel est incorrect"
        )

    # ÉTAPE 2 : Vérifier que le nouveau mot de passe est différent de l'ancien
    if verify_password(password_data.new_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le nouveau mot de passe doit être différent de l'ancien"
        )

    # ÉTAPE 3 : Hasher le nouveau mot de passe
    new_hashed_password = hash_password(password_data.new_password)

    # ÉTAPE 4 : Mettre à jour le mot de passe
    current_user.hashed_password = new_hashed_password
    db.commit()

    # ÉTAPE 5 : Retourner un message de succès
    return {
        "message": "Mot de passe changé avec succès"
    }
