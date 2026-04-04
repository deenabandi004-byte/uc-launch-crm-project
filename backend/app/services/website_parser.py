"""
Website parser - uses Jina Reader + AI to extract business info from a URL
"""
import os
import json
import requests
from app.config import JINA_API_KEY, CLAUDE_API_KEY, OPENAI_API_KEY


def fetch_website_content(url: str) -> str:
    """Fetch website content using Jina Reader."""
    jina_url = f"https://r.jina.ai/{url}"
    headers = {}
    if JINA_API_KEY:
        headers["Authorization"] = f"Bearer {JINA_API_KEY}"
    headers["Accept"] = "text/plain"
    resp = requests.get(jina_url, headers=headers, timeout=30)
    resp.raise_for_status()
    return resp.text[:10000]  # Limit content


def extract_business_info(content: str) -> dict:
    """Use AI to extract structured business info from website content."""
    prompt = f"""Analyze this website content and extract business information. Return a JSON object with these fields:
- products: array of product/service names
- targetMarket: who they sell to (1-2 sentences)
- valueProps: array of key value propositions (3-5 items)
- employeeEstimate: rough estimate of company size
- industry: primary industry

Website content:
{content[:5000]}

Return ONLY valid JSON, no markdown formatting."""

    if CLAUDE_API_KEY:
        import anthropic
        client = anthropic.Anthropic(api_key=CLAUDE_API_KEY)
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        text = response.content[0].text
    elif OPENAI_API_KEY:
        import openai
        client = openai.OpenAI(api_key=OPENAI_API_KEY)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1024,
        )
        text = response.choices[0].message.content
    else:
        return {
            "products": [],
            "targetMarket": "Unable to parse - no AI API key configured",
            "valueProps": [],
            "employeeEstimate": "Unknown",
            "industry": "Unknown",
        }

    # Parse JSON from response
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0]
    return json.loads(text)


def parse_website(url: str) -> dict:
    """Main entry: fetch website and extract business info."""
    if not url.startswith("http"):
        url = f"https://{url}"
    content = fetch_website_content(url)
    info = extract_business_info(content)
    return info
