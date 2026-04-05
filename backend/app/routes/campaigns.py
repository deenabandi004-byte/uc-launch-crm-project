import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify
from app.extensions import require_firebase_auth, get_db
from app.services.email_generation import generate_personalized_email
from app.services.gmail_client import create_draft, send_draft
from app.services.email_tracker import inject_tracking
from app.services.hunter_client import verify_email
from app.config import HUNTER_API_KEY

campaigns_bp = Blueprint("campaigns", __name__, url_prefix="/api/campaigns")


@campaigns_bp.get("/")
@require_firebase_auth
def list_campaigns():
    uid = request.firebase_user["uid"]
    db = get_db()
    docs = db.collection("users").document(uid).collection("campaigns").stream()
    campaigns = []
    for doc in docs:
        c = doc.to_dict()
        c["id"] = doc.id
        campaigns.append(c)
    return jsonify(campaigns)


@campaigns_bp.post("/create")
@require_firebase_auth
def create_campaign():
    uid = request.firebase_user["uid"]
    db = get_db()
    data = request.get_json() or {}
    campaign_id = str(uuid.uuid4())
    campaign = {
        "name": data.get("name", f"Campaign {datetime.now().strftime('%m/%d')}"),
        "templateId": data.get("templateId", ""),
        "contactIds": data.get("contactIds", []),
        "status": "draft",
        "sentCount": 0,
        "createdAt": datetime.utcnow().isoformat(),
    }
    db.collection("users").document(uid).collection("campaigns").document(campaign_id).set(campaign)
    campaign["id"] = campaign_id
    return jsonify(campaign), 201


@campaigns_bp.post("/<campaign_id>/generate")
@require_firebase_auth
def generate_drafts(campaign_id):
    uid = request.firebase_user["uid"]
    db = get_db()

    # Get campaign
    camp_ref = db.collection("users").document(uid).collection("campaigns").document(campaign_id)
    camp_doc = camp_ref.get()
    if not camp_doc.exists:
        return jsonify({"error": "Campaign not found"}), 404
    campaign = camp_doc.to_dict()

    # Get user profile
    user_doc = db.collection("users").document(uid).get()
    profile = user_doc.to_dict() if user_doc.exists else {}

    # Get template
    template = {}
    if campaign.get("templateId"):
        tmpl_doc = db.collection("users").document(uid).collection("emailTemplates").document(campaign["templateId"]).get()
        if tmpl_doc.exists:
            template = tmpl_doc.to_dict()

    # Generate personalized emails for each contact
    drafts = []
    for contact_id in campaign.get("contactIds", []):
        contact_doc = db.collection("users").document(uid).collection("contacts").document(contact_id).get()
        if not contact_doc.exists:
            continue
        contact = contact_doc.to_dict()

        try:
            email = generate_personalized_email(
                template=template,
                contact=contact,
                profile=profile,
            )
            draft = {
                "contactId": contact_id,
                "contactName": f"{contact.get('firstName', '')} {contact.get('lastName', '')}".strip(),
                "contactEmail": contact.get("email", ""),
                "subject": email["subject"],
                "body": email["body"],
                "status": "draft",
            }
            drafts.append(draft)
        except Exception as e:
            drafts.append({
                "contactId": contact_id,
                "contactName": f"{contact.get('firstName', '')} {contact.get('lastName', '')}".strip(),
                "error": str(e),
                "status": "error",
            })

    # Save drafts to campaign
    camp_ref.update({"drafts": drafts, "status": "drafts_ready"})
    return jsonify(drafts)


@campaigns_bp.get("/<campaign_id>/drafts")
@require_firebase_auth
def get_drafts(campaign_id):
    uid = request.firebase_user["uid"]
    db = get_db()
    camp_doc = db.collection("users").document(uid).collection("campaigns").document(campaign_id).get()
    if not camp_doc.exists:
        return jsonify({"error": "Campaign not found"}), 404
    campaign = camp_doc.to_dict()
    return jsonify(campaign.get("drafts", []))


@campaigns_bp.post("/<campaign_id>/send")
@require_firebase_auth
def send_campaign(campaign_id):
    uid = request.firebase_user["uid"]
    db = get_db()

    # Check daily send limit
    user_ref = db.collection("users").document(uid)
    user_doc = user_ref.get()
    if not user_doc.exists:
        return jsonify({"error": "User not found"}), 404
    user_data = user_doc.to_dict()

    today = datetime.utcnow().strftime("%Y-%m-%d")
    daily_count = user_data.get("dailySendCount", 0)
    daily_date = user_data.get("dailySendDate", "")
    if daily_date != today:
        daily_count = 0

    camp_doc = db.collection("users").document(uid).collection("campaigns").document(campaign_id).get()
    if not camp_doc.exists:
        return jsonify({"error": "Campaign not found"}), 404
    campaign = camp_doc.to_dict()
    drafts = campaign.get("drafts", [])

    if daily_count + len(drafts) > 500:
        return jsonify({"error": f"Daily limit: {500 - daily_count} emails remaining today"}), 429

    # Get Gmail credentials
    gmail_doc = db.collection("users").document(uid).collection("integrations").document("gmail").get()
    if not gmail_doc.exists:
        return jsonify({"error": "Gmail not connected. Please connect Gmail first."}), 400
    gmail_creds = gmail_doc.to_dict()

    sent_count = 0
    skipped_count = 0
    results = []
    for draft in drafts:
        if draft.get("status") == "error":
            results.append(draft)
            continue

        # Verify email with Hunter before sending
        email = draft.get("contactEmail", "").strip()
        if not email:
            draft["status"] = "skipped"
            draft["error"] = "No email address"
            skipped_count += 1
            results.append(draft)
            continue

        if HUNTER_API_KEY:
            try:
                verification = verify_email(email)
                if verification.get("result") == "undeliverable":
                    draft["status"] = "skipped"
                    draft["error"] = f"Email undeliverable (Hunter score: {verification.get('score', 0)})"
                    skipped_count += 1
                    results.append(draft)
                    # Update contact with verification status
                    if draft.get("contactId"):
                        db.collection("users").document(uid).collection("contacts").document(draft["contactId"]).update({
                            "emailVerification": "undeliverable",
                            "emailScore": verification.get("score", 0),
                        })
                    continue
            except Exception:
                pass  # If Hunter fails, proceed with sending

        try:
            base_url = request.host_url.rstrip("/")
            tracked_body = inject_tracking(draft["body"], uid, draft["contactId"], campaign_id, base_url)
            result = create_draft(
                gmail_creds=gmail_creds,
                to=draft["contactEmail"],
                subject=draft["subject"],
                body=tracked_body,
                uid=uid,
            )
            send_result = send_draft(
                gmail_creds=gmail_creds,
                draft_id=result["draftId"],
                uid=uid,
            )
            draft["status"] = "sent"
            draft["gmailThreadId"] = send_result.get("threadId", "")
            sent_count += 1

            # Update contact pipeline stage
            if draft.get("contactId"):
                db.collection("users").document(uid).collection("contacts").document(draft["contactId"]).update({
                    "pipelineStage": "no_response",
                    "gmailThreadId": send_result.get("threadId", ""),
                    "campaignId": campaign_id,
                })
        except Exception as e:
            draft["status"] = "send_error"
            draft["error"] = str(e)
        results.append(draft)

    # Update campaign and daily count
    camp_ref = db.collection("users").document(uid).collection("campaigns").document(campaign_id)
    camp_ref.update({"drafts": results, "status": "sent", "sentCount": sent_count})
    user_ref.update({"dailySendCount": daily_count + sent_count, "dailySendDate": today})

    return jsonify({"sentCount": sent_count, "skippedCount": skipped_count, "results": results})
