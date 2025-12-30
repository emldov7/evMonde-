from sqlalchemy import text

from app.config.database import engine
from app.config.settings import settings


def _find_registrations_status_enum_name(conn) -> str | None:
    # Detect the *actual* type of public.registrations.status
    row = conn.execute(
        text(
            """
            SELECT t.typname
            FROM pg_attribute a
            JOIN pg_class c ON c.oid = a.attrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            JOIN pg_type t ON t.oid = a.atttypid
            WHERE n.nspname = 'public'
              AND c.relname = 'registrations'
              AND a.attname = 'status'
              AND a.attnum > 0
              AND NOT a.attisdropped
              AND t.typtype = 'e'
            LIMIT 1
            """
        )
    ).fetchone()
    return row[0] if row else None


def _enum_has_value(conn, enum_name: str, value: str) -> bool:
    row = conn.execute(
        text(
            """
            SELECT 1
            FROM pg_type t
            JOIN pg_enum e ON t.oid = e.enumtypid
            WHERE t.typname = :enum_name AND e.enumlabel = :value
            LIMIT 1
            """
        ),
        {"enum_name": enum_name, "value": value},
    ).fetchone()
    return bool(row)


def _add_enum_value(conn, enum_name: str, value: str) -> None:
    if _enum_has_value(conn, enum_name, value):
        print(f"✅ Enum {enum_name} already has value '{value}'")
        return

    # ALTER TYPE ... ADD VALUE cannot be parameterized.
    conn.execute(text(f"ALTER TYPE {enum_name} ADD VALUE '{value}'"))
    print(f"✅ Added enum value '{value}' to {enum_name}")


def _add_column_if_missing(conn, table: str, column: str, ddl_type: str) -> None:
    exists = conn.execute(
        text(
            """
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = :table
              AND column_name = :column
            LIMIT 1
            """
        ),
        {"table": table, "column": column},
    ).fetchone()

    if exists:
        print(f"✅ Column {table}.{column} already exists")
        return

    conn.execute(text(f"ALTER TABLE public.{table} ADD COLUMN {column} {ddl_type}"))
    print(f"✅ Added column {table}.{column}")


def _assert_column_exists(conn, table: str, column: str) -> None:
    row = conn.execute(
        text(
            """
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = :table
              AND column_name = :column
            LIMIT 1
            """
        ),
        {"table": table, "column": column},
    ).fetchone()
    if not row:
        raise RuntimeError(
            f"Migration incomplète: la colonne public.{table}.{column} n'existe toujours pas. "
            "Vérifie que tu utilises bien la même DATABASE_URL que le backend."
        )


def main() -> None:
    print("\n=== Migration: registrations waitlist fields + enum values ===\n")
    print(f"DATABASE_URL (utilisé par le script): {settings.DATABASE_URL}")

    with engine.begin() as conn:
        _add_column_if_missing(conn, "registrations", "waitlist_joined_at", "TIMESTAMP")
        _add_column_if_missing(conn, "registrations", "offer_expires_at", "TIMESTAMP")

        _assert_column_exists(conn, "registrations", "waitlist_joined_at")
        _assert_column_exists(conn, "registrations", "offer_expires_at")

        enum_name = _find_registrations_status_enum_name(conn)
        if not enum_name:
            print(
                "ℹ️ Colonne public.registrations.status n'est pas un ENUM Postgres. "
                "(OK si c'est un VARCHAR/TEXT) - étape enum ignorée."
            )
        else:
            print(f"ℹ️ Detected RegistrationStatus enum type: {enum_name}")
            # Your DB stores statuses in UPPERCASE (ex: CONFIRMED / OFFERED)
            _add_enum_value(conn, enum_name, "WAITLIST")
            _add_enum_value(conn, enum_name, "OFFERED")

    print("\n✅ Migration finished successfully.\n")


if __name__ == "__main__":
    main()
