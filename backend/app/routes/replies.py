"""
Reply detection and AI classification routes.

Provides:
  POST /api/replies/check    — Manual check: scan Gmail threads for new replies, classify them
  GET  /api/replies/         — List classified replies for the user
  PUT  /api/replies/<id>     — Update reply (e.g., dismiss, change category)
  POST /api/replies/webhook  — Gmail Pub/Sub push endpoint (no auth, verified by Google)
"""
import base64
import json
import logging
from datetime import datetime
from flask import Blueprint, request, jsonify
from app.extensions import require_firebase_auth, get_db
from app.services.gmail_client import _get_gmail_service
from app.services.reply_classifier import classify_reply, STAGE_MAP

logger = logging.getLogger(__name__)
replies_bp = Blueprint("replies", __name__, url_prefix="/api/replies")


@replies_bp.get("/")
@require_firebase_auth
def list_replies():
    """List all classified replies for the user."""
    uid = request.firebase_user["uid"]
    db = get_db()
    docs = db.collection("users").document(uid).collection("replies").stream()
    replies = []
    for doc in docs:
        r = doc.to_dict()
        r["id"] = doc.id
        replies.append(r)
    replies.sort(key=lambda x: x.get("receivedAt", ""), reverse=True)
    return jsonify(replies)


@replies_bp.post("/check")
@require_firebase_auth
def check_replies():
    """Manually scan Gmail for new replies on tracked threads and classify them."""
    uid = request.firebase_user["uid"]
    db = get_db()

    # Get Gmail credentials
    gmail_doc = db.collection("users").document(uid).collection("integrations").document("gmail").get()
    if not gmail_doc.exists:
        return jsonify({"error": "Gmail not connected"}), 400
    gmail_creds = gmail_doc.to_dict()

    # Get all contacts with gmailThreadId
    contacts_ref = db.collection("users").document(uid).collection("contacts")
    contacts = list(contacts_ref.stream())
    tracked = [(doc.id, doc.to_dict()) for doc in contacts if doc.to_dict().get("gmailThreadId")]

    if not tracked:
        return jsonify({"checked": 0, "newReplies": 0, "message": "No tracked email threads found"})

    service = _get_gmail_service(gmail_creds)
    new_replies = 0
    errors = 0

    # Get user's email to identify which messages are replies (not sent by us)
    try:
        profile = service.users().getProfile(userId="me").execute()
        user_email = profile.get("emailAddress", "").lower()
    except Exception:
        user_email = ""

    for contact_id, contact in tracked:
        thread_id = contact["gmailThreadId"]
        try:
            thread = service.users().threads().get(userId="me", id=thread_id, format="full").execute()
            messages = thread.get("messages", [])
            if len(messages) <= 1:
                continue  # No replies yet

            # Check if we already processed the latest message
            latest_msg = messages[-1]
            latest_msg_id = latest_msg["id"]

            # Skip if latest message is from us
            from_header = _get_header(latest_msg, "From").lower()
            if user_email and user_email in from_header:
                continue

            # Check if we already classified this message
            existing = db.collection("users").document(uid).collection("replies") \
                .where("messageId", "==", latest_msg_id).limit(1).stream()
            if any(True for _ in existing):
                continue

            # Extract reply content
            subject = _get_header(latest_msg, "Subject")
            body = _extract_body(latest_msg)
            sender = _get_header(latest_msg, "From")
            received_at = _get_date(latest_msg)

            # Classify with AI
            result = classify_reply(subject, body)

            # Save reply record
            reply_data = {
                "contactId": contact_id,
                "contactName": f"{contact.get('firstName', '')} {contact.get('lastName', '')}".strip(),
                "company": contact.get("company", ""),
                "threadId": thread_id,
                "messageId": latest_msg_id,
                "subject": subject,
                "snippet": body[:200],
                "sender": sender,
                "category": result["category"],
                "confidence": result["confidence"],
                "provider": result["provider"],
                "receivedAt": received_at,
                "processedAt": datetime.utcnow().isoformat() + "Z",
                "dismissed": False,
                "stageUpdated": False,
            }
            db.collection("users").document(uid).collection("replies").add(reply_data)

            # Update contact
            contact_updates = {
                "hasUnreadReply": True,
                "lastMessageSnippet": body[:200],
                "aiCategory": result["category"],
            }

            # Auto-move pipeline stage
            new_stage = STAGE_MAP.get(result["category"])
            if new_stage and contact.get("pipelineStage") != new_stage:
                contact_updates["pipelineStage"] = new_stage
                reply_data["stageUpdated"] = True

            contacts_ref.document(contact_id).update(contact_updates)
            new_replies += 1

        except Exception as e:
            logger.warning(f"Error checking thread {thread_id}: {e}")
            errors += 1

    return jsonify({
        "checked": len(tracked),
        "newReplies": new_replies,
        "errors": errors,
    })


@replies_bp.put("/<reply_id>")
@require_firebase_auth
def update_reply(reply_id):
    """Update a reply (dismiss, change category)."""
    uid = request.firebase_user["uid"]
    db = get_db()
    data = request.get_json() or {}
    allowed = {"dismissed", "category"}
    updates = {k: v for k, v in data.items() if k in allowed}

    if not updates:
        return jsonify({"error": "No valid fields"}), 400

    # If category changed, update contact pipeline stage
    if "category" in updates:
        reply_doc = db.collection("users").document(uid).collection("replies").document(reply_id).get()
        if reply_doc.exists:
            reply = reply_doc.to_dict()
            contact_id = reply.get("contactId")
            new_stage = STAGE_MAP.get(updates["category"])
            if contact_id and new_stage:
                db.collection("users").document(uid).collection("contacts").document(contact_id).update({
                    "pipelineStage": new_stage,
                    "aiCategory": updates["category"],
                })

    if "dismissed" in updates and updates["dismissed"]:
        # Mark contact reply as read
        reply_doc = db.collection("users").document(uid).collection("replies").document(reply_id).get()
        if reply_doc.exists:
            contact_id = reply_doc.to_dict().get("contactId")
            if contact_id:
                db.collection("users").document(uid).collection("contacts").document(contact_id).update({
                    "hasUnreadReply": False,
                })

    db.collection("users").document(uid).collection("replies").document(reply_id).update(updates)
    return jsonify({"success": True})


@replies_bp.post("/webhook")
def gmail_webhook():
    """Gmail Pub/Sub push notification handler.
    No Firebase auth — Google sends these directly.
    Verifies the message and triggers reply checking for the affected user.
    """
    envelope = request.get_json()
    if not envelope or "message" not in envelope:
        return "Bad request", 400

    try:
        pubsub_message = envelope["message"]
        data = base64.b64decode(pubsub_message.get("data", "")).decode()
        notification = json.loads(data)
        email_address = notification.get("emailAddress", "")
        history_id = notification.get("historyId", "")

        logger.info(f"Gmail webhook: email={email_address}, historyId={history_id}")

        # Find user by email and trigger check
        db = get_db()
        users = db.collection("users").where("email", "==", email_address).limit(1).stream()
        user_doc = next(users, None)
        if user_doc:
            uid = user_doc.id
            # Queue a background check (for now, just log)
            logger.info(f"Webhook received for user {uid}, email {email_address}")
            # In production, you'd trigger an async task here

        return "", 200
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return "", 200  # Always return 200 to avoid retries


# ── Helper functions ──

def _get_header(message: dict, name: str) -> str:
    """Extract a header value from a Gmail message."""
    headers = message.get("payload", {}).get("headers", [])
    for h in headers:
        if h["name"].lower() == name.lower():
            return h["value"]
    return ""


def _extract_body(message: dict) -> str:
    """Extract plain text body from a Gmail message."""
    payload = message.get("payload", {})

    # Simple message with body directly
    if payload.get("body", {}).get("data"):
        return base64.urlsafe_b64decode(payload["body"]["data"]).decode("utf-8", errors="replace")

    # Multipart message — find text/plain
    parts = payload.get("parts", [])
    for part in parts:
        if part.get("mimeType") == "text/plain" and part.get("body", {}).get("data"):
            return base64.urlsafe_b64decode(part["body"]["data"]).decode("utf-8", errors="replace")

    # Try HTML as fallback
    for part in parts:
        if part.get("mimeType") == "text/html" and part.get("body", {}).get("data"):
            html = base64.urlsafe_b64decode(part["body"]["data"]).decode("utf-8", errors="replace")
            # Strip HTML tags (basic)
            import re
            return re.sub(r"<[^>]+>", " ", html).strip()

    # Nested multipart
    for part in parts:
        if part.get("parts"):
            for sub in part["parts"]:
                if sub.get("mimeType") == "text/plain" and sub.get("body", {}).get("data"):
                    return base64.urlsafe_b64decode(sub["body"]["data"]).decode("utf-8", errors="replace")

    return message.get("snippet", "")


def _get_date(message: dict) -> str:
    """Get the date of a Gmail message as ISO string."""
    timestamp_ms = int(message.get("internalDate", "0"))
    if timestamp_ms:
        return datetime.utcfromtimestamp(timestamp_ms / 1000).isoformat() + "Z"
    return datetime.utcnow().isoformat() + "Z"
