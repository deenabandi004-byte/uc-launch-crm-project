"""
Hunter.io client - email verification and finder
"""
import logging
import requests
from app.config import HUNTER_API_KEY

logger = logging.getLogger(__name__)

HUNTER_BASE_URL = "https://api.hunter.io/v2"


def verify_email(email: str) -> dict:
    """Verify a single email address via Hunter.

    Returns dict with:
        - status: "valid", "invalid", "accept_all", "webmail", "disposable", "unknown"
        - score: 0-100 deliverability score
        - result: "deliverable", "undeliverable", "risky", "unknown"
    """
    if not HUNTER_API_KEY:
        raise RuntimeError("Hunter API key not configured")

    resp = requests.get(
        f"{HUNTER_BASE_URL}/email-verifier",
        params={"email": email, "api_key": HUNTER_API_KEY},
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json().get("data", {})

    return {
        "status": data.get("status", "unknown"),
        "score": data.get("score", 0),
        "result": data.get("result", "unknown"),
        "email": email,
    }


def verify_emails_batch(emails: list) -> dict:
    """Verify multiple emails. Returns {email: verification_result}."""
    results = {}
    for email in emails:
        try:
            results[email] = verify_email(email)
        except Exception as e:
            logger.warning(f"Hunter verification failed for {email}: {e}")
            results[email] = {"status": "unknown", "score": 0, "result": "unknown", "email": email}
    return results


def find_email(domain: str, first_name: str, last_name: str) -> dict:
    """Find a professional email address using Hunter's email finder.

    Returns dict with email and confidence score.
    """
    if not HUNTER_API_KEY:
        raise RuntimeError("Hunter API key not configured")

    resp = requests.get(
        f"{HUNTER_BASE_URL}/email-finder",
        params={
            "domain": domain,
            "first_name": first_name,
            "last_name": last_name,
            "api_key": HUNTER_API_KEY,
        },
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json().get("data", {})

    return {
        "email": data.get("email", ""),
        "confidence": data.get("confidence", 0),
        "firstName": first_name,
        "lastName": last_name,
        "domain": domain,
    }
