import os
import json
import firebase_admin
from firebase_admin import auth, credentials


def initialize_firebase():
    if not firebase_admin._apps:

        firebase_credentials = os.getenv("FIREBASE_SERVICE_ACCOUNT")

        if not firebase_credentials:
            raise RuntimeError(
                "FIREBASE_SERVICE_ACCOUNT environment variable is not set"
            )

        firebase_config = json.loads(firebase_credentials)

        cred = credentials.Certificate(firebase_config)

        firebase_admin.initialize_app(cred)


def verify_firebase_token(token: str):
    initialize_firebase()
    return auth.verify_id_token(token)
