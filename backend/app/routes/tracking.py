"""
Tracking routes - open pixel, click redirect, and stats endpoints.
"""
import base64
from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify, redirect, Response
from app.extensions import require_firebase_auth, get_db

tracking_bp = Blueprint("tracking", __name__)

# 1x1 transparent PNG (68 bytes)
TRANSPARENT_PIXEL = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4"
    "nGNgYPgPAAEDAQAIicLsAAAABElFTkSuQmCC"
)


@tracking_bp.get("/t/<tracking_id>.png")
def track_open(tracking_id):
    """Tracking pixel endpoint - records email opens. No auth required."""
    db = get_db()

    # Look up tracking pixel metadata
    pixel_doc = db.collection("tracking_pixels").document(tracking_id).get()
    if not pixel_doc.exists:
        return Response(TRANSPARENT_PIXEL, mimetype="image/png")

    pixel_data = pixel_doc.to_dict()

    # Check for duplicate opens within 5 minutes
    five_min_ago = datetime.now(timezone.utc) - timedelta(minutes=5)
    recent = (
        db.collection("tracking")
        .where("trackingId", "==", tracking_id)
        .where("type", "==", "open")
        .where("createdAt", ">=", five_min_ago.isoformat())
        .limit(1)
        .stream()
    )
    if any(True for _ in recent):
        return Response(TRANSPARENT_PIXEL, mimetype="image/png")

    # Record the open event
    db.collection("tracking").add({
        "trackingId": tracking_id,
        "userId": pixel_data.get("userId", ""),
        "contactId": pixel_data.get("contactId", ""),
        "campaignId": pixel_data.get("campaignId", ""),
        "type": "open",
        "ip": request.remote_addr,
        "userAgent": request.headers.get("User-Agent", ""),
        "createdAt": datetime.now(timezone.utc).isoformat(),
    })

    return Response(TRANSPARENT_PIXEL, mimetype="image/png")


@tracking_bp.get("/c/<tracking_id>")
def track_click(tracking_id):
    """Click tracking redirect - records link clicks. No auth required."""
    db = get_db()

    # Look up tracking link
    link_doc = db.collection("tracking_links").document(tracking_id).get()
    if not link_doc.exists:
        return redirect("/")

    link_data = link_doc.to_dict()

    # Record the click event
    db.collection("tracking").add({
        "trackingId": tracking_id,
        "userId": link_data.get("userId", ""),
        "contactId": link_data.get("contactId", ""),
        "campaignId": link_data.get("campaignId", ""),
        "type": "click",
        "url": link_data.get("originalUrl", ""),
        "ip": request.remote_addr,
        "userAgent": request.headers.get("User-Agent", ""),
        "createdAt": datetime.now(timezone.utc).isoformat(),
    })

    return redirect(link_data.get("originalUrl", "/"))


@tracking_bp.get("/api/tracking/stats/<campaign_id>")
@require_firebase_auth
def campaign_stats(campaign_id):
    """Campaign tracking stats - requires auth."""
    db = get_db()

    events = (
        db.collection("tracking")
        .where("campaignId", "==", campaign_id)
        .stream()
    )

    opens = 0
    clicks = 0
    unique_open_contacts = set()
    unique_click_contacts = set()
    timeline = []

    for doc in events:
        event = doc.to_dict()
        entry = {
            "type": event.get("type"),
            "contactId": event.get("contactId"),
            "createdAt": event.get("createdAt"),
        }
        if event.get("url"):
            entry["url"] = event["url"]
        timeline.append(entry)

        if event.get("type") == "open":
            opens += 1
            unique_open_contacts.add(event.get("contactId"))
        elif event.get("type") == "click":
            clicks += 1
            unique_click_contacts.add(event.get("contactId"))

    # Sort timeline by createdAt descending
    timeline.sort(key=lambda x: x.get("createdAt", ""), reverse=True)

    return jsonify({
        "opens": opens,
        "uniqueOpens": len(unique_open_contacts),
        "clicks": clicks,
        "uniqueClicks": len(unique_click_contacts),
        "timeline": timeline,
    })


@tracking_bp.get("/api/tracking/contact/<contact_id>")
@require_firebase_auth
def contact_engagement(contact_id):
    """Contact engagement history - requires auth."""
    db = get_db()

    events = (
        db.collection("tracking")
        .where("contactId", "==", contact_id)
        .stream()
    )

    history = []
    for doc in events:
        event = doc.to_dict()
        event["id"] = doc.id
        history.append(event)

    history.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
    return jsonify(history)
