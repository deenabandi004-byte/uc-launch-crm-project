from flask import Blueprint, request, jsonify
from app.extensions import require_firebase_auth, get_db

users_bp = Blueprint("users", __name__, url_prefix="/api/users")


@users_bp.get("/me")
@require_firebase_auth
def get_profile():
    uid = request.firebase_user["uid"]
    db = get_db()
    doc = db.collection("users").document(uid).get()
    if not doc.exists:
        return jsonify({"error": "User not found"}), 404
    data = doc.to_dict()
    data.pop("gmailToken", None)
    data.pop("gmailRefreshToken", None)
    return jsonify(data)


@users_bp.put("/me")
@require_firebase_auth
def update_profile():
    uid = request.firebase_user["uid"]
    db = get_db()
    updates = request.get_json() or {}
    # Only allow safe fields
    allowed = {
        "name", "companyName", "industry", "description",
        "targetCustomers", "location", "website", "parsedWebsite",
    }
    safe_updates = {k: v for k, v in updates.items() if k in allowed}
    if not safe_updates:
        return jsonify({"error": "No valid fields to update"}), 400
    db.collection("users").document(uid).update(safe_updates)
    return jsonify({"success": True})
