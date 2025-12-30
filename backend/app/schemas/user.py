"""
Schemas User - Validation des données avec Pydantic
Ces schemas valident les données qui entrent et sortent de l'API
"""

from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime
from app.models.user import UserRole


# SCHEMA 1 : UserBase - Champs communs à tous les schemas
class UserBase(BaseModel):  #Ici c'est pydantic qui verifie tout et valide tout avec ses imports
    """
    Schema de base avec les champs communs
    Les autres schemas vont hériter de celui-ci
    """
    email: EmailStr  # EmailStr = validation automatique du format email
    first_name: str = Field(..., min_length=2, max_length=50)  # Minimum 2 caractères, maximum 50
    last_name: str = Field(..., min_length=2, max_length=50)
    country_code: str = Field(..., min_length=2, max_length=2)  # Code pays (ex: "TG", "CA", "FR")
    phone: str = Field(..., min_length=8, max_length=15)  # Numéro SANS l'indicatif (ex: "90123456")
    preferred_language: str = Field(default="fr", pattern="^(fr|en)$")  # Seulement "fr" ou "en"


# SCHEMA 2 : UserCreate - Pour créer un nouvel utilisateur (inscription)
class UserCreate(UserBase):
    """
    Schema pour créer un nouvel utilisateur
    Utilisé lors de l'inscription

    Exemple de données envoyées par le frontend :
    {
        "email": "test@test.com",
        "country_code": "FR",
        "phone": "612345678",
        "password": "MonMotDePasse123!",
        "first_name": "Jean",
        "last_name": "Dupont",
        "preferred_language": "fr",
        "role": "participant"
    }

    Note: Le backend calculera automatiquement :
    - country_name: "France" (depuis country_code)
    - phone_country_code: "+33" (depuis country_code)
    - phone_full: "+33612345678" (phone_country_code + phone)
    """
    password: str = Field(..., min_length=8)  # Mot de passe minimum 8 caractères et est obligatoire pare Field
    role: UserRole = UserRole.PARTICIPANT  # Par défaut : participant

    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        """
        Validateur personnalisé pour le mot de passe
        Vérifie que le mot de passe contient :
        - Au moins 8 caractères
        - Au moins une lettre majuscule
        - Au moins une lettre minuscule
        - Au moins un chiffre
        """
        if len(v) < 8:
            raise ValueError('Le mot de passe doit contenir au moins 8 caractères')
        if not any(char.isupper() for char in v):
            raise ValueError('Le mot de passe doit contenir au moins une majuscule')
        if not any(char.islower() for char in v):
            raise ValueError('Le mot de passe doit contenir au moins une minuscule')
        if not any(char.isdigit() for char in v):
            raise ValueError('Le mot de passe doit contenir au moins un chiffre')
        return v


# SCHEMA 3 : UserUpdate - Pour modifier un utilisateur existant
class UserUpdate(BaseModel):
    """
    Schema pour mettre à jour un utilisateur
    Tous les champs sont optionnels (on peut modifier juste le prénom par exemple)

    Exemple :
    {
        "first_name": "Jean-Pierre"
    }
    """
    # Optional ici =>  on peut modifier un seul
    email: Optional[EmailStr] = None
    country_code: Optional[str] = Field(None, min_length=2, max_length=2)
    phone: Optional[str] = Field(None, min_length=8, max_length=15)
    first_name: Optional[str] = Field(None, min_length=2, max_length=50)
    last_name: Optional[str] = Field(None, min_length=2, max_length=50)
    preferred_language: Optional[str] = Field(None, pattern="^(fr|en)$")
    password: Optional[str] = Field(None, min_length=8)

    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        """Même validation que UserCreate"""
        if v is None:  # Si pas de nouveau mot de passe, on skip
            return v
        if len(v) < 8:
            raise ValueError('Le mot de passe doit contenir au moins 8 caractères')
        if not any(char.isupper() for char in v):
            raise ValueError('Le mot de passe doit contenir au moins une majuscule')
        if not any(char.islower() for char in v):
            raise ValueError('Le mot de passe doit contenir au moins une minuscule')
        if not any(char.isdigit() for char in v):
            raise ValueError('Le mot de passe doit contenir au moins un chiffre')
        return v


# SCHEMA 4 : UserInDB - Représentation de l'utilisateur dans la base de données
class UserInDB(UserBase):
    """
    Schema représentant un utilisateur tel qu'il est stocké dans PostgreSQL
    Contient tous les champs de la table (sauf le mot de passe)
    """
    id: int
    country_name: str  # Nom complet du pays (ex: "Togo")
    phone_country_code: str  # Indicatif (ex: "+228")
    phone_full: str  # Numéro complet (ex: "+22890123456")
    role: UserRole
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        """
        Configuration Pydantic :
        - from_attributes=True : permet de créer un schema depuis un modèle SQLAlchemy

        Exemple :
        user_db = db.query(User).first()  # Objet SQLAlchemy
        user_schema = UserInDB.from_orm(user_db)  # Converti en schema Pydantic
        """
        from_attributes = True


# SCHEMA 5 : UserResponse - Ce qui est renvoyé au frontend
class UserResponse(UserInDB):
    """
    Schema pour la réponse API
    C'est ce que le frontend reçoit après une requête

    Hérite de UserInDB mais on pourrait cacher certains champs si besoin
    """
    pass


# SCHEMA 6 : UserLogin - Pour la connexion
class UserLogin(BaseModel):
    """
    Schema pour se connecter
    L'utilisateur peut se connecter avec son email ou son téléphone

    Exemple :
    {
        "email_or_phone": "test@test.com",
        "password": "MonMotDePasse123!"
    }
    """
    email_or_phone: str  # Peut être un email ou un numéro de téléphone
    password: str


# SCHEMA 7 : Token - Pour la réponse après connexion
class Token(BaseModel):
    """
    Schema pour le token JWT renvoyé après connexion réussie

    Exemple de réponse :
    {
        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "token_type": "bearer"
    }
    """
    access_token: str
    token_type: str


# SCHEMA 8 : TokenData - Données contenues dans le token
class TokenData(BaseModel):
    """
    Données décodées du token JWT
    Utilisé pour identifier l'utilisateur connecté

    Le token contient :
    - user_id : l'ID de l'utilisateur
    - role : son rôle (admin, organizer, participant)
    """
    user_id: Optional[int] = None
    role: Optional[str] = None


# SCHEMA 9 : PasswordChange - Pour changer le mot de passe
class PasswordChange(BaseModel):
    """
    Schema pour changer le mot de passe
    L'utilisateur doit fournir son ancien mot de passe et le nouveau

    Exemple :
    {
        "current_password": "AncienMotDePasse123!",
        "new_password": "NouveauMotDePasse456!"
    }
    """
    current_password: str
    new_password: str = Field(..., min_length=6)

    @field_validator('new_password')
    @classmethod
    def validate_password(cls, v):
        """
        Validateur personnalisé pour le nouveau mot de passe
        Vérifie que le mot de passe contient au moins 6 caractères
        """
        if len(v) < 6:
            raise ValueError('Le mot de passe doit contenir au moins 6 caractères')
        return v
