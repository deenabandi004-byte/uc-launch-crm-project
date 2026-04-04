"""
Gmail client - create drafts, send emails via Gmail API using OAuth tokens
"""
import base64
from email.mime.text import MIMEText
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build


def _get_gmail_service(gmail_creds: dict):
    """Build Gmail API service from stored credentials."""
    creds = Credentials(
        token=gmail_creds.get("token"),
        refresh_token=gmail_creds.get("refresh_token"),
        token_uri=gmail_creds.get("token_uri", "https://oauth2.googleapis.com/token"),
        client_id=gmail_creds.get("client_id"),
        client_secret=gmail_creds.get("client_secret"),
        scopes=gmail_creds.get("scopes", []),
    )
    return build("gmail", "v1", credentials=creds)


def create_draft(gmail_creds: dict, to: str, subject: str, body: str, uid: str = "") -> dict:
    """Create a Gmail draft."""
    service = _get_gmail_service(gmail_creds)

    message = MIMEText(body)
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
    service = _get_gmail_service(gmail_creds)
    result = service.users().drafts().send(
        userId="me",
        body={"id": draft_id},
    ).execute()

    return {
        "messageId": result.get("id", ""),
        "threadId": result.get("threadId", ""),
    }


def send_email(gmail_creds: dict, to: str, subject: str, body: str) -> dict:
    """Send an email directly without creating a draft first."""
    service = _get_gmail_service(gmail_creds)

    message = MIMEText(body)
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


def get_thread(gmail_creds: dict, thread_id: str) -> dict:
    """Get a Gmail thread with all messages."""
    service = _get_gmail_service(gmail_creds)
    thread = service.users().threads().get(userId="me", id=thread_id).execute()
    return thread
