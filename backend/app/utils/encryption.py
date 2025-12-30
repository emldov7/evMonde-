"""
Module de chiffrement/déchiffrement des données sensibles

Utilisé pour chiffrer les informations bancaires des organisateurs
dans les demandes de payout.

Le chiffrement utilise Fernet (AES 128-bit en mode CBC avec HMAC pour l'authentification).
"""

from cryptography.fernet import Fernet
from app.config.settings import settings
import base64
from typing import Optional


def get_encryption_key() -> bytes:
    """
    Récupère la clé de chiffrement depuis les settings

    En production, cette clé DOIT être dans les variables d'environnement (.env)
    et JAMAIS commitée sur Git!

    Returns:
        La clé de chiffrement (bytes)
    """
    # Récupérer la clé depuis les settings
    key = settings.ENCRYPTION_KEY

    # S'assurer que la clé est au bon format (32 bytes base64-encoded)
    if isinstance(key, str):
        key = key.encode()

    return key


def encrypt_data(plaintext: str) -> str:
    """
    Chiffre une chaîne de caractères

    Args:
        plaintext: Le texte en clair à chiffrer

    Returns:
        Le texte chiffré (base64-encoded string)

    Example:
        >>> encrypted = encrypt_data("IBAN: FR76 1234 5678 9012")
        >>> print(encrypted)
        'gAAAAABl...'  # Texte chiffré
    """
    if not plaintext:
        return ""

    # Créer l'objet Fernet avec la clé
    cipher = Fernet(get_encryption_key())

    # Chiffrer le texte
    encrypted_bytes = cipher.encrypt(plaintext.encode())

    # Retourner en string (déjà base64-encoded par Fernet)
    return encrypted_bytes.decode()


def decrypt_data(ciphertext: str) -> str:
    """
    Déchiffre une chaîne de caractères

    Args:
        ciphertext: Le texte chiffré (base64-encoded string)

    Returns:
        Le texte en clair

    Example:
        >>> decrypted = decrypt_data('gAAAAABl...')
        >>> print(decrypted)
        'IBAN: FR76 1234 5678 9012'
    """
    if not ciphertext:
        return ""

    # Créer l'objet Fernet avec la clé
    cipher = Fernet(get_encryption_key())

    try:
        # Déchiffrer le texte
        decrypted_bytes = cipher.decrypt(ciphertext.encode())

        # Retourner en string
        return decrypted_bytes.decode()
    except Exception as e:
        # Si le déchiffrement échoue (mauvaise clé, données corrompues, etc.)
        raise ValueError(f"Erreur lors du déchiffrement: {str(e)}")


def generate_encryption_key() -> str:
    """
    Génère une nouvelle clé de chiffrement

    ⚠️ ATTENTION: Cette fonction est utilisée UNE SEULE FOIS pour générer
    la clé initiale. La clé générée doit être sauvegardée dans .env

    Returns:
        Une clé de chiffrement (base64-encoded string)

    Example:
        >>> key = generate_encryption_key()
        >>> print(key)
        'xT8mH3kL...'  # Clé de 44 caractères
    """
    key = Fernet.generate_key()
    return key.decode()


# Pour tester le module
if __name__ == "__main__":
    # Générer une clé de test
    print("=== TEST DU MODULE DE CHIFFREMENT ===\n")

    # 1. Générer une clé
    test_key = generate_encryption_key()
    print(f"1. Clé générée: {test_key}\n")

    # 2. Tester le chiffrement
    original_text = "IBAN: FR76 1234 5678 9012 3456 7890 123\nTitulaire: Jean Dupont\nBanque: BNP Paribas"
    print(f"2. Texte original:\n{original_text}\n")

    encrypted = encrypt_data(original_text)
    print(f"3. Texte chiffré:\n{encrypted}\n")

    decrypted = decrypt_data(encrypted)
    print(f"4. Texte déchiffré:\n{decrypted}\n")

    # Vérifier que le déchiffrement est correct
    assert original_text == decrypted, "❌ Erreur: Le texte déchiffré ne correspond pas à l'original!"
    print("✅ Test réussi: Le chiffrement/déchiffrement fonctionne correctement!")
