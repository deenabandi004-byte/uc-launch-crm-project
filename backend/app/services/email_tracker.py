"""
Email tracking service - generates tracking pixels and wraps links for open/click tracking.
"""
import re
import uuid
from datetime import datetime, timezone
from app.extensions import get_db


def generate_tracking_pixel(user_id: str, contact_id: str, campaign_id: str) -> tuple:
    """Generate a tracking pixel. Returns (tracking_id, pixel_url)."""
    db = get_db()
    tracking_id = str(uuid.uuid4())
    db.collection("tracking_pixels").document(tracking_id).set({
        "userId": user_id,
        "contactId": contact_id,
        "campaignId": campaign_id,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    })
    pixel_url = f"/t/{tracking_id}.png"
    return tracking_id, pixel_url


def wrap_links(body: str, user_id: str, contact_id: str, campaign_id: str) -> str:
    """Replace URLs in email body with tracking redirect URLs."""
    db = get_db()

    # Match http/https URLs, but not mailto: links
    url_pattern = re.compile(r'https?://[^\s"\'<>]+')

    def replace_url(match):
        original_url = match.group(0)
        # Don't wrap the tracking pixel URL itself
        if "/t/" in original_url and original_url.endswith(".png"):
            return original_url
        link_id = str(uuid.uuid4())
        db.collection("tracking_links").document(link_id).set({
            "userId": user_id,
            "contactId": contact_id,
            "campaignId": campaign_id,
            "originalUrl": original_url,
            "createdAt": datetime.now(timezone.utc).isoformat(),
        })
        return f"/c/{link_id}"

    return url_pattern.sub(replace_url, body)


def inject_tracking(body: str, user_id: str, contact_id: str, campaign_id: str, base_url: str) -> str:
    """Add tracking pixel to email body and wrap links."""
    # Wrap links first (with full base_url so redirects work)
    tracked_body = wrap_links(body, user_id, contact_id, campaign_id)

    # Fix relative tracking redirect URLs to be absolute
    tracked_body = tracked_body.replace('"/c/', f'"{base_url}/c/')
    tracked_body = tracked_body.replace("'/c/", f"'{base_url}/c/")
    # Also handle bare /c/ URLs not in quotes (e.g. href=/c/...)
    tracked_body = re.sub(
        r'(?<=href=)(/c/[^\s"\'<>]+)',
        lambda m: f"{base_url}{m.group(1)}",
        tracked_body,
    )

    # Generate and append tracking pixel
    tracking_id, pixel_path = generate_tracking_pixel(user_id, contact_id, campaign_id)
    pixel_url = f"{base_url}{pixel_path}"
    pixel_tag = f'<img src="{pixel_url}" width="1" height="1" style="display:none" alt="" />'
    tracked_body += pixel_tag

    return tracked_body
