"""
Script pour générer le hash du mot de passe SuperAdmin
"""
from passlib.context import CryptContext

# Configurer le contexte de hachage (même config que le backend)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Le mot de passe que nous voulons
password = "Admin123!"

# Générer le hash
hashed_password = pwd_context.hash(password)

print("=" * 80)
print("HASH DU MOT DE PASSE POUR SUPERADMIN")
print("=" * 80)
print(f"\nMot de passe : {password}")
print(f"\nHash bcrypt : {hashed_password}")
print("\n" + "=" * 80)
print("\nCopiez ce hash et utilisez-le dans la requête SQL UPDATE ci-dessous :")
print("=" * 80)
print(f"""
UPDATE users
SET hashed_password = '{hashed_password}'
WHERE email = 'superadmin@evmonde.com';
""")
print("=" * 80)

# Vérifier que le hash fonctionne
verification = pwd_context.verify(password, hashed_password)
print(f"\n✅ Vérification : {verification}")
print("\n" + "=" * 80)
