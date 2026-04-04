"""
AI-powered email personalization for campaigns
"""
import json
from app.config import CLAUDE_API_KEY, OPENAI_API_KEY


def generate_personalized_email(template: dict, contact: dict, profile: dict) -> dict:
    """Generate a personalized email using template + contact + business profile."""
    template_subject = template.get("subject", "Quick question")
    template_body = template.get("body", "")

    prompt = f"""You are an expert B2B email copywriter. Generate a personalized cold email.

TEMPLATE:
Subject: {template_subject}
Body: {template_body}

CONTACT INFO:
Name: {contact.get('firstName', '')} {contact.get('lastName', '')}
Title: {contact.get('jobTitle', '')}
Company: {contact.get('company', '')}

SENDER INFO:
Company: {profile.get('companyName', '')}
Industry: {profile.get('industry', '')}
Description: {profile.get('description', '')}
Sender Name: {profile.get('name', '')}

INSTRUCTIONS:
- Replace all template variables ({{{{firstName}}}}, {{{{companyName}}}}, etc.) with real values
- Make the email feel personal and relevant to the recipient
- Keep it concise (under 150 words)
- Use a professional but conversational tone
- Include a clear call-to-action

Return a JSON object with "subject" and "body" fields. Return ONLY valid JSON."""

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
            import logging
            logging.getLogger(__name__).warning(f"Claude API failed: {e}")

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
            import logging
            logging.getLogger(__name__).warning(f"OpenAI API failed: {e}")

    if text is None:
        # Fallback: simple variable replacement
        subject = template_subject
        body = template_body
        replacements = {
            "{{firstName}}": contact.get("firstName", "there"),
            "{{lastName}}": contact.get("lastName", ""),
            "{{companyName}}": contact.get("company", "your company"),
            "{{myCompany}}": profile.get("companyName", "our company"),
            "{{myName}}": profile.get("name", ""),
            "{{industry}}": profile.get("industry", "your industry"),
            "{{painPoint}}": "growth challenges",
            "{{valueProposition}}": profile.get("description", "our solutions"),
        }
        for key, val in replacements.items():
            subject = subject.replace(key, val)
            body = body.replace(key, val)
        return {"subject": subject, "body": body}

    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0]
    return json.loads(text)
