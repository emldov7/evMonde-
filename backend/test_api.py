import requests
import json

# Token d'authentification
token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjg5LCJleHAiOjE3MzU2MjYyMzJ9.QxBJ_LZWmgJVzW5e7q0xKM-8aW7qHggvvxADmC6wXR4"
headers = {"Authorization": f"Bearer {token}"}

# Tester l'API
r = requests.get("http://localhost:8000/api/v1/registrations/events/1709/registrations", headers=headers)
print(f"Status: {r.status_code}")

if r.status_code == 200:
    data = r.json()
    print(f"Total registrations: {len(data)}")

    if data:
        print("\n=== Premier participant ===")
        participant = data[0]
        print(json.dumps(participant, indent=2, default=str))

        print("\n=== Champs clés ===")
        print(f"registration_type: {participant.get('registration_type')}")
        print(f"user_first_name: {participant.get('user_first_name')}")
        print(f"user_last_name: {participant.get('user_last_name')}")
        print(f"user_email: {participant.get('user_email')}")
        print(f"user_phone: {participant.get('user_phone')}")
        print(f"guest_first_name: {participant.get('guest_first_name')}")
        print(f"guest_last_name: {participant.get('guest_last_name')}")
else:
    print(f"Error: {r.text}")
