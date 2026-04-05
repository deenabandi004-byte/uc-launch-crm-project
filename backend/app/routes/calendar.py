"""
Calendar integration - Google Calendar API endpoints for scheduling calls/meetings
"""
from datetime import datetime, timedelta, timezone
from flask import Blueprint, request, jsonify
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from app.extensions import require_firebase_auth, get_db

calendar_bp = Blueprint("calendar", __name__, url_prefix="/api/calendar")


def _get_calendar_service(gmail_creds: dict):
    """Build Google Calendar API service from stored OAuth credentials."""
    creds = Credentials(
        token=gmail_creds.get("token"),
        refresh_token=gmail_creds.get("refresh_token"),
        token_uri=gmail_creds.get("token_uri", "https://oauth2.googleapis.com/token"),
        client_id=gmail_creds.get("client_id"),
        client_secret=gmail_creds.get("client_secret"),
        scopes=gmail_creds.get("scopes", []),
    )
    return build("calendar", "v3", credentials=creds)


def _get_user_creds(uid: str) -> dict:
    """Fetch stored Gmail/Calendar OAuth credentials from Firestore."""
    db = get_db()
    doc = db.collection("users").document(uid).collection("integrations").document("gmail").get()
    if not doc.exists:
        return None
    return doc.to_dict()


@calendar_bp.get("/events")
@require_firebase_auth
def list_events():
    """List upcoming calendar events (next 30 days)."""
    uid = request.firebase_user["uid"]
    creds = _get_user_creds(uid)
    if not creds:
        return jsonify({"error": "Google Calendar not connected. Please connect Gmail first."}), 400

    try:
        service = _get_calendar_service(creds)
        now = datetime.now(timezone.utc)
        time_max = now + timedelta(days=30)

        result = service.events().list(
            calendarId="primary",
            timeMin=now.isoformat(),
            timeMax=time_max.isoformat(),
            singleEvents=True,
            orderBy="startTime",
            maxResults=100,
        ).execute()

        events = []
        for event in result.get("items", []):
            events.append({
                "id": event.get("id"),
                "summary": event.get("summary", "(No title)"),
                "start": event.get("start", {}).get("dateTime", event.get("start", {}).get("date", "")),
                "end": event.get("end", {}).get("dateTime", event.get("end", {}).get("date", "")),
                "attendees": [
                    {"email": a.get("email"), "name": a.get("displayName", ""), "responseStatus": a.get("responseStatus", "")}
                    for a in event.get("attendees", [])
                ],
                "description": event.get("description", ""),
                "htmlLink": event.get("htmlLink", ""),
            })

        return jsonify({"events": events})

    except Exception as e:
        return jsonify({"error": f"Failed to fetch calendar events: {str(e)}"}), 500


@calendar_bp.post("/events")
@require_firebase_auth
def create_event():
    """Create a new calendar event and send invite."""
    uid = request.firebase_user["uid"]
    creds = _get_user_creds(uid)
    if not creds:
        return jsonify({"error": "Google Calendar not connected. Please connect Gmail first."}), 400

    data = request.get_json() or {}
    summary = data.get("summary")
    start_time = data.get("startTime")
    end_time = data.get("endTime")

    if not summary or not start_time or not end_time:
        return jsonify({"error": "summary, startTime, and endTime are required"}), 400

    event_body = {
        "summary": summary,
        "description": data.get("description", ""),
        "start": {"dateTime": start_time, "timeZone": "UTC"},
        "end": {"dateTime": end_time, "timeZone": "UTC"},
    }

    attendee_email = data.get("attendeeEmail")
    if attendee_email:
        event_body["attendees"] = [{"email": attendee_email}]
        event_body["conferenceData"] = None  # Let Google handle defaults

    try:
        service = _get_calendar_service(creds)
        created = service.events().insert(
            calendarId="primary",
            body=event_body,
            sendUpdates="all",  # Send calendar invite to attendees
        ).execute()

        # If contactId provided, update the contact record
        contact_id = data.get("contactId")
        if contact_id:
            db = get_db()
            db.collection("users").document(uid).collection("contacts").document(contact_id).update({
                "lastCalendarEvent": {
                    "eventId": created.get("id"),
                    "summary": summary,
                    "startTime": start_time,
                    "endTime": end_time,
                    "createdAt": datetime.now(timezone.utc).isoformat(),
                },
            })

        return jsonify({
            "id": created.get("id"),
            "summary": created.get("summary"),
            "htmlLink": created.get("htmlLink"),
            "start": created.get("start", {}).get("dateTime", ""),
            "end": created.get("end", {}).get("dateTime", ""),
        }), 201

    except Exception as e:
        return jsonify({"error": f"Failed to create event: {str(e)}"}), 500


@calendar_bp.put("/events/<event_id>")
@require_firebase_auth
def update_event(event_id):
    """Update an existing calendar event."""
    uid = request.firebase_user["uid"]
    creds = _get_user_creds(uid)
    if not creds:
        return jsonify({"error": "Google Calendar not connected. Please connect Gmail first."}), 400

    data = request.get_json() or {}
    update_body = {}

    if "summary" in data:
        update_body["summary"] = data["summary"]
    if "description" in data:
        update_body["description"] = data["description"]
    if "startTime" in data:
        update_body["start"] = {"dateTime": data["startTime"], "timeZone": "UTC"}
    if "endTime" in data:
        update_body["end"] = {"dateTime": data["endTime"], "timeZone": "UTC"}
    if "attendeeEmail" in data:
        update_body["attendees"] = [{"email": data["attendeeEmail"]}]

    if not update_body:
        return jsonify({"error": "No fields to update"}), 400

    try:
        service = _get_calendar_service(creds)
        updated = service.events().patch(
            calendarId="primary",
            eventId=event_id,
            body=update_body,
            sendUpdates="all",
        ).execute()

        return jsonify({
            "id": updated.get("id"),
            "summary": updated.get("summary"),
            "htmlLink": updated.get("htmlLink"),
            "start": updated.get("start", {}).get("dateTime", ""),
            "end": updated.get("end", {}).get("dateTime", ""),
        })

    except Exception as e:
        return jsonify({"error": f"Failed to update event: {str(e)}"}), 500


@calendar_bp.delete("/events/<event_id>")
@require_firebase_auth
def delete_event(event_id):
    """Delete/cancel a calendar event."""
    uid = request.firebase_user["uid"]
    creds = _get_user_creds(uid)
    if not creds:
        return jsonify({"error": "Google Calendar not connected. Please connect Gmail first."}), 400

    try:
        service = _get_calendar_service(creds)
        service.events().delete(
            calendarId="primary",
            eventId=event_id,
            sendUpdates="all",
        ).execute()

        return jsonify({"success": True})

    except Exception as e:
        return jsonify({"error": f"Failed to delete event: {str(e)}"}), 500


@calendar_bp.get("/availability")
@require_firebase_auth
def get_availability():
    """Get free/busy slots for a date range (business hours 9am-5pm, 30-min increments)."""
    uid = request.firebase_user["uid"]
    creds = _get_user_creds(uid)
    if not creds:
        return jsonify({"error": "Google Calendar not connected. Please connect Gmail first."}), 400

    start_date = request.args.get("startDate")
    end_date = request.args.get("endDate")

    if not start_date or not end_date:
        return jsonify({"error": "startDate and endDate query params are required"}), 400

    try:
        service = _get_calendar_service(creds)

        # Parse dates
        start_dt = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))

        # Query free/busy
        freebusy = service.freebusy().query(body={
            "timeMin": start_dt.isoformat(),
            "timeMax": end_dt.isoformat(),
            "items": [{"id": "primary"}],
        }).execute()

        busy_periods = freebusy.get("calendars", {}).get("primary", {}).get("busy", [])

        # Convert busy periods to a set of occupied 30-min slots
        busy_slots = set()
        for period in busy_periods:
            busy_start = datetime.fromisoformat(period["start"].replace("Z", "+00:00"))
            busy_end = datetime.fromisoformat(period["end"].replace("Z", "+00:00"))
            slot = busy_start.replace(minute=(busy_start.minute // 30) * 30, second=0, microsecond=0)
            while slot < busy_end:
                busy_slots.add(slot.isoformat())
                slot += timedelta(minutes=30)

        # Generate free slots for business hours (9am-5pm UTC) each day
        free_slots = []
        current_day = start_dt.replace(hour=0, minute=0, second=0, microsecond=0)
        end_day = end_dt.replace(hour=0, minute=0, second=0, microsecond=0)

        while current_day <= end_day:
            # Skip weekends (5=Saturday, 6=Sunday)
            if current_day.weekday() < 5:
                for hour in range(9, 17):
                    for minute in [0, 30]:
                        slot_start = current_day.replace(hour=hour, minute=minute)
                        slot_end = slot_start + timedelta(minutes=30)
                        if slot_start.isoformat() not in busy_slots:
                            free_slots.append({
                                "start": slot_start.isoformat(),
                                "end": slot_end.isoformat(),
                            })
            current_day += timedelta(days=1)

        return jsonify({"freeSlots": free_slots, "busyPeriods": busy_periods})

    except Exception as e:
        return jsonify({"error": f"Failed to get availability: {str(e)}"}), 500
