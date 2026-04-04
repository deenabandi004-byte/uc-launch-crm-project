import uuid
from flask import Blueprint, request, jsonify
from app.extensions import require_firebase_auth, get_db
from app.services.lead_generation import generate_leads, search_companies

leads_bp = Blueprint("leads", __name__, url_prefix="/api/leads")


@leads_bp.get("/")
@require_firebase_auth
def list_leads():
    uid = request.firebase_user["uid"]
    db = get_db()
    docs = db.collection("users").document(uid).collection("leads").stream()
    leads = []
    for doc in docs:
        lead = doc.to_dict()
        lead["id"] = doc.id
        leads.append(lead)
    return jsonify(leads)


@leads_bp.post("/")
@require_firebase_auth
def create_lead():
    uid = request.firebase_user["uid"]
    db = get_db()
    data = request.get_json() or {}
    lead_id = str(uuid.uuid4())
    lead = {
        "companyName": data.get("companyName", ""),
        "website": data.get("website", ""),
        "domain": data.get("domain", ""),
        "industry": data.get("industry", ""),
        "location": data.get("location", ""),
        "employeeCount": data.get("employeeCount", ""),
        "description": data.get("description", ""),
        "relevanceScore": data.get("relevanceScore", 0),
        "status": "new",
        "source": "manual",
    }
    db.collection("users").document(uid).collection("leads").document(lead_id).set(lead)
    lead["id"] = lead_id
    return jsonify(lead), 201


@leads_bp.put("/<lead_id>")
@require_firebase_auth
def update_lead(lead_id):
    uid = request.firebase_user["uid"]
    db = get_db()
    data = request.get_json() or {}
    allowed = {
        "companyName", "website", "domain", "industry", "location",
        "employeeCount", "description", "relevanceScore", "status",
    }
    updates = {k: v for k, v in data.items() if k in allowed}
    if not updates:
        return jsonify({"error": "No valid fields"}), 400
    db.collection("users").document(uid).collection("leads").document(lead_id).update(updates)
    return jsonify({"success": True})


@leads_bp.delete("/<lead_id>")
@require_firebase_auth
def delete_lead(lead_id):
    uid = request.firebase_user["uid"]
    db = get_db()
    db.collection("users").document(uid).collection("leads").document(lead_id).delete()
    return jsonify({"success": True})


@leads_bp.post("/generate")
@require_firebase_auth
def generate_leads_route():
    uid = request.firebase_user["uid"]
    db = get_db()
    user_doc = db.collection("users").document(uid).get()
    if not user_doc.exists:
        return jsonify({"error": "User profile not found"}), 404

    profile = user_doc.to_dict()
    try:
        leads = generate_leads(profile)
        # Save to Firestore
        for lead in leads:
            lead_id = str(uuid.uuid4())
            lead["source"] = "ai_generated"
            lead["status"] = "new"
            db.collection("users").document(uid).collection("leads").document(lead_id).set(lead)
            lead["id"] = lead_id
        return jsonify(leads)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@leads_bp.post("/search")
@require_firebase_auth
def search_leads():
    data = request.get_json() or {}
    query = data.get("query", "").strip()
    if not query:
        return jsonify({"error": "Search query required"}), 400
    try:
        results = search_companies(query)
        return jsonify(results)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
