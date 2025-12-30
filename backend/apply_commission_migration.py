"""
Script de migration pour changer le type de custom_commission_rate

Ce script modifie le type de la colonne custom_commission_rate
de INTEGER à FLOAT dans la table categories.

UTILISATION:
    python apply_commission_migration.py
"""

from app.config.database import engine
from sqlalchemy import text


def migrate_commission_column():
    """
    Modifier le type de colonne custom_commission_rate de INTEGER à FLOAT
    """

    print("="*80)
    print("MIGRATION: custom_commission_rate INTEGER → FLOAT")
    print("="*80)

    try:
        with engine.connect() as conn:
            # ÉTAPE 1 : Afficher les valeurs existantes
            print("\n📋 ÉTAPE 1 : Vérification des données existantes...")
            result = conn.execute(text("""
                SELECT id, name, custom_commission_rate
                FROM categories
                WHERE custom_commission_rate IS NOT NULL
            """))

            rows = result.fetchall()
            if rows:
                print(f"   Catégories avec commission personnalisée : {len(rows)}")
                for row in rows:
                    print(f"   - {row[1]}: {row[2]}%")
            else:
                print("   Aucune catégorie avec commission personnalisée")

            # ÉTAPE 2 : Modifier le type de colonne
            print("\n📋 ÉTAPE 2 : Modification du type de colonne...")
            conn.execute(text("""
                ALTER TABLE categories
                ALTER COLUMN custom_commission_rate TYPE DOUBLE PRECISION
                USING custom_commission_rate::DOUBLE PRECISION
            """))
            conn.commit()
            print("   ✅ Type de colonne modifié : INTEGER → DOUBLE PRECISION")

            # ÉTAPE 3 : Vérifier après migration
            print("\n📋 ÉTAPE 3 : Vérification après migration...")
            result = conn.execute(text("""
                SELECT id, name, custom_commission_rate
                FROM categories
                WHERE custom_commission_rate IS NOT NULL
            """))

            rows = result.fetchall()
            if rows:
                print(f"   ✅ Données préservées : {len(rows)} catégories")
                for row in rows:
                    print(f"   - {row[1]}: {row[2]}%")

            print("\n" + "="*80)
            print("✅ MIGRATION RÉUSSIE")
            print("="*80)
            print("\nVous pouvez maintenant définir des commissions décimales (ex: 8.5%, 10.2%)")

    except Exception as e:
        print(f"\n❌ ERREUR : {e}")
        raise


if __name__ == "__main__":
    print("\n⚠️  ATTENTION : Ce script va modifier la structure de la base de données.")
    print("   Assurez-vous d'avoir une sauvegarde avant de continuer.")
    print()
    response = input("Continuer ? (o/n) : ")

    if response.lower() == 'o':
        migrate_commission_column()
    else:
        print("❌ Migration annulée")
