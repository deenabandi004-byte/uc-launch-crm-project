from flask import Blueprint, request, jsonify
from app.extensions import require_firebase_auth, get_db

pipeline_bp = Blueprint("pipeline", __name__, url_prefix="/api/pipeline")

VALID_STAGES = [
    "none", "new_lead", "contacted", "interested",
    "estimate_sent", "approved", "in_progress",
    "complete", "paid", "not_interested",
]


STAGE_MIGRATION = {
    "none": "new_lead",
    "no_response": "contacted",
    "replied": "interested",
    "call_scheduled": "interested",
    "proposal_sent": "estimate_sent",
    "won": "paid",
    "lost": "not_interested",
}


@pipeline_bp.get("/")
@require_firebase_auth
def get_pipeline():
    uid = request.firebase_user["uid"]
    db = get_db()
    docs = list(db.collection("users").document(uid).collection("contacts").stream())

    pipeline = {stage: [] for stage in VALID_STAGES if stage != "none"}
    for doc in docs:
        c = doc.to_dict()
        c["id"] = doc.id
        stage = c.get("pipelineStage", "none")

        # Migrate old stage values
        if stage in STAGE_MIGRATION:
            new_stage = STAGE_MIGRATION[stage]
            doc.reference.update({"pipelineStage": new_stage})
            stage = new_stage

        if stage in pipeline:
            pipeline[stage].append(c)

    return jsonify(pipeline)


@pipeline_bp.put("/move/<contact_id>")
@require_firebase_auth
def move_contact(contact_id):
    uid = request.firebase_user["uid"]
    db = get_db()
    data = request.get_json() or {}
    stage = data.get("stage", "")
    if stage not in VALID_STAGES:
        return jsonify({"error": f"Invalid stage. Valid: {VALID_STAGES}"}), 400
    db.collection("users").document(uid).collection("contacts").document(contact_id).update({
        "pipelineStage": stage,
    })
    return jsonify({"success": True})
