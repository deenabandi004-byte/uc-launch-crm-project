"""
Gmail client - create drafts, send emails via Gmail API using OAuth tokens
"""
import logging
import base64
from email.mime.text import MIMEText
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

logger = logging.getLogger(__name__)


def _get_gmail_service(gmail_creds: dict, uid: str = ""):
    """Build Gmail API service from stored credentials, refreshing if needed."""
    creds = Credentials(
        token=gmail_creds.get("token"),
        refresh_token=gmail_creds.get("refresh_token"),
        token_uri=gmail_creds.get("token_uri", "https://oauth2.googleapis.com/token"),
        client_id=gmail_creds.get("client_id"),
        client_secret=gmail_creds.get("client_secret"),
        scopes=gmail_creds.get("scopes", []),
    )

    # Proactively refresh expired tokens and save back to Firestore
    if creds.expired or not creds.valid:
        try:
            creds.refresh(Request())
            if uid:
                _save_refreshed_token(uid, creds)
        except Exception as e:
            logger.error(f"Token refresh failed for uid={uid}: {e}")
            raise

    return build("gmail", "v1", credentials=creds)


def _save_refreshed_token(uid: str, creds: Credentials):
    """Save refreshed access token back to Firestore."""
    try:
        from app.extensions import get_db
        db = get_db()
        db.collection("users").document(uid).collection("integrations").document("gmail").update({
            "token": creds.token,
        })
        logger.info(f"Refreshed Gmail token saved for uid={uid}")
    except Exception as e:
        logger.warning(f"Failed to save refreshed token: {e}")


def create_draft(gmail_creds: dict, to: str, subject: str, body: str, uid: str = "") -> dict:
    """Create a Gmail draft."""
    service = _get_gmail_service(gmail_creds, uid=uid)

    message = MIMEText(body, "html")
    message["to"] = to
    message["subject"] = subject

    raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
    draft = service.users().drafts().create(
        userId="me",
        body={"message": {"raw": raw}},
    ).execute()

    return {
        "draftId": draft["id"],
        "messageId": draft.get("message", {}).get("id", ""),
    }


def send_draft(gmail_creds: dict, draft_id: str, uid: str = "") -> dict:
    """Send a Gmail draft."""
    service = _get_gmail_service(gmail_creds, uid=uid)
    result = service.users().drafts().send(
        userId="me",
        body={"id": draft_id},
    ).execute()

    return {
        "messageId": result.get("id", ""),
        "threadId": result.get("threadId", ""),
    }


def send_email(gmail_creds: dict, to: str, subject: str, body: str, uid: str = "") -> dict:
    """Send an email directly without creating a draft first."""
    service = _get_gmail_service(gmail_creds, uid=uid)

    message = MIMEText(body, "html")
    message["to"] = to
    message["subject"] = subject

    raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
    result = service.users().messages().send(
        userId="me",
        body={"raw": raw},
    ).execute()

    return {
        "messageId": result.get("id", ""),
        "threadId": result.get("threadId", ""),
    }


def get_thread(gmail_creds: dict, thread_id: str, uid: str = "") -> dict:
    """Get a Gmail thread with all messages."""
    service = _get_gmail_service(gmail_creds, uid=uid)
    thread = service.users().threads().get(userId="me", id=thread_id).execute()
    return thread
