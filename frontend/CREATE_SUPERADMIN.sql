-- ================================================
-- CRÉER UN UTILISATEUR SUPERADMIN POUR TESTER
-- ================================================
--
-- Cette requête SQL crée un compte SuperAdmin pour tester
-- la connexion au frontend React.
--
-- IMPORTANT : Le mot de passe est HASHÉ avec bcrypt.
-- On ne peut PAS stocker "123456" en clair dans la base !
--
-- Le hash ci-dessous correspond au mot de passe : "Admin123!"
-- Tu pourras te connecter avec :
-- Email : superadmin@evmonde.com
-- Password : Admin123!

-- Insérer l'utilisateur SuperAdmin
INSERT INTO users (
  email,
  hashed_password,
  first_name,
  last_name,
  role,
  country_code,
  country_name,
  phone_country_code,
  phone,
  phone_full,
  preferred_language,
  is_active,
  is_verified,
  is_suspended,
  created_at,
  updated_at
)
VALUES (
  'superadmin@evmonde.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5RA0WqOId3jqm',
  'Super',
  'Admin',
  'ADMIN',
  'TG',
  'Togo',
  '+228',
  '90000000',
  '+22890000000',
  'fr',
  true,
  true,
  false,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;  -- Si l'email existe déjà, ne rien faire

-- Vérifier que l'utilisateur a bien été créé
SELECT id, email, first_name, last_name, role, is_active
FROM users
WHERE email = 'superadmin@evmonde.com';


Email : superadmin@evmonde.com
admin@evmonde.com
Password : Admin123!

-- ================================================
-- COMMENT OBTENIR UN NOUVEAU HASH DE MOT DE PASSE ?
-- ================================================
--
-- Si tu veux changer le mot de passe, utilise Python :
--
-- python
-- from passlib.context import CryptContext
-- pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
-- print(pwd_context.hash("TonMotDePasse"))
--
-- Copie le résultat et remplace le hashed_password ci-dessus.

-- ================================================
-- IDENTIFIANTS DE CONNEXION
-- ================================================
--
-- Email : superadmin@evmonde.com
-- Password : Admin123!
--
-- Une fois cet utilisateur créé, tu pourras te connecter
-- sur le frontend React avec ces identifiants.
