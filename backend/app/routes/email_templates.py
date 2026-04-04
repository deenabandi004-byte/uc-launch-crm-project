import uuid
from flask import Blueprint, request, jsonify
from app.extensions import require_firebase_auth, get_db

email_templates_bp = Blueprint("email_templates", __name__, url_prefix="/api/email-templates")

PRESETS = [
    {
        "presetKey": "cold_outreach",
        "name": "Cold Outreach",
        "subject": "Quick question about {{companyName}}",
        "body": "Hi {{firstName}},\n\nI came across {{companyName}} and was impressed by what you're building. I run {{myCompany}} and we help companies like yours with {{valueProposition}}.\n\nWould you be open to a quick 15-minute call this week?\n\nBest,\n{{myName}}",
    },
    {
        "presetKey": "follow_up",
        "name": "Follow-Up",
        "subject": "Following up - {{myCompany}} x {{companyName}}",
        "body": "Hi {{firstName}},\n\nI wanted to follow up on my previous email. I understand you're busy, but I believe {{myCompany}} could really help {{companyName}} with {{painPoint}}.\n\nWould next week work for a brief chat?\n\nBest,\n{{myName}}",
    },
    {
        "presetKey": "meeting_request",
        "name": "Meeting Request",
        "subject": "Meeting request: {{myCompany}} + {{companyName}}",
        "body": "Hi {{firstName}},\n\nI'd love to schedule a meeting to discuss how {{myCompany}} can support {{companyName}}'s goals around {{painPoint}}.\n\nAre you available for 20 minutes this week or next?\n\nBest,\n{{myName}}",
    },
    {
        "presetKey": "value_proposition",
        "name": "Value Proposition",
        "subject": "How {{myCompany}} helps companies like {{companyName}}",
        "body": "Hi {{firstName}},\n\nCompanies in {{industry}} are seeing great results with our solution:\n\n- {{benefit1}}\n- {{benefit2}}\n- {{benefit3}}\n\nI'd love to show you how this could work for {{companyName}}.\n\nBest,\n{{myName}}",
    },
    {
        "presetKey": "case_study",
        "name": "Case Study Share",
        "subject": "How we helped a company like {{companyName}}",
        "body": "Hi {{firstName}},\n\nI thought you might find this interesting - we recently helped a similar company in {{industry}} achieve {{result}}.\n\nWould you like to see the full case study? Happy to share and discuss how we could do the same for {{companyName}}.\n\nBest,\n{{myName}}",
    },
]


@email_templates_bp.get("/")
@require_firebase_auth
def list_templates():
    uid = request.firebase_user["uid"]
    db = get_db()
    docs = db.collection("users").document(uid).collection("emailTemplates").stream()
    templates = []
    for doc in docs:
        t = doc.to_dict()
        t["id"] = doc.id
        templates.append(t)
    # Add presets if user has none
    if not templates:
        for preset in PRESETS:
            tid = str(uuid.uuid4())
            template = {**preset, "isPreset": True}
            db.collection("users").document(uid).collection("emailTemplates").document(tid).set(template)
            template["id"] = tid
            templates.append(template)
    return jsonify(templates)


@email_templates_bp.post("/")
@require_firebase_auth
def create_template():
    uid = request.firebase_user["uid"]
    db = get_db()
    data = request.get_json() or {}
    tid = str(uuid.uuid4())
    template = {
        "name": data.get("name", "Custom Template"),
        "subject": data.get("subject", ""),
        "body": data.get("body", ""),
        "isPreset": False,
    }
    db.collection("users").document(uid).collection("emailTemplates").document(tid).set(template)
    template["id"] = tid
    return jsonify(template), 201


@email_templates_bp.put("/<template_id>")
@require_firebase_auth
def update_template(template_id):
    uid = request.firebase_user["uid"]
    db = get_db()
    data = request.get_json() or {}
    allowed = {"name", "subject", "body"}
    updates = {k: v for k, v in data.items() if k in allowed}
    if not updates:
        return jsonify({"error": "No valid fields"}), 400
    db.collection("users").document(uid).collection("emailTemplates").document(template_id).update(updates)
    return jsonify({"success": True})


@email_templates_bp.delete("/<template_id>")
@require_firebase_auth
def delete_template(template_id):
    uid = request.firebase_user["uid"]
    db = get_db()
    db.collection("users").document(uid).collection("emailTemplates").document(template_id).delete()
    return jsonify({"success": True})
