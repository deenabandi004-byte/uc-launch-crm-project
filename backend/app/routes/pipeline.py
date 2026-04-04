from flask import Blueprint, request, jsonify
from app.extensions import require_firebase_auth, get_db

pipeline_bp = Blueprint("pipeline", __name__, url_prefix="/api/pipeline")

VALID_STAGES = [
    "none", "no_response", "replied", "call_scheduled",
    "proposal_sent", "won", "not_interested", "lost",
]


@pipeline_bp.get("/")
@require_firebase_auth
def get_pipeline():
    uid = request.firebase_user["uid"]
    db = get_db()
    docs = db.collection("users").document(uid).collection("contacts").stream()

    pipeline = {stage: [] for stage in VALID_STAGES if stage != "none"}
    for doc in docs:
        c = doc.to_dict()
        c["id"] = doc.id
        stage = c.get("pipelineStage", "none")
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
