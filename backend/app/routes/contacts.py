import uuid
from flask import Blueprint, request, jsonify
from app.extensions import require_firebase_auth, get_db
from app.services.pdl_client import find_contacts

contacts_bp = Blueprint("contacts", __name__, url_prefix="/api/contacts")


@contacts_bp.get("/")
@require_firebase_auth
def list_contacts():
    uid = request.firebase_user["uid"]
    db = get_db()
    docs = db.collection("users").document(uid).collection("contacts").stream()
    contacts = []
    for doc in docs:
        c = doc.to_dict()
        c["id"] = doc.id
        contacts.append(c)
    return jsonify(contacts)


@contacts_bp.post("/find")
@require_firebase_auth
def find_contacts_route():
    uid = request.firebase_user["uid"]
    db = get_db()
    data = request.get_json() or {}
    company = data.get("company", "")
    domain = data.get("domain", "")
    titles = data.get("titles", [])
    location = data.get("location", "")
    lead_id = data.get("leadId", "")

    if not company and not domain:
        return jsonify({"error": "Company name or domain required"}), 400

    try:
        results = find_contacts(company=company, domain=domain, titles=titles, location=location)
        saved = []
        for person in results:
            contact_id = str(uuid.uuid4())
            contact = {
                "firstName": person.get("firstName", ""),
                "lastName": person.get("lastName", ""),
                "email": person.get("email", ""),
                "jobTitle": person.get("jobTitle", ""),
                "company": person.get("company", company),
                "linkedinUrl": person.get("linkedinUrl", ""),
                "location": person.get("location", ""),
                "leadId": lead_id,
                "pipelineStage": "none",
                "hasUnreadReply": False,
            }
            db.collection("users").document(uid).collection("contacts").document(contact_id).set(contact)
            contact["id"] = contact_id
            saved.append(contact)
        return jsonify(saved)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@contacts_bp.put("/<contact_id>")
@require_firebase_auth
def update_contact(contact_id):
    uid = request.firebase_user["uid"]
    db = get_db()
    data = request.get_json() or {}
    allowed = {
        "firstName", "lastName", "email", "jobTitle", "company",
        "linkedinUrl", "location", "pipelineStage", "hasUnreadReply",
        "lastMessageSnippet", "gmailThreadId", "campaignId",
    }
    updates = {k: v for k, v in data.items() if k in allowed}
    if not updates:
        return jsonify({"error": "No valid fields"}), 400
    db.collection("users").document(uid).collection("contacts").document(contact_id).update(updates)
    return jsonify({"success": True})


@contacts_bp.delete("/<contact_id>")
@require_firebase_auth
def delete_contact(contact_id):
    uid = request.firebase_user["uid"]
    db = get_db()
    db.collection("users").document(uid).collection("contacts").document(contact_id).delete()
    return jsonify({"success": True})
