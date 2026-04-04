"""
Lead generation - uses AI + SERP to find target companies
"""
import os
import json
import requests
from app.config import CLAUDE_API_KEY, OPENAI_API_KEY, SERPAPI_KEY


def generate_leads(profile: dict) -> list:
    """Generate target company leads based on user's business profile."""
    company_name = profile.get("companyName", "")
    industry = profile.get("industry", "")
    description = profile.get("description", "")
    target_customers = profile.get("targetCustomers", "")
    target_industries = profile.get("targetIndustries", [])
    location = profile.get("location", "")
    parsed = profile.get("parsedWebsite") or {}

    prompt = f"""You are a B2B sales researcher. Based on this business profile, suggest 10 potential target companies that would be ideal customers.

Business: {company_name}
Industry: {industry}
Description: {description}
Target Customers: {target_customers}
Target Industries: {', '.join(target_industries) if target_industries else 'Any'}
Location Focus: {location}
Products/Services: {', '.join(parsed.get('products', []))}
Value Props: {', '.join(parsed.get('valueProps', []))}

For each company, provide:
- companyName: Full company name
- website: Company website URL
- industry: Their industry
- location: HQ location
- employeeCount: Approximate size (e.g., "50-200")
- description: Why they'd be a good target (1 sentence)
- relevanceScore: 1-10 relevance score

Return a JSON array of objects. Return ONLY valid JSON, no markdown."""

    text = None

    if CLAUDE_API_KEY:
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=CLAUDE_API_KEY)
            response = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=2048,
                messages=[{"role": "user", "content": prompt}],
            )
            text = response.content[0].text
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Claude API failed: {e}")

    if text is None and OPENAI_API_KEY:
        try:
            import openai
            client = openai.OpenAI(api_key=OPENAI_API_KEY)
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=2048,
            )
            text = response.choices[0].message.content
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"OpenAI API failed: {e}")

    if text is None:
        return []

    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0]
    return json.loads(text)


def search_companies(query: str) -> list:
    """Search for companies via SERP API."""
    if not SERPAPI_KEY:
        return [{"error": "SERP API key not configured"}]

    resp = requests.get(
        "https://serpapi.com/search",
        params={"q": query, "api_key": SERPAPI_KEY, "num": 10},
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()

    results = []
    for item in data.get("organic_results", [])[:10]:
        results.append({
            "companyName": item.get("title", ""),
            "website": item.get("link", ""),
            "description": item.get("snippet", ""),
            "domain": item.get("displayed_link", ""),
        })
    return results
