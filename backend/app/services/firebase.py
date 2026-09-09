import firebase_admin
from firebase_admin import auth, credentials


def initialize_firebase():
    if not firebase_admin._apps:
        cred = credentials.Certificate(
            "/code/firebase-service-account.json"
        )

        firebase_admin.initialize_app(cred)


def verify_firebase_token(token: str):
    initialize_firebase()
    return auth.verify_id_token(token)