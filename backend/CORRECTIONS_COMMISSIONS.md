# Corrections du Système de Commissions

## Date: 2025-12-26

## 📋 Problèmes Identifiés

### 1. **Commissions non calculées pour les paiements**
**Symptôme:** Les commissions affichaient 0 USD malgré des inscriptions payantes

**Cause:**
- Les commissions étaient calculées UNIQUEMENT dans le webhook Stripe ([webhooks.py:227](app/api/webhooks.py#L227))
- En développement local, le webhook n'est pas accessible
- La route `/confirm-payment` (fallback utilisé en local) ne calculait PAS les commissions

**Solution:**
- ✅ Ajouté le calcul de commission dans `/confirm-payment` ([registrations.py:1070-1122](app/api/registrations.py#L1070-L1122))
- Le système détecte automatiquement si une commission existe déjà pour éviter les doublons
- Même logique que le webhook : respect de la commission par catégorie + commission globale

### 2. **Modification des commissions par catégorie ne fonctionnait pas**
**Symptôme:**
- Commission Sport: 8% → Enregistré comme 8.0
- Commission Musique: 10% → Enregistré comme 10.0
- Impossible d'enregistrer 8.5% ou 10.2%

**Cause:**
- Le champ `custom_commission_rate` était de type `INTEGER` au lieu de `FLOAT`
- Fichier: [category.py:52](app/models/category.py#L52)

**Solution:**
- ✅ Modifié le type de `Integer` à `Float` dans le modèle
- ✅ Créé un script de migration SQL ([migrate_commission_column.sql](migrate_commission_column.sql))
- ✅ Créé un script Python pour appliquer la migration ([apply_commission_migration.py](apply_commission_migration.py))

---

## 🔧 Fichiers Modifiés

### 1. **app/api/registrations.py**
**Ligne 1070-1122:** Ajout du calcul de commission dans `/confirm-payment`

```python
# CALCUL ET ENREGISTREMENT DE LA COMMISSION
commission_settings = db.query(CommissionSettings).first()

if commission_settings and commission_settings.is_active and registration.amount_paid > 0:
    commission_rate = commission_settings.default_commission_rate

    # Appliquer la commission personnalisée de la catégorie si elle existe
    if event and event.category_id:
        category = db.query(Category).filter(Category.id == event.category_id).first()
        if category and category.custom_commission_rate is not None:
            commission_rate = category.custom_commission_rate

    # Calculer et enregistrer la commission
    commission_amount = (registration.amount_paid * commission_rate) / 100
    ...
```

### 2. **app/models/category.py**
**Ligne 10:** Ajout de l'import `Float`
```python
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Float
```

**Ligne 52:** Modification du type de colonne
```python
# AVANT
custom_commission_rate = Column(Integer, nullable=True)

# APRÈS
custom_commission_rate = Column(Float, nullable=True)
```

### 3. **Nouveaux fichiers créés**

#### `migrate_commission_column.sql`
Script SQL manuel pour modifier la colonne

#### `apply_commission_migration.py`
Script Python pour appliquer automatiquement la migration

---

## 🚀 Instructions pour Appliquer les Corrections

### Étape 1: Appliquer la migration de base de données

**Option A: Via Python (RECOMMANDÉ)**
```bash
cd c:\Users\felic\Downloads\evMonde\evMonde\backend
python apply_commission_migration.py
```

**Option B: Via SQL direct**
```bash
psql -U postgres -d evmonde_db -f migrate_commission_column.sql
```

### Étape 2: Redémarrer le backend
```bash
cd c:\Users\felic\Downloads\evMonde\evMonde\backend
venv\Scripts\activate  # Windows
# ou: source venv/bin/activate  # Linux/Mac
uvicorn app.main:app --reload
```

### Étape 3: Vérifier les commissions

1. **Modifier les commissions des catégories:**
   - Sport: 8% → Devrait accepter 8.0, 8.5, 8.9, etc.
   - Musique: 10% → Devrait accepter 10.0, 10.2, 10.5, etc.
   - Tech: (vide) → Utilise la commission globale (15%)

2. **Faire une inscription payante:**
   - Créer un événement payant (catégorie Sport)
   - S'inscrire et payer
   - Vérifier que la commission apparaît dans le dashboard SuperAdmin

3. **Vérifier dans les logs:**
```
💰 Commission: X.XX USD (8.0%) créée
```

---

## 📊 Fonctionnement du Système de Commissions

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PAIEMENT RÉUSSI                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
           ┌───────────┴────────────┐
           │                        │
           ▼                        ▼
    [WEBHOOK STRIPE]          [/confirm-payment]
    (Production)              (Développement)
           │                        │
           └───────────┬────────────┘
                       │
                       ▼
          ┌────────────────────────┐
          │ Récupérer settings     │
          │ Commission Globale: 15%│
          └────────────┬───────────┘
                       │
                       ▼
          ┌────────────────────────┐
          │ Event a une catégorie? │
          └────────────┬───────────┘
                       │
          ┌────────────┴────────────┐
          │ OUI                 NON │
          ▼                         ▼
  ┌───────────────────┐    ┌──────────────────┐
  │ Catégorie a       │    │ Utiliser         │
  │ commission        │    │ commission       │
  │ personnalisée?    │    │ globale (15%)    │
  └────────┬──────────┘    └──────────────────┘
           │
  ┌────────┴────────┐
  │ OUI         NON │
  ▼                 ▼
[8%]            [15%]
  │                 │
  └────────┬────────┘
           │
           ▼
  ┌────────────────────────┐
  │ Calculer commission    │
  │ = (montant × taux) / 100│
  └────────────┬───────────┘
               │
               ▼
  ┌────────────────────────┐
  │ Enregistrer dans       │
  │ commission_transactions│
  └────────────────────────┘
```

### Exemple de Calcul

**Événement Sport (commission: 8%)**
- Billet: 100 USD
- Commission: 100 × 8 / 100 = **8 USD**
- Net organisateur: 100 - 8 = **92 USD**

**Événement Tech (pas de commission personnalisée)**
- Billet: 100 USD
- Commission globale: 15%
- Commission: 100 × 15 / 100 = **15 USD**
- Net organisateur: 100 - 15 = **85 USD**

---

## ✅ Résultat Attendu

Après ces corrections:

1. **Dashboard SuperAdmin affichera les vraies commissions:**
   - Total Revenue: 326.01 USD ✅
   - **Commissions: XX.XX USD** (au lieu de 0 USD) ✅

2. **Modification des commissions par catégorie fonctionnera:**
   - Sport: 8.5% ✅
   - Musique: 10.2% ✅
   - Tech: (vide = 15% global) ✅

3. **Nouvelles inscriptions payantes créeront automatiquement des commissions:**
   - En production: via webhook Stripe ✅
   - En développement: via /confirm-payment ✅

---

## 🔍 Comment Vérifier que Ça Fonctionne

### 1. Vérifier la migration de la colonne
```python
from app.config.database import SessionLocal
from app.models.category import Category

db = SessionLocal()
sport = db.query(Category).filter(Category.name == "Sport").first()
print(f"Sport commission: {sport.custom_commission_rate}")  # Devrait afficher: 8.0
db.close()
```

### 2. Vérifier les commissions existantes
```python
from app.config.database import SessionLocal
from app.models.commission import CommissionTransaction
from sqlalchemy import func

db = SessionLocal()
total = db.query(func.sum(CommissionTransaction.commission_amount)).scalar() or 0
count = db.query(func.count(CommissionTransaction.id)).scalar() or 0
print(f"Total commissions: {total} USD")
print(f"Nombre de transactions: {count}")
db.close()
```

### 3. Faire un test complet
1. Créer un événement payant (catégorie Sport, billet 100 USD)
2. S'inscrire en tant qu'invité
3. Payer avec Stripe (mode test)
4. Vérifier dans les logs:
   ```
   💰 Commission: 8.00 USD (8.0%) créée
   ```
5. Vérifier dans le dashboard SuperAdmin que les commissions ont augmenté

---

## 📝 Notes Importantes

- **Les commissions ne sont créées QUE pour les événements PAYANTS** (`amount_paid > 0`)
- **Les événements gratuits ne génèrent PAS de commission** (c'est normal)
- **Les commissions par catégorie priment sur la commission globale**
- **Le système évite les doublons** : une inscription ne peut avoir qu'une seule commission
- **En production, utilisez toujours le webhook Stripe** (plus fiable que /confirm-payment)

---

## 🐛 Debugging

Si les commissions n'apparaissent toujours pas:

1. **Vérifier la configuration des commissions:**
```python
from app.models.commission import CommissionSettings
settings = db.query(CommissionSettings).first()
print(f"Active: {settings.is_active}")
print(f"Taux: {settings.default_commission_rate}%")
```

2. **Vérifier les inscriptions payées:**
```python
from app.models.registration import Registration, PaymentStatus
paid = db.query(Registration).filter(
    Registration.payment_status == PaymentStatus.PAID,
    Registration.amount_paid > 0
).count()
print(f"Inscriptions payées: {paid}")
```

3. **Vérifier les logs du backend:**
   - Rechercher: `💰 Commission`
   - Devrait afficher: `Commission: X.XX USD (Y%) créée`

---

## 👤 Auteur
Corrections effectuées le 2025-12-26

## 📞 Support
Pour toute question, vérifier:
1. Les logs du backend (`uvicorn`)
2. Les tables: `commission_settings`, `commission_transactions`, `categories`
3. Le fichier [webhooks.py](app/api/webhooks.py) pour la logique de calcul
