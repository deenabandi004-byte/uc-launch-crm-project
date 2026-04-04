"""
People Data Labs client - simplified for B2B contact finding
"""
import requests
from app.config import PEOPLE_DATA_LABS_API_KEY, PDL_BASE_URL, PDL_METRO_AREAS

DEFAULT_TITLES = [
    "VP", "Director", "Manager", "Head of", "Founder", "CEO",
    "CTO", "COO", "CMO", "President", "Owner", "Partner",
]


def find_contacts(company: str, domain: str = "", titles: list = None, location: str = "") -> list:
    """Find B2B contacts at a company using PDL."""
    if not PEOPLE_DATA_LABS_API_KEY:
        raise RuntimeError("People Data Labs API key not configured")

    if not titles:
        titles = DEFAULT_TITLES

    # Build ES query
    must_clauses = []

    if domain:
        must_clauses.append({"term": {"job_company_website": domain}})
    elif company:
        must_clauses.append({"match": {"job_company_name": company}})

    # Title filter - match any of the provided titles
    title_should = [{"match_phrase": {"job_title": t}} for t in titles]
    must_clauses.append({"bool": {"should": title_should}})

    # Location filter
    if location:
        normalized = PDL_METRO_AREAS.get(location.lower(), location)
        must_clauses.append({"match": {"location_name": normalized}})

    query = {"bool": {"must": must_clauses}}

    import json
    resp = requests.post(
        f"{PDL_BASE_URL}/person/search",
        headers={
            "X-Api-Key": PEOPLE_DATA_LABS_API_KEY,
            "Content-Type": "application/json",
        },
        json={"query": query, "size": 10},
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()

    contacts = []
    for person in data.get("data", []):
        email = person.get("work_email") or person.get("recommended_personal_email") or ""
        if not email:
            emails = person.get("emails", [])
            if emails:
                email = emails[0].get("address", "")

        contacts.append({
            "firstName": person.get("first_name", ""),
            "lastName": person.get("last_name", ""),
            "email": email,
            "jobTitle": person.get("job_title", ""),
            "company": person.get("job_company_name", company),
            "linkedinUrl": person.get("linkedin_url", ""),
            "location": person.get("location_name", ""),
        })

    return contacts
