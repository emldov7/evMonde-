# ✅ CHECKLIST COMPLÈTE BACKEND - Vérification avant Frontend

## 📋 **À vérifier dans PostgreSQL**

### **1. Décompte des places par ticket individuel**

```sql
-- Vérifier les tickets de l'événement 4
SELECT
    id,
    name,
    quantity_sold,
    quantity_available,
    (quantity_available - quantity_sold) as places_restantes,
    price,
    currency
FROM tickets
WHERE event_id = 4
ORDER BY id;
```

**Résultat attendu** :
- ✅ `quantity_sold` doit s'incrémenter pour chaque vente
- ✅ Chaque ticket track ses ventes séparément
- ✅ `quantity_sold` ≤ `quantity_available` toujours

---

### **2. Décompte des places globales de l'événement**

```sql
-- Vérifier l'événement 4
SELECT
    id,
    title,
    event_format,
    capacity,
    available_seats,
    (capacity - available_seats) as places_vendues
FROM events
WHERE id = 4;
```

**Résultat attendu** :
- ✅ `available_seats` diminue à chaque inscription confirmée
- ✅ `places_vendues` = somme de tous les `quantity_sold` des tickets

---

### **3. Vérifier les inscriptions**

```sql
-- Inscriptions confirmées
SELECT
    id,
    registration_type,
    ticket_id,
    status,
    payment_status,
    amount_paid,
    guest_email,
    user_id,
    created_at
FROM registrations
WHERE event_id = 4
ORDER BY created_at DESC;
```

**Résultat attendu** :
- ✅ Inscriptions PENDING → ne décomptent PAS les places
- ✅ Inscriptions CONFIRMED → décomptent les places
- ✅ Chaque inscription liée à un `ticket_id`

---

## 🧪 **Tests à faire manuellement**

### **Test 1 : Inscription événement PHYSIQUE (Gratuit)**

```bash
POST http://localhost:8000/api/v1/registrations/events/{event_id}/register/guest

Body:
{
  "first_name": "Test",
  "last_name": "Physique",
  "email": "test.physique@example.com",
  "ticket_id": 9,
  "country_code": "TG"
}
```

**Vérifications** :
- ✅ QR code généré
- ✅ Email envoyé
- ✅ `ticket.quantity_sold` +1
- ✅ `event.available_seats` -1
- ✅ `event_format = "in_person"`
- ✅ Email contient : location physique

---

### **Test 2 : Inscription événement HYBRIDE**

**Créer un événement hybride** :
```sql
INSERT INTO events (title, event_format, is_free, capacity, available_seats, status, is_published, organizer_id, start_date, end_date, location, city, country_code, currency, virtual_meeting_url, category_id)
VALUES
('Test Hybride', 'hybrid', true, 100, 100, 'PUBLISHED', true, 2, '2025-12-01 10:00:00', '2025-12-01 18:00:00', 'Centre Conférence', 'Lomé', 'TG', 'XOF', 'https://meet.google.com/test-hybride', 2);
```

**Ajouter un ticket** :
```sql
INSERT INTO tickets (event_id, name, price, currency, quantity_available, quantity_sold, is_active)
VALUES
((SELECT id FROM events WHERE title = 'Test Hybride'), 'Billet Unique', 0, 'XOF', 100, 0, true);
```

**Tester inscription** puis vérifier :
- ✅ Email contient : location physique ET lien virtuel
- ✅ `event_format = "hybrid"`

---

### **Test 3 : Inscription événement VIRTUEL**

**Créer un événement virtuel** :
```sql
INSERT INTO events (title, event_format, is_free, capacity, available_seats, status, is_published, organizer_id, start_date, end_date, virtual_platform, virtual_meeting_url, city, country_code, currency, category_id)
VALUES
('Webinar Tech', 'virtual', true, 500, 500, 'PUBLISHED', true, 2, '2025-12-05 14:00:00', '2025-12-05 16:00:00', 'zoom', 'https://zoom.us/j/123456789', 'En ligne', 'TG', 'XOF', 2);
```

**Ajouter un ticket** :
```sql
INSERT INTO tickets (event_id, name, price, currency, quantity_available, quantity_sold, is_active)
VALUES
((SELECT id FROM events WHERE title = 'Webinar Tech'), 'Billet Unique', 0, 'XOF', 500, 0, true);
```

**Tester inscription** puis vérifier :
- ✅ Pas de location physique dans l'email
- ✅ Lien de réunion virtuelle présent
- ✅ `event_format = "virtual"`
- ✅ `virtual_platform = "zoom"`

---

## 📧 **Vérifier envoi emails**

```sql
-- Vérifier inscriptions avec emails envoyés
SELECT
    id,
    guest_email,
    email_sent,
    email_sent_at,
    qr_code_url,
    status
FROM registrations
WHERE event_id = 4 AND status = 'CONFIRMED'
ORDER BY created_at DESC;
```

**Résultat attendu** :
- ✅ `email_sent = true` pour inscriptions CONFIRMED
- ✅ `email_sent_at` rempli
- ✅ `qr_code_url` généré

---

## 💰 **Vérifier calcul des commissions**

```sql
-- Vérifier les commissions prélevées
SELECT
    r.id as registration_id,
    r.amount_paid,
    c.commission_rate,
    c.commission_amount,
    c.net_amount,
    c.currency
FROM commission_transactions c
JOIN registrations r ON r.id = c.registration_id
WHERE r.event_id = 4
ORDER BY c.created_at DESC;
```

**Formule à vérifier** :
- ✅ `commission_amount = ticket_amount * (commission_rate / 100)`
- ✅ `net_amount = ticket_amount - commission_amount`
- ✅ Commission créée SEULEMENT pour inscriptions PAYANTES confirmées

---

## 🧹 **Nettoyage avant production**

### **Fichiers à nettoyer** :

1. **registrations.py** - Supprimer les prints de debug (lignes 623-628)
2. **stripe_service.py** - Supprimer les prints de debug (lignes 65-71)
3. **webhooks.py** - Garder les prints importants, supprimer les debug

---

## ✅ **RÉSUMÉ - Points critiques**

| Fonctionnalité | Status | Notes |
|----------------|--------|-------|
| Décompte ticket individuel | ✅ | `ticket.quantity_sold` s'incrémente |
| Décompte places globales | ✅ | `event.available_seats` décrémente |
| Validation sold-out ticket | ✅ | Bloque si `quantity_sold >= quantity_available` |
| Validation sold-out event | ✅ | Bloque si `available_seats <= 0` |
| Inscription physique | ⏳ | À tester |
| Inscription hybride | ⏳ | À tester |
| Inscription virtuelle | ⏳ | À tester |
| Emails confirmation | ⚠️ | Fonctionne mais erreur `event.format` corrigée |
| QR codes | ✅ | Générés correctement |
| Webhooks Stripe | ✅ | 200 OK, déclenchés correctement |
| Commissions | ✅ | 3% prélevés correctement |
| Inscriptions PENDING | ✅ | Ne bloquent plus les nouvelles inscriptions |

---

## 🚀 **PRÊT POUR LE FRONTEND ?**

**OUI**, si tous les tests SQL ci-dessus passent ! ✅

**Exécute les requêtes SQL dans PostgreSQL et vérifie que :**
1. Les quantités correspondent
2. Les places se décomptent correctement
3. Les emails sont envoyés (vérifie ta boîte mail)

Une fois confirmé, on attaque le frontend ce soir ! 🎉
