import os
from pathlib import Path

import firebase_admin
from firebase_admin import auth, credentials

_DEFAULT_LOCAL_CRED = Path(__file__).resolve().parents[2] / "firebase-service-account.json"
_DOCKER_CRED = Path("/code/firebase-service-account.json")


def _resolve_credentials_path() -> str:
    env_path = os.environ.get("FIREBASE_CREDENTIALS_PATH") or os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    for candidate in (env_path, _DEFAULT_LOCAL_CRED, _DOCKER_CRED):
        if candidate and Path(candidate).is_file():
            return str(candidate)
    return str(_DEFAULT_LOCAL_CRED)


def initialize_firebase():
    if not firebase_admin._apps:
        cred = credentials.Certificate(_resolve_credentials_path())
        firebase_admin.initialize_app(cred)
 
 
def verify_firebase_token(token: str):
    initialize_firebase()
    return auth.verify_id_token(token)