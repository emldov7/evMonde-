"""
Script de test de connexion à PostgreSQL
"""
import os
import sys

# IMPORTANT : Forcer l'encodage UTF-8 et désactiver les fichiers de config problématiques AVANT tout import
os.environ['PGCLIENTENCODING'] = 'UTF8'
os.environ['PYTHONIOENCODING'] = 'utf-8'
# Désactiver les fichiers de configuration PostgreSQL qui causent le problème d'encodage
os.environ['PGSYSCONFDIR'] = ''  # Pas de répertoire système
os.environ['PGSERVICEFILE'] = ''  # Pas de fichier de service

from dotenv import load_dotenv
import psycopg2

# Charger les variables d'environnement
load_dotenv()

# Récupérer l'URL de la base de données
database_url = os.getenv("DATABASE_URL")
print(f"🔍 Test de connexion à : {database_url}")

try:
    # Parser l'URL pour extraire les composants
    # Format: postgresql://username:password@host:port/database
    from urllib.parse import urlparse
    import locale
    import sys

    # Obtenir l'encodage système
    system_encoding = locale.getpreferredencoding()
    print(f"📝 Encodage système détecté : {system_encoding}")
    print(f"📝 Encodage Python stdout : {sys.stdout.encoding}")

    result = urlparse(database_url)
    username = result.username
    password = result.password
    database = result.path[1:]  # Enlever le / initial
    hostname = result.hostname
    port = result.port

    print(f"\n📋 Paramètres de connexion :")
    print(f"   - Hôte : {hostname}")
    print(f"   - Port : {port}")
    print(f"   - Base de données : {database}")
    print(f"   - Utilisateur : {username}")
    print(f"   - Mot de passe : {'*' * len(password) if password else 'Non défini'}")

    # Tenter la connexion avec options d'encodage
    print(f"\n🔌 Tentative de connexion...")

    # Essayer avec différentes approches pour contourner le problème d'encodage
    print(f"   Approche 1 : Connexion avec paramètres individuels...")

    try:
        conn = psycopg2.connect(
            host="127.0.0.1",  # Utiliser IP au lieu de localhost
            port=5432,
            database=database,
            user=username,
            password=password,
            sslmode='prefer',
            application_name='evMonde_test'
        )
        print(f"   ✅ Approche 1 réussie !")
    except Exception as e1:
        print(f"   ❌ Approche 1 échouée : {e1}")
        print(f"\n   Approche 2 : Connexion avec chaîne directe...")

        try:
            # Créer une chaîne de connexion simple sans parser l'URL
            conn_string = f"host=127.0.0.1 port=5432 dbname={database} user={username} password={password}"
            conn = psycopg2.connect(conn_string)
            print(f"   ✅ Approche 2 réussie !")
        except Exception as e2:
            print(f"   ❌ Approche 2 échouée : {e2}")
            raise e2

    print(f"✅ Connexion réussie !")

    # Tester une requête simple
    cursor = conn.cursor()
    cursor.execute("SELECT version();")
    version = cursor.fetchone()
    print(f"\n🎉 PostgreSQL version : {version[0]}")

    cursor.close()
    conn.close()

    print(f"\n✅ Test de connexion terminé avec succès !")

except Exception as e:
    print(f"\n❌ Erreur de connexion : {e}")
    print(f"\n💡 Suggestions :")
    print(f"   1. Vérifiez que PostgreSQL est démarré")
    print(f"   2. Vérifiez que la base de données '{database}' existe")
    print(f"   3. Vérifiez les identifiants dans le fichier .env")
    print(f"   4. Vérifiez que l'utilisateur '{username}' a les droits nécessaires")
