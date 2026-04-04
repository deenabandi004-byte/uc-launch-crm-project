import json
from flask import Blueprint, request, jsonify, redirect
from app.extensions import require_firebase_auth, get_db
from app.config import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GMAIL_SCOPES, OAUTH_REDIRECT_URI, get_frontend_redirect_uri
from google_auth_oauthlib.flow import Flow

gmail_oauth_bp = Blueprint("gmail_oauth", __name__, url_prefix="/api/google")


@gmail_oauth_bp.get("/oauth/start")
@require_firebase_auth
def google_oauth_start():
    uid = request.firebase_user["uid"]
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        return jsonify({"error": "Gmail OAuth not configured"}), 500

    client_config = {
        "web": {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [OAUTH_REDIRECT_URI],
        }
    }
    flow = Flow.from_client_config(client_config, scopes=GMAIL_SCOPES, redirect_uri=OAUTH_REDIRECT_URI)
    auth_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
        state=uid,
    )
    return jsonify({"authUrl": auth_url})


@gmail_oauth_bp.get("/oauth/callback")
def google_oauth_callback():
    code = request.args.get("code")
    state = request.args.get("state")  # uid
    frontend_url = get_frontend_redirect_uri()

    if not code or not state:
        return redirect(f"{frontend_url}?gmail_error=missing_params")

    try:
        client_config = {
            "web": {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [OAUTH_REDIRECT_URI],
            }
        }
        flow = Flow.from_client_config(client_config, scopes=GMAIL_SCOPES, redirect_uri=OAUTH_REDIRECT_URI)
        flow.fetch_token(code=code)
        creds = flow.credentials

        db = get_db()
        gmail_data = {
            "token": creds.token,
            "refresh_token": creds.refresh_token,
            "token_uri": creds.token_uri,
            "client_id": creds.client_id,
            "client_secret": creds.client_secret,
            "scopes": list(creds.scopes) if creds.scopes else GMAIL_SCOPES,
        }
        db.collection("users").document(state).collection("integrations").document("gmail").set(gmail_data)
        db.collection("users").document(state).update({"gmailConnected": True})

        return redirect(f"{frontend_url}?connected=gmail")
    except Exception as e:
        print(f"Gmail OAuth error: {e}")
        return redirect(f"{frontend_url}?gmail_error=auth_failed")


@gmail_oauth_bp.get("/gmail/status")
@require_firebase_auth
def gmail_status():
    uid = request.firebase_user["uid"]
    db = get_db()
    gmail_doc = db.collection("users").document(uid).collection("integrations").document("gmail").get()
    connected = gmail_doc.exists and bool(gmail_doc.to_dict().get("token"))
    return jsonify({"connected": connected})
