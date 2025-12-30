"""
Script pour créer ou mettre à jour le compte SuperAdmin
Usage: python create_superadmin.py
"""

import sys
import os

# Ajouter le répertoire parent au path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.config.database import SessionLocal
from app.models.user import User, UserRole
from passlib.context import CryptContext

# Context pour le hashing des mots de passe
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_or_update_superadmin():
    """Créer ou mettre à jour le compte SuperAdmin"""

    db = SessionLocal()

    try:
        # Données du SuperAdmin
        email = "admin@evmonde.com"
        password = "Admin123!"  # Mot de passe : Admin123!

        print("\n" + "="*60)
        print("CREATION/MISE A JOUR DU COMPTE SUPERADMIN")
        print("="*60)

        # Vérifier si le compte existe déjà
        existing_admin = db.query(User).filter(User.email == email).first()

        if existing_admin:
            print(f"\n[INFO] Compte existant trouvé : {email}")
            print("[INFO] Mise à jour du mot de passe...")

            # Mettre à jour le mot de passe et le rôle
            existing_admin.hashed_password = pwd_context.hash(password)
            existing_admin.role = UserRole.ADMIN
            existing_admin.is_active = True
            existing_admin.is_verified = True
            existing_admin.is_suspended = False

            db.commit()
            print("[OK] Mot de passe mis à jour avec succès !")
        else:
            print(f"\n[INFO] Création d'un nouveau compte : {email}")

            # Créer un nouveau SuperAdmin
            admin = User(
                email=email,
                hashed_password=pwd_context.hash(password),
                first_name="Super",
                last_name="Admin",
                role=UserRole.ADMIN,
                country_code="TG",
                country_name="Togo",
                phone_country_code="+228",
                phone="90000000",
                phone_full="+22890000000",
                preferred_language="fr",
                is_active=True,
                is_verified=True,
                is_suspended=False
            )

            db.add(admin)
            db.commit()
            db.refresh(admin)

            print(f"[OK] Compte créé avec succès ! (ID: {admin.id})")

        print("\n" + "="*60)
        print("INFORMATIONS DE CONNEXION")
        print("="*60)
        print(f"Email    : {email}")
        print(f"Password : {password}")
        print("="*60 + "\n")

    except Exception as e:
        print(f"\n[ERROR] Erreur : {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    create_or_update_superadmin()
