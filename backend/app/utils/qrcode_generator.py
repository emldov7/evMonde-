"""
Utilitaire pour générer des QR codes pour les inscriptions
"""

import qrcode
import uuid
from pathlib import Path
from typing import Optional


# Dossier où sauvegarder les QR codes
QRCODE_DIR = Path("uploads/qrcodes")


def generate_qr_code_data() -> str:
    """
    Générer des données uniques pour un QR code

    Utilise un UUID (Universally Unique Identifier) pour garantir
    que chaque QR code est unique.

    Returns:
        str: UUID unique (ex: "a1b2c3d4-e5f6-7890-abcd-ef1234567890")

    Exemple:
        >>> data = generate_qr_code_data()
        >>> print(data)
        "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    """
    return str(uuid.uuid4())


def create_qr_code_image(data: str, filename: Optional[str] = None) -> str:
    """
    Créer une image QR code à partir de données

    Cette fonction :
    1. Génère un QR code à partir des données fournies
    2. Sauvegarde l'image dans uploads/qrcodes/
    3. Retourne le chemin relatif de l'image

    Args:
        data: Les données à encoder dans le QR code (UUID)
        filename: Nom du fichier (optionnel, utilise data si non fourni)

    Returns:
        str: Chemin relatif de l'image QR code
        Exemple: "uploads/qrcodes/a1b2c3d4-e5f6-7890.png"

    Exemple:
        >>> qr_path = create_qr_code_image("abc123")
        >>> print(qr_path)
        "uploads/qrcodes/abc123.png"
    """

    # ÉTAPE 1 : Créer le dossier s'il n'existe pas
    QRCODE_DIR.mkdir(parents=True, exist_ok=True)

    # ÉTAPE 2 : Générer le nom du fichier
    if filename is None:
        filename = f"{data}.png"
    elif not filename.endswith('.png'):
        filename = f"{filename}.png"

    # ÉTAPE 3 : Chemin complet du fichier
    file_path = QRCODE_DIR / filename

    # ÉTAPE 4 : Créer le QR code
    # QRCode parameters :
    # - version=1 : Taille du QR code (1-40, 1 = plus petit)
    # - error_correction=ERROR_CORRECT_H : Niveau de correction d'erreurs
    #   (L=7%, M=15%, Q=25%, H=30% - H permet de scanner même si abîmé)
    # - box_size=10 : Taille de chaque "boîte" du QR code en pixels
    # - border=4 : Taille de la bordure blanche autour du QR code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )

    # ÉTAPE 5 : Ajouter les données au QR code
    qr.add_data(data)
    qr.make(fit=True)

    # ÉTAPE 6 : Créer l'image
    # fill_color : Couleur du QR code (noir)
    # back_color : Couleur du fond (blanc)
    img = qr.make_image(fill_color="black", back_color="white")

    # ÉTAPE 7 : Sauvegarder l'image
    img.save(str(file_path))

    # ÉTAPE 8 : Retourner le chemin relatif (avec /)
    # Windows utilise \ mais on veut / pour les URLs
    return str(file_path).replace("\\", "/")


def generate_registration_qr_code() -> tuple[str, str]:
    """
    Générer un QR code complet pour une inscription

    Cette fonction fait tout en une fois :
    1. Génère des données uniques (UUID)
    2. Crée l'image QR code
    3. Retourne à la fois les données et le chemin de l'image

    Returns:
        tuple[str, str]: (qr_code_data, qr_code_path)
        - qr_code_data: UUID unique
        - qr_code_path: Chemin de l'image QR code

    Exemple:
        >>> data, path = generate_registration_qr_code()
        >>> print(data)
        "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
        >>> print(path)
        "uploads/qrcodes/a1b2c3d4-e5f6-7890.png"

    Utilisation dans une inscription :
        >>> registration = Registration(...)
        >>> qr_data, qr_path = generate_registration_qr_code()
        >>> registration.qr_code_data = qr_data
        >>> registration.qr_code_url = f"http://localhost:8000/{qr_path}"
    """

    # ÉTAPE 1 : Générer les données uniques
    qr_code_data = generate_qr_code_data()

    # ÉTAPE 2 : Créer l'image QR code
    qr_code_path = create_qr_code_image(qr_code_data)

    # ÉTAPE 3 : Retourner les deux
    return qr_code_data, qr_code_path


def delete_qr_code(qr_code_path: str) -> bool:
    """
    Supprimer une image QR code

    Utilisé quand une inscription est annulée ou supprimée

    Args:
        qr_code_path: Chemin de l'image à supprimer

    Returns:
        bool: True si supprimé, False sinon

    Exemple:
        >>> success = delete_qr_code("uploads/qrcodes/abc123.png")
        >>> print(success)
        True
    """
    try:
        path = Path(qr_code_path)
        if path.exists():
            path.unlink()  # Supprimer le fichier
            return True
        return False
    except Exception as e:
        print(f"Erreur lors de la suppression du QR code {qr_code_path}: {e}")
        return False
