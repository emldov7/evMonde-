"""
Routes Upload - Gestion de l'upload de fichiers
"""

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status
from app.models.user import User
from app.api.deps import get_current_user
from app.utils.file_upload import save_event_image, delete_file
from pydantic import BaseModel


# Créer un routeur FastAPI
router = APIRouter()


# Schema pour la réponse d'upload
class UploadResponse(BaseModel):
    """
    Réponse après l'upload d'une image

    Contient :
    - filename : Le nom du fichier sauvegardé
    - url : L'URL complète pour accéder à l'image
    """
    filename: str
    url: str


# ROUTE 1 : Upload d'une image d'événement
@router.post("/image", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_event_image(
    file: UploadFile = File(..., description="Image de l'événement (JPG, PNG, GIF, max 5MB)"),
    current_user: User = Depends(get_current_user)  # Authentification requise
):
    """
    Uploader une image pour un événement

    **Authentification requise** : Tout utilisateur connecté

    Cette route permet d'uploader une image qui sera utilisée
    pour illustrer un événement.

    **Processus :**
    1. L'utilisateur sélectionne une image (JPG, PNG, GIF)
    2. Le backend valide l'image (extension, taille)
    3. Le backend sauvegarde l'image dans `uploads/events/`
    4. Le backend retourne l'URL de l'image
    5. L'utilisateur utilise cette URL pour créer/modifier son événement

    **Limitations :**
    - Extensions autorisées : JPG, JPEG, PNG, GIF, WEBP
    - Taille maximale : 5 MB

    **Exemple de requête :**
    ```
    POST /api/v1/upload/image
    Headers:
        Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
    Body (multipart/form-data):
        file: [fichier image]
    ```

    **Exemple de réponse :**
    ```json
    {
        "filename": "photo_a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
        "url": "http://localhost:8000/uploads/events/photo_a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg"
    }
    ```

    **Utilisation :**
    Une fois l'image uploadée, utilisez l'URL retournée dans le champ `image_url`
    lors de la création ou modification d'un événement.
    """

    # ÉTAPE 1 : Sauvegarder l'image
    # La fonction save_event_image() :
    # - Valide l'image (extension, taille)
    # - Génère un nom unique
    # - Sauvegarde dans uploads/events/
    # - Retourne le chemin relatif
    try:
        file_path = await save_event_image(file)
    except HTTPException:
        # Si validation échoue, on relance l'exception
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'upload : {str(e)}"
        )

    # ÉTAPE 2 : Construire l'URL complète
    # Exemple :
    # - file_path = "uploads/events/photo_123.jpg"
    # - url = "http://localhost:8000/uploads/events/photo_123.jpg"
    from app.config.settings import settings

    # Construire l'URL de base
    # En développement : http://localhost:8000
    # En production : https://mon-domaine.com
    base_url = settings.BACKEND_URL

    # URL complète
    image_url = f"{base_url}/{file_path}"

    # ÉTAPE 3 : Retourner la réponse
    return UploadResponse(
        filename=file.filename,
        url=image_url
    )


# ROUTE 2 : Supprimer une image (optionnel)
@router.delete("/image")
async def delete_image(
    file_path: str,
    current_user: User = Depends(get_current_user)
):
    """
    Supprimer une image

    **Authentification requise**

    Cette route permet de supprimer une image qui n'est plus utilisée.

    **Exemple :**
    ```
    DELETE /api/v1/upload/image?file_path=uploads/events/photo_123.jpg
    ```
    """

    # Supprimer le fichier
    success = delete_file(file_path)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fichier non trouvé"
        )

    return {"message": "Image supprimée avec succès"}
