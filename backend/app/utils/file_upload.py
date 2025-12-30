"""
Utilitaire pour gérer l'upload de fichiers (images)
"""

import os
import uuid
from typing import Optional
from fastapi import UploadFile, HTTPException, status
from pathlib import Path


# Configuration des fichiers autorisés
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB en bytes

# Dossier de base pour les uploads
UPLOAD_DIR = Path("uploads")
EVENTS_DIR = UPLOAD_DIR / "events"


def validate_image_file(file: UploadFile) -> None:
    """
    Valider qu'un fichier est une image valide

    Vérifie :
    - L'extension du fichier (jpg, png, gif, etc.)
    - La taille du fichier (max 5 MB)

    Args:
        file: Le fichier uploadé

    Raises:
        HTTPException: Si le fichier est invalide
    """
    # ÉTAPE 1 : Vérifier l'extension du fichier
    # Exemple : "photo.jpg" → ".jpg"
    file_extension = Path(file.filename).suffix.lower()

    if file_extension not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Extension de fichier non autorisée. Extensions acceptées : {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"
        )

    # ÉTAPE 2 : Vérifier la taille du fichier
    # On lit le fichier pour connaître sa taille
    file.file.seek(0, 2)  # Se déplacer à la fin du fichier
    file_size = file.file.tell()  # Obtenir la position (= taille)
    file.file.seek(0)  # Revenir au début du fichier

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Fichier trop volumineux. Taille maximale : {MAX_FILE_SIZE / (1024 * 1024)} MB"
        )


def generate_unique_filename(original_filename: str) -> str:
    """
    Générer un nom de fichier unique

    Prend le nom original et ajoute un identifiant unique (UUID)
    pour éviter les conflits de noms.

    Exemple :
        "photo.jpg" → "photo_a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg"

    Args:
        original_filename: Le nom original du fichier

    Returns:
        Un nom de fichier unique
    """
    # Séparer le nom et l'extension
    # Exemple : "photo.jpg" → stem="photo", suffix=".jpg"
    path = Path(original_filename)
    stem = path.stem  # Nom sans extension
    suffix = path.suffix  # Extension (.jpg)

    # Générer un UUID unique
    # UUID = Identifiant Universellement Unique
    # Exemple : "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    unique_id = uuid.uuid4()

    # Combiner : nom_uuid.extension
    return f"{stem}_{unique_id}{suffix}"


async def save_upload_file(file: UploadFile, upload_dir: Path) -> str:
    """
    Sauvegarder un fichier uploadé sur le disque

    Args:
        file: Le fichier uploadé
        upload_dir: Le dossier de destination

    Returns:
        Le chemin relatif du fichier sauvegardé
        Exemple : "uploads/events/photo_123.jpg"
    """
    # ÉTAPE 1 : Créer le dossier s'il n'existe pas
    upload_dir.mkdir(parents=True, exist_ok=True)

    # ÉTAPE 2 : Générer un nom de fichier unique
    unique_filename = generate_unique_filename(file.filename)

    # ÉTAPE 3 : Construire le chemin complet
    # Exemple : "uploads/events/photo_123.jpg"
    file_path = upload_dir / unique_filename

    # ÉTAPE 4 : Sauvegarder le fichier
    # On lit le contenu du fichier uploadé
    # Et on l'écrit dans un nouveau fichier sur le disque
    try:
        contents = await file.read()  # Lire le contenu (bytes)

        with open(file_path, "wb") as f:  # "wb" = write binary (écriture binaire)
            f.write(contents)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la sauvegarde du fichier : {str(e)}"
        )
    finally:
        await file.close()  # Toujours fermer le fichier

    # ÉTAPE 5 : Retourner le chemin relatif
    # On retourne le chemin avec des "/" (pour les URLs)
    # Exemple : "uploads/events/photo_123.jpg"
    return str(file_path).replace("\\", "/")


async def save_event_image(file: UploadFile) -> str:
    """
    Sauvegarder une image d'événement

    Cette fonction est un wrapper qui :
    1. Valide l'image
    2. La sauvegarde dans le dossier events
    3. Retourne le chemin

    Args:
        file: L'image uploadée

    Returns:
        Le chemin relatif de l'image
    """
    # ÉTAPE 1 : Valider l'image
    validate_image_file(file)

    # ÉTAPE 2 : Sauvegarder dans le dossier events
    file_path = await save_upload_file(file, EVENTS_DIR)

    return file_path


def delete_file(file_path: str) -> bool:
    """
    Supprimer un fichier

    Utile pour supprimer une ancienne image quand on la remplace

    Args:
        file_path: Le chemin du fichier à supprimer

    Returns:
        True si supprimé, False sinon
    """
    try:
        path = Path(file_path)
        if path.exists():
            path.unlink()  # Supprimer le fichier
            return True
        return False
    except Exception as e:
        print(f"Erreur lors de la suppression du fichier {file_path}: {e}")
        return False
