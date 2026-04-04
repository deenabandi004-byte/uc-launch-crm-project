"""
Website parser - uses Jina Reader + AI to extract business info from a URL
"""
import os
import json
import re
import logging
import requests
from app.config import JINA_API_KEY, CLAUDE_API_KEY, OPENAI_API_KEY

logger = logging.getLogger(__name__)


def fetch_website_content(url: str) -> str:
    """Fetch website content using Jina Reader, with direct HTTP fallback."""
    # Try Jina Reader first
    try:
        jina_url = f"https://r.jina.ai/{url}"
        headers = {"Accept": "text/plain"}
        if JINA_API_KEY:
            headers["Authorization"] = f"Bearer {JINA_API_KEY}"
        resp = requests.get(jina_url, headers=headers, timeout=15)
        resp.raise_for_status()
        content = resp.text.strip()
        if content and len(content) > 50:
            return content[:10000]
    except Exception as e:
        logger.warning(f"Jina Reader failed for {url}: {e}")

    # Fallback: fetch directly and extract text
    try:
        resp = requests.get(url, timeout=15, headers={
            "User-Agent": "Mozilla/5.0 (compatible; OutboundCRM/1.0)"
        })
        resp.raise_for_status()
        html = resp.text

        # Simple HTML text extraction without BeautifulSoup dependency
        # Remove script and style tags
        html = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)
        html = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.DOTALL | re.IGNORECASE)
        # Extract title
        title_match = re.search(r'<title[^>]*>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
        title = title_match.group(1).strip() if title_match else ""
        # Extract meta description
        meta_match = re.search(r'<meta[^>]*name=["\']description["\'][^>]*content=["\'](.*?)["\']', html, re.IGNORECASE)
        if not meta_match:
            meta_match = re.search(r'<meta[^>]*content=["\'](.*?)["\'][^>]*name=["\']description["\']', html, re.IGNORECASE)
        description = meta_match.group(1).strip() if meta_match else ""
        # Strip remaining tags
        text = re.sub(r'<[^>]+>', ' ', html)
        text = re.sub(r'\s+', ' ', text).strip()

        content_parts = []
        if title:
            content_parts.append(f"Title: {title}")
        if description:
            content_parts.append(f"Description: {description}")
        content_parts.append(text[:8000])
        return "\n".join(content_parts)[:10000]
    except Exception as e:
        logger.warning(f"Direct fetch also failed for {url}: {e}")
        raise ValueError(f"Could not fetch website content from {url}")


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

    text = None

    if CLAUDE_API_KEY:
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=CLAUDE_API_KEY)
            response = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}],
            )
            text = response.content[0].text
        except Exception as e:
            logger.warning(f"Claude API failed: {e}")

    if text is None and OPENAI_API_KEY:
        try:
            import openai
            client = openai.OpenAI(api_key=OPENAI_API_KEY)
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=1024,
            )
            text = response.choices[0].message.content
        except Exception as e:
            logger.warning(f"OpenAI API failed: {e}")

    if text is None:
        # No working AI key - extract basic info from content directly
        lines = [l.strip() for l in content[:3000].split('\n') if l.strip() and len(l.strip()) > 10]
        return {
            "products": [],
            "targetMarket": lines[0] if lines else "Visit website for details",
            "valueProps": lines[1:4] if len(lines) > 1 else [],
            "employeeEstimate": "Unknown",
            "industry": "Unknown",
            "rawSummary": " ".join(lines[:5]) if lines else content[:500],
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
