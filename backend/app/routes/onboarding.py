from flask import Blueprint, request, jsonify
from app.extensions import require_firebase_auth, get_db
from app.services.website_parser import parse_website

onboarding_bp = Blueprint("onboarding", __name__, url_prefix="/api/onboarding")


@onboarding_bp.post("/complete")
@require_firebase_auth
def complete_onboarding():
    uid = request.firebase_user["uid"]
    db = get_db()
    data = request.get_json() or {}

    profile = {
        "companyName": data.get("companyName", ""),
        "industry": data.get("industry", ""),
        "description": data.get("description", ""),
        "targetCustomers": data.get("targetCustomers", ""),
        "targetIndustries": data.get("targetIndustries", []),
        "location": data.get("location", ""),
        "website": data.get("website", ""),
        "parsedWebsite": data.get("parsedWebsite"),
        "needsOnboarding": False,
    }

    db.collection("users").document(uid).set(profile, merge=True)
    return jsonify({"success": True})


@onboarding_bp.post("/parse-website")
@require_firebase_auth
def parse_website_route():
    data = request.get_json() or {}
    url = data.get("url", "").strip()
    if not url:
        return jsonify({"error": "URL is required"}), 400

    try:
        result = parse_website(url)
        return jsonify(result)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Website parse failed: {e}", exc_info=True)
        return jsonify({"error": f"Failed to analyze website: {str(e)}"}), 500
