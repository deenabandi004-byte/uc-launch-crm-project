import uuid
import csv
import io
from flask import Blueprint, request, jsonify, Response
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
                "phone": person.get("phone", ""),
                "jobTitle": person.get("jobTitle", ""),
                "company": person.get("company", company),
                "linkedinUrl": person.get("linkedinUrl", ""),
                "location": person.get("location", ""),
                "leadId": lead_id,
                "pipelineStage": "new_lead",
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
        "firstName", "lastName", "email", "phone", "jobTitle", "company",
        "linkedinUrl", "location", "pipelineStage", "hasUnreadReply",
        "lastMessageSnippet", "gmailThreadId", "campaignId",
    }
    updates = {k: v for k, v in data.items() if k in allowed}
    if not updates:
        return jsonify({"error": "No valid fields"}), 400
    db.collection("users").document(uid).collection("contacts").document(contact_id).update(updates)
    return jsonify({"success": True})


@contacts_bp.post("/enrich-phones")
@require_firebase_auth
def enrich_phones():
    """Look up phone numbers for existing contacts that don't have one."""
    from app.config import PEOPLE_DATA_LABS_API_KEY, PDL_BASE_URL
    import requests as http_requests
    import logging
    logger = logging.getLogger(__name__)

    if not PEOPLE_DATA_LABS_API_KEY:
        return jsonify({"error": "PDL API key not configured"}), 500

    uid = request.firebase_user["uid"]
    db = get_db()
    docs = list(db.collection("users").document(uid).collection("contacts").stream())

    updated = 0
    for doc in docs:
        c = doc.to_dict()
        if c.get("phone"):
            continue

        phone = None

        # Method 1: Enrich by email
        if c.get("email"):
            try:
                resp = http_requests.get(
                    f"{PDL_BASE_URL}/person/enrich",
                    headers={"X-Api-Key": PEOPLE_DATA_LABS_API_KEY},
                    params={"email": c["email"]},
                    timeout=10,
                )
                if resp.status_code == 200:
                    person = resp.json()
                    phones = person.get("phone_numbers") or []
                    phone = phones[0] if phones else person.get("mobile_phone") or ""
            except Exception as e:
                logger.warning(f"Enrich failed for {c.get('email')}: {e}")

        # Method 2: Search with phone_numbers required
        if not phone and c.get("firstName") and c.get("company"):
            try:
                query = {
                    "bool": {
                        "must": [
                            {"match": {"first_name": c["firstName"]}},
                            {"match": {"last_name": c.get("lastName", "")}},
                            {"match": {"job_company_name": c["company"]}},
                            {"exists": {"field": "phone_numbers"}},
                        ]
                    }
                }
                resp = http_requests.post(
                    f"{PDL_BASE_URL}/person/search",
                    headers={"X-Api-Key": PEOPLE_DATA_LABS_API_KEY, "Content-Type": "application/json"},
                    json={"query": query, "size": 1},
                    timeout=10,
                )
                if resp.status_code == 200:
                    results = resp.json().get("data", [])
                    if results:
                        phones = results[0].get("phone_numbers") or []
                        phone = phones[0] if phones else results[0].get("mobile_phone") or ""
            except Exception as e:
                logger.warning(f"Search failed for {c.get('firstName')} {c.get('lastName')}: {e}")

        if phone:
            db.collection("users").document(uid).collection("contacts").document(doc.id).update({"phone": phone})
            updated += 1

    return jsonify({"updated": updated})


@contacts_bp.delete("/<contact_id>")
@require_firebase_auth
def delete_contact(contact_id):
    uid = request.firebase_user["uid"]
    db = get_db()
    db.collection("users").document(uid).collection("contacts").document(contact_id).delete()
    return jsonify({"success": True})


@contacts_bp.get("/export")
@require_firebase_auth
def export_contacts_csv():
    """Export all contacts as CSV download."""
    uid = request.firebase_user["uid"]
    db = get_db()
    docs = db.collection("users").document(uid).collection("contacts").stream()

    output = io.StringIO()
    fields = ["firstName", "lastName", "email", "phone", "jobTitle", "company", "linkedinUrl", "location", "pipelineStage"]
    writer = csv.DictWriter(output, fieldnames=fields, extrasaction="ignore")
    writer.writeheader()
    for doc in docs:
        writer.writerow(doc.to_dict())

    csv_bytes = output.getvalue()
    return Response(
        csv_bytes,
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=contacts.csv"},
    )


@contacts_bp.post("/import")
@require_firebase_auth
def import_contacts_csv():
    """Import contacts from CSV. Expects JSON array of contact objects."""
    uid = request.firebase_user["uid"]
    db = get_db()
    data = request.get_json() or []

    if not isinstance(data, list) or len(data) == 0:
        return jsonify({"error": "Expected a non-empty array of contacts"}), 400

    allowed_fields = {
        "firstName", "lastName", "email", "phone", "jobTitle", "company",
        "linkedinUrl", "location",
    }
    imported = 0
    for row in data:
        contact = {k: str(v).strip() for k, v in row.items() if k in allowed_fields and v}
        if not contact.get("firstName") and not contact.get("email"):
            continue
        contact["pipelineStage"] = "new_lead"
        contact["hasUnreadReply"] = False
        contact_id = str(uuid.uuid4())
        db.collection("users").document(uid).collection("contacts").document(contact_id).set(contact)
        imported += 1

    return jsonify({"imported": imported})
