"""
Flask extensions - Firebase init, auth decorator, CORS setup
"""
import os
import functools
import firebase_admin
from firebase_admin import credentials, firestore, auth as fb_auth
from flask import Flask, request, jsonify
from flask_cors import CORS

db = None


def init_firebase(app):
    global db
    if firebase_admin._apps:
        try:
            db = firestore.client()
            return
        except Exception:
            firebase_admin._apps.clear()

    cred = None
    cred_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if cred_path and os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        print(f"Using credentials from: {cred_path}")

    project_id = os.getenv("FIREBASE_PROJECT_ID", "outboundcrm")
    try:
        if cred:
            firebase_admin.initialize_app(cred, {"projectId": project_id})
        else:
            firebase_admin.initialize_app(options={"projectId": project_id})
        db = firestore.client()
        print("Firebase initialized successfully")
    except Exception as e:
        print(f"Firebase initialization failed: {e}")
        db = None


def get_db():
    global db
    if db is None:
        if firebase_admin._apps:
            try:
                db = firestore.client()
            except Exception as e:
                raise RuntimeError(f"Failed to create Firestore client: {e}")
        else:
            raise RuntimeError("Firestore DB not initialized. Call init_firebase() first.")
    return db


def require_firebase_auth(fn):
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        if request.method == "OPTIONS":
            return fn(*args, **kwargs)

        if not firebase_admin._apps:
            return jsonify({"error": "Firebase not initialized"}), 500

        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing Authorization header"}), 401

        id_token = auth_header.split(" ", 1)[1].strip()

        import time
        max_retries = 3
        for attempt in range(max_retries):
            try:
                decoded = fb_auth.verify_id_token(id_token, clock_skew_seconds=5)
                request.firebase_user = decoded
                break
            except (ConnectionError, OSError):
                if attempt < max_retries - 1:
                    time.sleep(0.5 * (attempt + 1))
                    continue
                return jsonify({"error": "Network error during auth", "retry": True}), 503
            except Exception as e:
                return jsonify({"error": "Invalid or expired token"}), 401
        else:
            return jsonify({"error": "Auth service unavailable", "retry": True}), 503

        return fn(*args, **kwargs)

    return wrapper


def init_app_extensions(app: Flask):
    is_dev = (
        os.getenv("FLASK_ENV") == "development"
        or os.getenv("FLASK_DEBUG") == "1"
        or app.debug
    )

    if is_dev:
        origins = [
            "http://localhost:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:5174",
            "http://localhost:8080",
            "http://127.0.0.1:8080",
        ]
    else:
        extra = os.getenv("CORS_ORIGINS", "")
        origins = [o.strip() for o in extra.split(",") if o.strip()] if extra else []
        origins += ["https://outboundcrm.onrender.com"]

    cors_config = {
        "origins": origins,
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
        "supports_credentials": True,
        "max_age": 3600,
    }

    CORS(
        app,
        resources={r"/api/*": cors_config, r"/*": cors_config},
        automatic_options=True,
        supports_credentials=True,
    )

    flask_secret = os.getenv("FLASK_SECRET")
    is_production = os.getenv("FLASK_ENV") == "production" or os.getenv("RENDER")
    if is_production and (not flask_secret or flask_secret == "dev"):
        raise RuntimeError("FLASK_SECRET must be set in production")
    app.secret_key = flask_secret or "dev"

    init_firebase(app)
