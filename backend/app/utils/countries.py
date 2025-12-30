"""
Liste des pays supportés avec leurs codes et indicatifs téléphoniques
"""

# Liste des pays avec code ISO, nom, indicatif téléphonique et devise
COUNTRIES = [
    {
        "code": "TG",
        "name": "Togo",
        "phone_code": "+228",
        "currency": "USD",
        "currency_name": "Dollar Américain"
    },
    {
        "code": "CA",
        "name": "Canada",
        "phone_code": "+1",
        "currency": "CAD",
        "currency_name": "Dollar Canadien"
    },
    {
        "code": "FR",
        "name": "France",
        "phone_code": "+33",
        "currency": "EUR",
        "currency_name": "Euro"
    },
    # On peut facilement ajouter d'autres pays plus tard
]


def get_country_by_code(code: str):
    """
    Récupère les informations d'un pays par son code

    Exemple:
        country = get_country_by_code("TG")
        # Retourne: {"code": "TG", "name": "Togo", "phone_code": "+228", ...}
    """
    for country in COUNTRIES:
        if country["code"] == code:
            return country
    return None


def get_country_by_phone_code(phone_code: str):
    """
    Récupère les informations d'un pays par son indicatif téléphonique

    Exemple:
        country = get_country_by_phone_code("+228")
        # Retourne: {"code": "TG", "name": "Togo", "phone_code": "+228", ...}
    """
    for country in COUNTRIES:
        if country["phone_code"] == phone_code:
            return country
    return None


def get_all_countries():
    """
    Retourne la liste de tous les pays
    Utilisé pour le dropdown dans le frontend
    """
    return COUNTRIES
