"""
OutboundCRM configuration - environment variables and constants
"""
import os
from dotenv import load_dotenv

load_dotenv(override=True)

# API Keys
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
CLAUDE_API_KEY = os.getenv("CLAUDE_API_KEY")
PEOPLE_DATA_LABS_API_KEY = os.getenv("PEOPLE_DATA_LABS_API_KEY")
SERPAPI_KEY = os.getenv("SERPAPI_KEY")
JINA_API_KEY = os.getenv("JINA_API_KEY", "")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
FLASK_SECRET = os.getenv("FLASK_SECRET", "dev")

# Gmail OAuth
GMAIL_SCOPES = [
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events",
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
]

# Gmail push notifications (Pub/Sub)
GOOGLE_CLOUD_PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT_ID", "")
GMAIL_PUBSUB_TOPIC = os.getenv("GMAIL_PUBSUB_TOPIC", "")

def get_oauth_redirect_uri():
    env_uri = os.getenv("OAUTH_REDIRECT_URI")
    if env_uri:
        return env_uri
    is_production = os.getenv("FLASK_ENV") == "production" or os.getenv("RENDER")
    return (
        "https://outboundcrm.onrender.com/api/google/oauth/callback"
        if is_production
        else "http://localhost:5001/api/google/oauth/callback"
    )

def get_frontend_redirect_uri():
    is_production = os.getenv("FLASK_ENV") == "production" or os.getenv("RENDER")
    return (
        "https://outboundcrm.onrender.com/signin"
        if is_production
        else "http://localhost:5173/signin"
    )

OAUTH_REDIRECT_URI = get_oauth_redirect_uri()

# PDL
PDL_BASE_URL = "https://api.peopledatalabs.com/v5"

PDL_METRO_AREAS = {
    "san francisco": "san francisco, california",
    "bay area": "san francisco, california",
    "sf": "san francisco, california",
    "los angeles": "los angeles, california",
    "la": "los angeles, california",
    "new york": "new york, new york",
    "nyc": "new york, new york",
    "chicago": "chicago, illinois",
    "boston": "boston, massachusetts",
    "washington dc": "washington, district of columbia",
    "dc": "washington, district of columbia",
    "seattle": "seattle, washington",
    "atlanta": "atlanta, georgia",
    "dallas": "dallas, texas",
    "houston": "houston, texas",
    "miami": "miami, florida",
    "denver": "denver, colorado",
    "austin": "austin, texas",
    "san diego": "san diego, california",
    "portland": "portland, oregon",
    "nashville": "nashville, tennessee",
}

# Daily email send limit
DAILY_EMAIL_LIMIT = 500

# OAuth insecure transport for localhost
if (os.environ.get("OAUTH_REDIRECT_URI") or "").startswith("http://localhost"):
    os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"

# Validation
if not OPENAI_API_KEY and not CLAUDE_API_KEY:
    print("WARNING: No AI API key found (OPENAI_API_KEY or CLAUDE_API_KEY)")
if not PEOPLE_DATA_LABS_API_KEY:
    print("WARNING: PEOPLE_DATA_LABS_API_KEY not found")
if not SERPAPI_KEY:
    print("WARNING: SERPAPI_KEY not found")
