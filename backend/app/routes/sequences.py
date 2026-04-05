import uuid
import logging
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from app.extensions import require_firebase_auth, get_db
from app.services.email_generation import generate_personalized_email
from app.services.gmail_client import create_draft, send_draft

logger = logging.getLogger(__name__)

sequences_bp = Blueprint("sequences", __name__, url_prefix="/api/sequences")

TERMINAL_STAGES = {"interested", "not_interested", "approved", "complete", "paid"}


@sequences_bp.get("/")
@require_firebase_auth
def list_sequences():
    uid = request.firebase_user["uid"]
    db = get_db()
    docs = db.collection("users").document(uid).collection("sequences").stream()
    sequences = []
    for doc in docs:
        s = doc.to_dict()
        s["id"] = doc.id
        sequences.append(s)
    return jsonify(sequences)


@sequences_bp.post("/")
@require_firebase_auth
def create_sequence():
    uid = request.firebase_user["uid"]
    db = get_db()
    data = request.get_json() or {}
    sequence_id = str(uuid.uuid4())
    sequence = {
        "name": data.get("name", f"Sequence {datetime.now().strftime('%m/%d')}"),
        "contactIds": data.get("contactIds", []),
        "steps": data.get("steps", []),
        "status": "draft",
        "currentStep": 0,
        "nextRunAt": None,
        "createdAt": datetime.utcnow().isoformat(),
        "contactStatuses": {},
    }
    db.collection("users").document(uid).collection("sequences").document(sequence_id).set(sequence)
    sequence["id"] = sequence_id
    return jsonify(sequence), 201


@sequences_bp.put("/<sequence_id>")
@require_firebase_auth
def update_sequence(sequence_id):
    uid = request.firebase_user["uid"]
    db = get_db()
    seq_ref = db.collection("users").document(uid).collection("sequences").document(sequence_id)
    seq_doc = seq_ref.get()
    if not seq_doc.exists:
        return jsonify({"error": "Sequence not found"}), 404

    data = request.get_json() or {}
    allowed_fields = {"name", "contactIds", "steps", "status"}
    updates = {k: v for k, v in data.items() if k in allowed_fields}

    current = seq_doc.to_dict()
    # Handle pause/resume
    if "status" in updates:
        new_status = updates["status"]
        if new_status == "paused" and current["status"] == "active":
            updates["status"] = "paused"
        elif new_status == "active" and current["status"] == "paused":
            updates["status"] = "active"
            # Recompute nextRunAt for the current step
            step_index = current.get("currentStep", 0)
            steps = updates.get("steps", current.get("steps", []))
            if step_index < len(steps):
                delay = steps[step_index].get("delayDays", 0)
                updates["nextRunAt"] = (datetime.utcnow() + timedelta(days=delay)).isoformat()

    seq_ref.update(updates)
    updated = current | updates
    updated["id"] = sequence_id
    return jsonify(updated)


@sequences_bp.delete("/<sequence_id>")
@require_firebase_auth
def delete_sequence(sequence_id):
    uid = request.firebase_user["uid"]
    db = get_db()
    seq_ref = db.collection("users").document(uid).collection("sequences").document(sequence_id)
    seq_doc = seq_ref.get()
    if not seq_doc.exists:
        return jsonify({"error": "Sequence not found"}), 404
    seq_ref.delete()
    return jsonify({"success": True})


@sequences_bp.post("/<sequence_id>/start")
@require_firebase_auth
def start_sequence(sequence_id):
    uid = request.firebase_user["uid"]
    db = get_db()
    seq_ref = db.collection("users").document(uid).collection("sequences").document(sequence_id)
    seq_doc = seq_ref.get()
    if not seq_doc.exists:
        return jsonify({"error": "Sequence not found"}), 404

    sequence = seq_doc.to_dict()
    steps = sequence.get("steps", [])
    if not steps:
        return jsonify({"error": "Sequence has no steps"}), 400

    first_delay = steps[0].get("delayDays", 0)
    next_run = (datetime.utcnow() + timedelta(days=first_delay)).isoformat()

    # Initialize contact statuses
    contact_statuses = {}
    for cid in sequence.get("contactIds", []):
        contact_statuses[cid] = {
            "stepsCompleted": [],
            "skipped": False,
            "skipReason": None,
        }

    seq_ref.update({
        "status": "active",
        "currentStep": 0,
        "nextRunAt": next_run,
        "contactStatuses": contact_statuses,
    })

    updated = sequence
    updated["status"] = "active"
    updated["currentStep"] = 0
    updated["nextRunAt"] = next_run
    updated["contactStatuses"] = contact_statuses
    updated["id"] = sequence_id
    return jsonify(updated)


@sequences_bp.post("/<sequence_id>/execute")
@require_firebase_auth
def execute_sequence_step(sequence_id):
    uid = request.firebase_user["uid"]
    db = get_db()
    seq_ref = db.collection("users").document(uid).collection("sequences").document(sequence_id)
    seq_doc = seq_ref.get()
    if not seq_doc.exists:
        return jsonify({"error": "Sequence not found"}), 404

    sequence = seq_doc.to_dict()
    if sequence.get("status") != "active":
        return jsonify({"error": "Sequence is not active"}), 400

    steps = sequence.get("steps", [])
    current_step_index = sequence.get("currentStep", 0)
    if current_step_index >= len(steps):
        return jsonify({"error": "All steps completed"}), 400

    current_step = steps[current_step_index]

    # Get user profile
    user_doc = db.collection("users").document(uid).get()
    profile = user_doc.to_dict() if user_doc.exists else {}

    # Get template for this step
    template = {}
    if current_step.get("templateId"):
        tmpl_doc = (
            db.collection("users")
            .document(uid)
            .collection("emailTemplates")
            .document(current_step["templateId"])
            .get()
        )
        if tmpl_doc.exists:
            template = tmpl_doc.to_dict()

    # Override subject if provided in step
    if current_step.get("subject"):
        template["subject"] = current_step["subject"]

    # Get Gmail credentials
    gmail_doc = (
        db.collection("users")
        .document(uid)
        .collection("integrations")
        .document("gmail")
        .get()
    )
    if not gmail_doc.exists:
        return jsonify({"error": "Gmail not connected. Please connect Gmail first."}), 400
    gmail_creds = gmail_doc.to_dict()

    contact_statuses = sequence.get("contactStatuses", {})
    sent_count = 0
    skipped_count = 0

    for contact_id in sequence.get("contactIds", []):
        contact_doc = (
            db.collection("users")
            .document(uid)
            .collection("contacts")
            .document(contact_id)
            .get()
        )
        if not contact_doc.exists:
            skipped_count += 1
            continue

        contact = contact_doc.to_dict()

        # Check if contact should be skipped
        has_replied = contact.get("hasUnreadReply", False)
        pipeline_stage = contact.get("pipelineStage", "")

        if has_replied or pipeline_stage in TERMINAL_STAGES:
            skipped_count += 1
            if contact_id in contact_statuses:
                contact_statuses[contact_id]["skipped"] = True
                contact_statuses[contact_id]["skipReason"] = (
                    "replied" if has_replied else f"stage:{pipeline_stage}"
                )
            continue

        if not contact.get("email"):
            skipped_count += 1
            continue

        try:
            email = generate_personalized_email(
                template=template,
                contact=contact,
                profile=profile,
            )
            result = create_draft(
                gmail_creds=gmail_creds,
                to=contact["email"],
                subject=email["subject"],
                body=email["body"],
                uid=uid,
            )
            send_result = send_draft(
                gmail_creds=gmail_creds,
                draft_id=result["draftId"],
                uid=uid,
            )
            sent_count += 1

            # Update contact
            db.collection("users").document(uid).collection("contacts").document(contact_id).update({
                "pipelineStage": contact.get("pipelineStage") or "no_response",
                "gmailThreadId": send_result.get("threadId", ""),
            })

            # Track step completion
            if contact_id in contact_statuses:
                contact_statuses[contact_id]["stepsCompleted"].append({
                    "stepIndex": current_step_index,
                    "sentAt": datetime.utcnow().isoformat(),
                    "threadId": send_result.get("threadId", ""),
                })

        except Exception as e:
            logger.error(f"Failed to send sequence email to {contact_id}: {e}")
            skipped_count += 1

    # Advance to next step
    next_step_index = current_step_index + 1
    updates = {"contactStatuses": contact_statuses}

    if next_step_index < len(steps):
        next_delay = steps[next_step_index].get("delayDays", 0)
        updates["currentStep"] = next_step_index
        updates["nextRunAt"] = (datetime.utcnow() + timedelta(days=next_delay)).isoformat()
    else:
        updates["currentStep"] = next_step_index
        updates["status"] = "completed"
        updates["nextRunAt"] = None

    seq_ref.update(updates)

    remaining_steps = max(0, len(steps) - next_step_index)
    return jsonify({
        "sent": sent_count,
        "skipped": skipped_count,
        "remaining": remaining_steps,
        "currentStep": next_step_index,
        "status": updates.get("status", "active"),
    })


@sequences_bp.get("/<sequence_id>/status")
@require_firebase_auth
def get_sequence_status(sequence_id):
    uid = request.firebase_user["uid"]
    db = get_db()
    seq_ref = db.collection("users").document(uid).collection("sequences").document(sequence_id)
    seq_doc = seq_ref.get()
    if not seq_doc.exists:
        return jsonify({"error": "Sequence not found"}), 404

    sequence = seq_doc.to_dict()
    sequence["id"] = sequence_id

    # Enrich contact statuses with contact names
    contact_details = []
    for contact_id in sequence.get("contactIds", []):
        contact_doc = (
            db.collection("users")
            .document(uid)
            .collection("contacts")
            .document(contact_id)
            .get()
        )
        contact_info = {"contactId": contact_id}
        if contact_doc.exists:
            c = contact_doc.to_dict()
            contact_info["name"] = f"{c.get('firstName', '')} {c.get('lastName', '')}".strip()
            contact_info["email"] = c.get("email", "")
            contact_info["pipelineStage"] = c.get("pipelineStage", "")
            contact_info["hasReplied"] = c.get("hasUnreadReply", False)

        status = sequence.get("contactStatuses", {}).get(contact_id, {})
        contact_info["stepsCompleted"] = status.get("stepsCompleted", [])
        contact_info["skipped"] = status.get("skipped", False)
        contact_info["skipReason"] = status.get("skipReason")
        contact_details.append(contact_info)

    return jsonify({
        "id": sequence_id,
        "name": sequence.get("name"),
        "status": sequence.get("status"),
        "currentStep": sequence.get("currentStep", 0),
        "totalSteps": len(sequence.get("steps", [])),
        "nextRunAt": sequence.get("nextRunAt"),
        "steps": sequence.get("steps", []),
        "contacts": contact_details,
    })
