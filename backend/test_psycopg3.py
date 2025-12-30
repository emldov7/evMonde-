"""
Test de connexion avec psycopg (version 3) au lieu de psycopg2
psycopg v3 gère beaucoup mieux les problèmes d'encodage Windows
"""
import os
import sys

# Définir les variables d'environnement
os.environ['PGCLIENTENCODING'] = 'UTF8'

# Tester si psycopg3 est installé
try:
    import psycopg
    print("✅ psycopg (v3) est installé")
except ImportError:
    print("❌ psycopg (v3) n'est pas installé")
    print("\n💡 Pour installer psycopg v3, exécutez :")
    print("   pip uninstall psycopg2-binary -y")
    print("   pip install psycopg[binary]")
    print("\nOu gardez psycopg2 et utilisez Docker pour PostgreSQL")
    sys.exit(1)

from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv()

database_url = os.getenv("DATABASE_URL")
print(f"🔍 Test de connexion à : {database_url}")

try:
    from urllib.parse import urlparse

    result = urlparse(database_url)
    username = result.username
    password = result.password
    database = result.path[1:]
    hostname = result.hostname
    port = result.port

    print(f"\n📋 Paramètres de connexion :")
    print(f"   - Hôte : {hostname}")
    print(f"   - Port : {port}")
    print(f"   - Base de données : {database}")
    print(f"   - Utilisateur : {username}")

    print(f"\n🔌 Tentative de connexion avec psycopg v3...")

    # psycopg v3 utilise une syntaxe légèrement différente
    conn = psycopg.connect(
        host=hostname,
        port=port,
        dbname=database,
        user=username,
        password=password
    )

    print(f"✅ Connexion réussie avec psycopg v3 !")

    # Tester une requête
    cursor = conn.cursor()
    cursor.execute("SELECT version();")
    version = cursor.fetchone()
    print(f"\n🎉 PostgreSQL version : {version[0]}")

    cursor.close()
    conn.close()

    print(f"\n✅ Test de connexion terminé avec succès !")
    print(f"\n💡 psycopg v3 fonctionne ! Vous pouvez migrer votre projet.")

except Exception as e:
    print(f"\n❌ Erreur de connexion : {e}")
    print(f"\n💡 Si psycopg v3 ne fonctionne pas non plus,")
    print(f"   la meilleure solution est d'utiliser Docker pour PostgreSQL.")
