import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify
from app.extensions import require_firebase_auth, get_db

tasks_bp = Blueprint("tasks", __name__, url_prefix="/api/tasks")


@tasks_bp.get("/")
@require_firebase_auth
def list_tasks():
    uid = request.firebase_user["uid"]
    db = get_db()
    docs = db.collection("users").document(uid).collection("tasks").stream()
    tasks = []
    for doc in docs:
        t = doc.to_dict()
        t["id"] = doc.id
        # Auto-set overdue status
        if t.get("status") == "open" and t.get("dueDate"):
            try:
                due = datetime.fromisoformat(t["dueDate"].replace("Z", "+00:00"))
                if due < datetime.now(due.tzinfo):
                    t["status"] = "overdue"
            except (ValueError, TypeError):
                pass
        tasks.append(t)
    return jsonify(tasks)


@tasks_bp.get("/due-today")
@require_firebase_auth
def due_today():
    """Get tasks due today or overdue — for dashboard widget."""
    uid = request.firebase_user["uid"]
    db = get_db()
    docs = db.collection("users").document(uid).collection("tasks").stream()
    today = datetime.now().date()
    result = []
    for doc in docs:
        t = doc.to_dict()
        t["id"] = doc.id
        if t.get("status") == "completed":
            continue
        if t.get("dueDate"):
            try:
                due = datetime.fromisoformat(t["dueDate"].replace("Z", "+00:00")).date()
                if due <= today:
                    t["status"] = "overdue" if due < today else "open"
                    result.append(t)
            except (ValueError, TypeError):
                pass
    # Sort by due date ascending
    result.sort(key=lambda x: x.get("dueDate", ""))
    return jsonify(result[:10])


@tasks_bp.post("/")
@require_firebase_auth
def create_task():
    uid = request.firebase_user["uid"]
    db = get_db()
    data = request.get_json() or {}

    title = data.get("title", "").strip()
    if not title:
        return jsonify({"error": "Title is required"}), 400

    task_id = str(uuid.uuid4())
    task = {
        "title": title,
        "contactId": data.get("contactId", ""),
        "contactName": data.get("contactName", ""),
        "dueDate": data.get("dueDate", ""),
        "priority": data.get("priority", "medium"),
        "status": "open",
        "notes": data.get("notes", ""),
        "createdFrom": data.get("createdFrom", "manual"),
        "completedAt": None,
        "createdAt": datetime.utcnow().isoformat() + "Z",
    }

    db.collection("users").document(uid).collection("tasks").document(task_id).set(task)
    task["id"] = task_id
    return jsonify(task), 201


@tasks_bp.put("/<task_id>")
@require_firebase_auth
def update_task(task_id):
    uid = request.firebase_user["uid"]
    db = get_db()
    data = request.get_json() or {}
    allowed = {"title", "contactId", "contactName", "dueDate", "priority", "status", "notes"}
    updates = {k: v for k, v in data.items() if k in allowed}

    # If marking as completed, set completedAt
    if updates.get("status") == "completed":
        updates["completedAt"] = datetime.utcnow().isoformat() + "Z"
    elif updates.get("status") == "open":
        updates["completedAt"] = None

    if not updates:
        return jsonify({"error": "No valid fields"}), 400

    db.collection("users").document(uid).collection("tasks").document(task_id).update(updates)
    return jsonify({"success": True})


@tasks_bp.delete("/<task_id>")
@require_firebase_auth
def delete_task(task_id):
    uid = request.firebase_user["uid"]
    db = get_db()
    db.collection("users").document(uid).collection("tasks").document(task_id).delete()
    return jsonify({"success": True})
