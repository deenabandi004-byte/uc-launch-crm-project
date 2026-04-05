"""
AI Reply Classifier — categorizes email replies into pipeline-actionable categories.

Categories:
  - interested: Wants to learn more, schedule a call, asks for pricing
  - not_interested: Declines, unsubscribes, asks to stop emailing
  - needs_info: Asks questions, wants more details before deciding
  - auto_reply: Out of office, vacation, automated responses
  - neutral: Acknowledgement, vague response, not clearly positive or negative
"""
import logging

logger = logging.getLogger(__name__)

CATEGORIES = ["interested", "not_interested", "needs_info", "auto_reply", "neutral"]

STAGE_MAP = {
    "interested": "interested",
    "not_interested": "not_interested",
    "needs_info": "contacted",
    "auto_reply": None,       # No stage change
    "neutral": "contacted",
}

CLASSIFY_PROMPT = """You are an email reply classifier for a B2B sales CRM. Analyze this email reply and categorize it.

Categories:
- interested: The person wants to learn more, is open to a meeting/call, asks about pricing, or shows positive intent
- not_interested: The person declines, says no, asks to be removed, unsubscribes, or shows clear negative intent
- needs_info: The person asks questions or wants more details before making a decision
- auto_reply: Out of office, vacation auto-reply, delivery notification, or automated response
- neutral: Simple acknowledgement ("thanks", "got it"), vague response, or unclear intent

Email subject: {subject}
Email body:
{body}

Respond with ONLY the category name (one of: interested, not_interested, needs_info, auto_reply, neutral). Nothing else."""


def classify_reply(subject: str, body: str) -> dict:
    """Classify an email reply using AI. Returns dict with category and confidence."""
    from app.config import CLAUDE_API_KEY, OPENAI_API_KEY

    prompt = CLASSIFY_PROMPT.format(subject=subject, body=body[:2000])

    # Try Claude first
    if CLAUDE_API_KEY:
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=CLAUDE_API_KEY)
            resp = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=20,
                messages=[{"role": "user", "content": prompt}],
            )
            category = resp.content[0].text.strip().lower().replace(" ", "_")
            if category in CATEGORIES:
                return {"category": category, "confidence": "high", "provider": "claude"}
        except Exception as e:
            logger.warning(f"Claude classification failed: {e}")

    # Fallback to OpenAI
    if OPENAI_API_KEY:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=OPENAI_API_KEY)
            resp = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=20,
                temperature=0,
            )
            category = resp.choices[0].message.content.strip().lower().replace(" ", "_")
            if category in CATEGORIES:
                return {"category": category, "confidence": "high", "provider": "openai"}
        except Exception as e:
            logger.warning(f"OpenAI classification failed: {e}")

    # Rule-based fallback
    return _rule_based_classify(subject, body)


def _rule_based_classify(subject: str, body: str) -> dict:
    """Simple keyword-based fallback classification."""
    text = f"{subject} {body}".lower()

    ooo_keywords = ["out of office", "auto-reply", "automatic reply", "on vacation",
                     "on leave", "will be back", "limited access", "away from"]
    if any(k in text for k in ooo_keywords):
        return {"category": "auto_reply", "confidence": "medium", "provider": "rules"}

    negative_keywords = ["not interested", "no thanks", "no thank you", "unsubscribe",
                         "remove me", "stop emailing", "don't contact", "do not contact",
                         "not a good fit", "pass on this", "decline"]
    if any(k in text for k in negative_keywords):
        return {"category": "not_interested", "confidence": "medium", "provider": "rules"}

    positive_keywords = ["interested", "tell me more", "schedule a call", "let's chat",
                         "set up a time", "demo", "pricing", "sounds good", "love to",
                         "would like to", "let's connect", "free this week", "available"]
    if any(k in text for k in positive_keywords):
        return {"category": "interested", "confidence": "medium", "provider": "rules"}

    question_keywords = ["how does", "what is", "can you explain", "more information",
                         "details", "what are", "how much", "how many", "wondering"]
    if any(k in text for k in question_keywords):
        return {"category": "needs_info", "confidence": "low", "provider": "rules"}

    return {"category": "neutral", "confidence": "low", "provider": "rules"}
