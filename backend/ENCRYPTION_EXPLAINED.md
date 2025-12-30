# 🔐 Chiffrement des Informations Bancaires

## Vue d'ensemble

Les informations bancaires des organisateurs sont **automatiquement chiffrées** avant d'être stockées dans la base de données PostgreSQL pour garantir la sécurité maximale.

## 📍 Où sont stockées les données?

### Dans la base de données PostgreSQL:

**Table: `payouts`**
**Colonne: `account_details`**
**Type: `TEXT`**

```sql
SELECT id, organizer_id, account_details FROM payouts;
```

**Résultat exemple:**
```
id  | organizer_id | account_details
----|--------------|--------------------------------------------------
1   | 5            | gAAAAABmX3k2L9vH8qZ... (TEXTE CHIFFRÉ - illisible)
2   | 8            | gAAAAABmX3k2M1pQ7nB... (TEXTE CHIFFRÉ - illisible)
```

### Données AVANT chiffrement (ce que l'organisateur envoie):
```
IBAN: FR76 1234 5678 9012 3456 7890 123
Titulaire: Jean Dupont
Banque: BNP Paribas
```

### Données APRÈS chiffrement (ce qui est stocké):
```
gAAAAABmX3k2L9vH8qZrT5sN8pQ3mF9vK2xL7yH8zC1aB4dE5fG6hI7jK8lM9nO0pQ1rS2tU3vW4xY5zA6bC7dE8fG9hI0jK1lM2nO3pQ4rS5tU6vW7xY8zA9bC0dE1fG2hI3jK4lM5nO6pQ7rS8tU9vW0xY1zA2bC3d...
```

**⚠️ IMPOSSIBLE À DÉCHIFFRER sans la clé de chiffrement!**

---

## 🔄 Flux complet du système

### 1️⃣ L'organisateur demande un payout

**Route:** `POST /api/v1/marketplace/payouts/request`

**Requête:**
```json
{
  "amount": 5000.0,
  "payout_method": "bank_transfer",
  "account_details": "IBAN: FR76 1234 5678 9012\nTitulaire: Jean Dupont\nBanque: BNP Paribas",
  "message": "Demande de retrait pour événements du mois"
}
```

**Ce qui se passe:**
```python
# Dans app/api/marketplace.py ligne 589-592
encrypted_account_details = encrypt_data(payout_data.account_details)
# Les données sont chiffrées avec la clé ENCRYPTION_KEY
# Résultat: "gAAAAABmX3k2L9vH8qZ..."
```

**Stockage dans PostgreSQL:**
```sql
INSERT INTO payouts (organizer_id, amount, account_details, ...)
VALUES (5, 5000.0, 'gAAAAABmX3k2L9vH8qZ...', ...);
```

---

### 2️⃣ L'admin voit la demande

**Route:** `GET /api/v1/marketplace/payouts`

**Ce qui se passe:**
```python
# Dans app/api/marketplace.py ligne 684-690
decrypted_account_details = decrypt_data(payout.account_details)
# Les données sont DÉCHIFFRÉES uniquement pour l'admin
# Résultat: "IBAN: FR76 1234 5678 9012\nTitulaire: Jean Dupont..."
```

**Réponse pour l'admin:**
```json
{
  "id": 1,
  "organizer_id": 5,
  "organizer_name": "Jean Dupont",
  "organizer_email": "jean@example.com",
  "amount": 5000.0,
  "currency": "XOF",
  "payout_method": "bank_transfer",
  "account_details": "IBAN: FR76 1234 5678 9012\nTitulaire: Jean Dupont\nBanque: BNP Paribas",
  "status": "pending"
}
```

**🔓 L'admin voit les infos bancaires EN CLAIR pour effectuer le paiement!**

---

### 3️⃣ L'organisateur voit ses demandes

**Route:** `GET /api/v1/marketplace/my-payouts`

**Réponse pour l'organisateur:**
```json
{
  "id": 1,
  "organizer_id": 5,
  "amount": 5000.0,
  "currency": "XOF",
  "status": "pending",
  "payout_method": "bank_transfer"
  // ❌ account_details N'EST PAS INCLUS pour l'organisateur
}
```

**⚠️ L'organisateur NE VOIT PAS ses propres infos bancaires dans la réponse** (pour des raisons de sécurité - elles sont déjà dans son propre système bancaire).

---

## 🔑 La clé de chiffrement

### Où est la clé?

**Fichier:** `.env`
**Variable:** `ENCRYPTION_KEY`

```bash
ENCRYPTION_KEY="asBmvu_RwiO800snxDBC_PHsEhPz6FBO60gTjR0_bdI="
```

### Génération de la clé

La clé a été générée automatiquement avec:
```python
from cryptography.fernet import Fernet
key = Fernet.generate_key()
```

### ⚠️ SÉCURITÉ CRITIQUE

1. ✅ **JAMAIS commiter .env sur Git** (déjà dans .gitignore)
2. ✅ **En production:** Utiliser des variables d'environnement serveur
3. ✅ **Sauvegarde:** Sauvegarder cette clé dans un coffre-fort sécurisé (1Password, AWS Secrets Manager, etc.)
4. ❌ **Si tu perds cette clé:** IMPOSSIBLE de déchiffrer les données!

---

## 📂 Structure des fichiers

### 1. Module de chiffrement
**Fichier:** `app/utils/encryption.py`
- `encrypt_data(plaintext)` - Chiffre une string
- `decrypt_data(ciphertext)` - Déchiffre une string
- `generate_encryption_key()` - Génère une nouvelle clé

### 2. Configuration
**Fichier:** `app/config/settings.py`
```python
class Settings(BaseSettings):
    ENCRYPTION_KEY: str  # Clé de chiffrement
```

### 3. Routes API
**Fichier:** `app/api/marketplace.py`
- Ligne 29: Import `encrypt_data`, `decrypt_data`
- Ligne 589-592: Chiffrement lors de la création de payout
- Ligne 684-690: Déchiffrement pour l'admin

### 4. Base de données
**Table:** `payouts`
**Schéma:**
```sql
CREATE TABLE payouts (
    id SERIAL PRIMARY KEY,
    organizer_id INTEGER NOT NULL,
    amount FLOAT NOT NULL,
    currency VARCHAR(3) NOT NULL,
    payout_method VARCHAR(50) NOT NULL,
    account_details TEXT,  -- 🔒 CHIFFRÉ ICI
    organizer_message TEXT,
    admin_notes TEXT,
    status VARCHAR(20) NOT NULL,
    requested_at TIMESTAMP NOT NULL,
    ...
);
```

---

## 🧪 Tester le chiffrement

### Test manuel:

```bash
cd backend
python app/utils/encryption.py
```

**Résultat attendu:**
```
=== TEST DU MODULE DE CHIFFREMENT ===

1. Clé générée: xT8mH3kL...

2. Texte original:
IBAN: FR76 1234 5678 9012 3456 7890 123
Titulaire: Jean Dupont
Banque: BNP Paribas

3. Texte chiffré:
gAAAAABmX3k2L9vH8qZ...

4. Texte déchiffré:
IBAN: FR76 1234 5678 9012 3456 7890 123
Titulaire: Jean Dupont
Banque: BNP Paribas

✅ Test réussi: Le chiffrement/déchiffrement fonctionne correctement!
```

---

## 🔐 Algorithme utilisé

**Fernet (AES 128-bit en mode CBC avec HMAC)**

- **Chiffrement symétrique:** La même clé chiffre et déchiffre
- **Authentifié:** Garantit que les données n'ont pas été modifiées
- **Horodaté:** Possibilité d'expiration des tokens (non utilisé ici)
- **Standard:** Recommandé par cryptography.io

**Avantages:**
- ✅ Très sécurisé (128-bit AES)
- ✅ Simple à utiliser
- ✅ Protection contre les modifications
- ✅ Support natif dans Python

---

## 📊 Exemple complet

### 1. Dans PostgreSQL (vue admin pgAdmin):

```sql
SELECT * FROM payouts WHERE id = 1;
```

**Résultat brut:**
```
id: 1
organizer_id: 5
amount: 5000.0
currency: XOF
payout_method: bank_transfer
account_details: gAAAAABmX3k2L9vH8qZrT5sN8pQ3mF9vK2xL7yH8zC1aB...
status: pending
```

### 2. Via l'API Admin (déchiffré):

```bash
GET /api/v1/marketplace/payouts
Authorization: Bearer <admin_token>
```

**Réponse JSON:**
```json
{
  "id": 1,
  "organizer_id": 5,
  "organizer_name": "Jean Dupont",
  "organizer_email": "jean@example.com",
  "amount": 5000.0,
  "currency": "XOF",
  "payout_method": "bank_transfer",
  "account_details": "IBAN: FR76 1234 5678 9012 3456 7890 123\nTitulaire: Jean Dupont\nBanque: BNP Paribas",
  "status": "pending"
}
```

---

## ✅ Résumé

| Aspect | Détail |
|--------|--------|
| **Où?** | Table `payouts`, colonne `account_details` |
| **Format stocké** | Texte chiffré (base64) impossible à lire |
| **Qui peut lire?** | Seulement l'admin via l'API |
| **Algorithme** | Fernet (AES-128 + HMAC) |
| **Clé** | Dans `.env` → `ENCRYPTION_KEY` |
| **Sécurité** | ⚠️ NE JAMAIS partager la clé! |

**🎉 Les informations bancaires sont maintenant 100% sécurisées!**
