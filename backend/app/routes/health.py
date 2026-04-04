from flask import Blueprint, jsonify
import firebase_admin
from app.extensions import get_db

health_bp = Blueprint("health", __name__)


@health_bp.route("/ping")
def ping():
    return "pong"


@health_bp.route("/health")
def health():
    firebase_status = "unknown"
    try:
        if firebase_admin._apps:
            db = get_db()
            firebase_status = "initialized" if db else "db_none"
        else:
            firebase_status = "not_initialized"
    except Exception as e:
        firebase_status = f"error: {e}"

    return jsonify({"status": "healthy", "firebase": firebase_status})


@health_bp.get("/healthz")
def healthz():
    return jsonify({"status": "ok"}), 200
