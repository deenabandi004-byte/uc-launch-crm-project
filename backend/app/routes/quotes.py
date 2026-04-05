import uuid
import base64
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, Response
from app.extensions import require_firebase_auth, get_db
from app.services.pdf_generator import generate_quote_pdf, generate_invoice_pdf

quotes_bp = Blueprint("quotes", __name__, url_prefix="/api/quotes")


def _next_number(db, uid, prefix):
    """Generate next sequential number like QUO-001, INV-001."""
    coll = "quotes" if prefix == "QUO" else "invoices"
    docs = list(db.collection("users").document(uid).collection(coll).stream())
    return f"{prefix}-{len(docs) + 1:03d}"


def _get_user_profile(db, uid):
    """Get business profile for PDF header."""
    doc = db.collection("users").document(uid).get()
    return doc.to_dict() if doc.exists else {}


def _get_contact(db, uid, contact_id):
    """Get contact data for PDF billing info."""
    if not contact_id:
        return {}
    doc = db.collection("users").document(uid).collection("contacts").document(contact_id).get()
    return doc.to_dict() if doc.exists else {}


# ── Quotes ──

@quotes_bp.get("/")
@require_firebase_auth
def list_quotes():
    uid = request.firebase_user["uid"]
    db = get_db()
    docs = db.collection("users").document(uid).collection("quotes").stream()
    quotes = []
    for doc in docs:
        q = doc.to_dict()
        q["id"] = doc.id
        quotes.append(q)
    quotes.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
    return jsonify(quotes)


@quotes_bp.post("/")
@require_firebase_auth
def create_quote():
    uid = request.firebase_user["uid"]
    db = get_db()
    data = request.get_json() or {}

    quote_id = str(uuid.uuid4())
    line_items = data.get("lineItems", [])

    # Compute totals
    subtotal = sum(item.get("total", 0) for item in line_items)
    tax_rate = data.get("taxRate", 0)
    discount = data.get("discount", {"type": "flat", "value": 0})
    disc_amount = 0
    if discount.get("value", 0) > 0:
        disc_amount = subtotal * discount["value"] / 100 if discount.get("type") == "percent" else discount["value"]
    taxable = subtotal - disc_amount
    tax_amount = taxable * tax_rate / 100
    total = taxable + tax_amount

    valid_days = data.get("validDays", 30)
    quote = {
        "quoteNumber": _next_number(db, uid, "QUO"),
        "contactId": data.get("contactId", ""),
        "contactName": data.get("contactName", ""),
        "lineItems": line_items,
        "subtotal": round(subtotal, 2),
        "taxRate": tax_rate,
        "discount": discount,
        "total": round(total, 2),
        "notes": data.get("notes", ""),
        "validUntil": (datetime.utcnow() + timedelta(days=valid_days)).isoformat() + "Z",
        "status": "draft",
        "pdfData": None,
        "sentAt": None,
        "createdAt": datetime.utcnow().isoformat() + "Z",
    }

    db.collection("users").document(uid).collection("quotes").document(quote_id).set(quote)
    quote["id"] = quote_id
    return jsonify(quote), 201


@quotes_bp.put("/<quote_id>")
@require_firebase_auth
def update_quote(quote_id):
    uid = request.firebase_user["uid"]
    db = get_db()
    data = request.get_json() or {}
    allowed = {"lineItems", "taxRate", "discount", "notes", "status", "contactId", "contactName"}
    updates = {k: v for k, v in data.items() if k in allowed}

    # Recompute totals if line items changed
    if "lineItems" in updates:
        line_items = updates["lineItems"]
        subtotal = sum(item.get("total", 0) for item in line_items)
        tax_rate = updates.get("taxRate", data.get("taxRate", 0))
        discount = updates.get("discount", data.get("discount", {"type": "flat", "value": 0}))
        disc_amount = 0
        if discount.get("value", 0) > 0:
            disc_amount = subtotal * discount["value"] / 100 if discount.get("type") == "percent" else discount["value"]
        taxable = subtotal - disc_amount
        tax_amount = taxable * tax_rate / 100
        updates["subtotal"] = round(subtotal, 2)
        updates["total"] = round(taxable + tax_amount, 2)

    if not updates:
        return jsonify({"error": "No valid fields"}), 400

    db.collection("users").document(uid).collection("quotes").document(quote_id).update(updates)
    return jsonify({"success": True})


@quotes_bp.delete("/<quote_id>")
@require_firebase_auth
def delete_quote(quote_id):
    uid = request.firebase_user["uid"]
    db = get_db()
    db.collection("users").document(uid).collection("quotes").document(quote_id).delete()
    return jsonify({"success": True})


@quotes_bp.post("/<quote_id>/pdf")
@require_firebase_auth
def generate_pdf(quote_id):
    """Generate PDF and return it as base64."""
    uid = request.firebase_user["uid"]
    db = get_db()

    doc = db.collection("users").document(uid).collection("quotes").document(quote_id).get()
    if not doc.exists:
        return jsonify({"error": "Quote not found"}), 404

    quote = doc.to_dict()
    business = _get_user_profile(db, uid)
    contact = _get_contact(db, uid, quote.get("contactId"))

    pdf_bytes = generate_quote_pdf(quote, business, contact)
    pdf_b64 = base64.b64encode(pdf_bytes).decode()

    return jsonify({"pdf": pdf_b64, "filename": f"{quote.get('quoteNumber', 'quote')}.pdf"})


@quotes_bp.post("/<quote_id>/convert")
@require_firebase_auth
def convert_to_invoice(quote_id):
    """Convert a quote to an invoice."""
    uid = request.firebase_user["uid"]
    db = get_db()

    doc = db.collection("users").document(uid).collection("quotes").document(quote_id).get()
    if not doc.exists:
        return jsonify({"error": "Quote not found"}), 404

    quote = doc.to_dict()
    data = request.get_json() or {}

    invoice_id = str(uuid.uuid4())
    payment_terms = data.get("paymentTerms", "net_30")
    days_map = {"due_on_receipt": 0, "net_15": 15, "net_30": 30, "net_60": 60}
    due_days = days_map.get(payment_terms, 30)

    invoice = {
        "invoiceNumber": _next_number(db, uid, "INV"),
        "contactId": quote.get("contactId", ""),
        "contactName": quote.get("contactName", ""),
        "quoteId": quote_id,
        "quoteNumber": quote.get("quoteNumber", ""),
        "lineItems": quote.get("lineItems", []),
        "subtotal": quote.get("subtotal", 0),
        "taxRate": quote.get("taxRate", 0),
        "discount": quote.get("discount", {}),
        "total": quote.get("total", 0),
        "notes": quote.get("notes", ""),
        "paymentTerms": payment_terms,
        "dueDate": (datetime.utcnow() + timedelta(days=due_days)).isoformat() + "Z",
        "status": "draft",
        "paidAt": None,
        "createdAt": datetime.utcnow().isoformat() + "Z",
    }

    db.collection("users").document(uid).collection("invoices").document(invoice_id).set(invoice)

    # Update quote status
    db.collection("users").document(uid).collection("quotes").document(quote_id).update({"status": "approved"})

    invoice["id"] = invoice_id
    return jsonify(invoice), 201


# ── Invoices ──

@quotes_bp.get("/invoices")
@require_firebase_auth
def list_invoices():
    uid = request.firebase_user["uid"]
    db = get_db()
    docs = db.collection("users").document(uid).collection("invoices").stream()
    invoices = []
    now = datetime.utcnow()
    for doc in docs:
        inv = doc.to_dict()
        inv["id"] = doc.id
        # Auto-set overdue
        if inv.get("status") == "sent" and inv.get("dueDate"):
            try:
                due = datetime.fromisoformat(inv["dueDate"].replace("Z", "+00:00")).replace(tzinfo=None)
                if due < now:
                    inv["status"] = "overdue"
            except (ValueError, TypeError):
                pass
        invoices.append(inv)
    invoices.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
    return jsonify(invoices)


@quotes_bp.post("/invoices")
@require_firebase_auth
def create_invoice():
    uid = request.firebase_user["uid"]
    db = get_db()
    data = request.get_json() or {}

    invoice_id = str(uuid.uuid4())
    line_items = data.get("lineItems", [])
    subtotal = sum(item.get("total", 0) for item in line_items)
    tax_rate = data.get("taxRate", 0)
    discount = data.get("discount", {"type": "flat", "value": 0})
    disc_amount = 0
    if discount.get("value", 0) > 0:
        disc_amount = subtotal * discount["value"] / 100 if discount.get("type") == "percent" else discount["value"]
    taxable = subtotal - disc_amount
    tax_amount = taxable * tax_rate / 100
    total = taxable + tax_amount

    payment_terms = data.get("paymentTerms", "net_30")
    days_map = {"due_on_receipt": 0, "net_15": 15, "net_30": 30, "net_60": 60}
    due_days = days_map.get(payment_terms, 30)

    invoice = {
        "invoiceNumber": _next_number(db, uid, "INV"),
        "contactId": data.get("contactId", ""),
        "contactName": data.get("contactName", ""),
        "quoteId": None,
        "lineItems": line_items,
        "subtotal": round(subtotal, 2),
        "taxRate": tax_rate,
        "discount": discount,
        "total": round(total, 2),
        "notes": data.get("notes", ""),
        "paymentTerms": payment_terms,
        "dueDate": (datetime.utcnow() + timedelta(days=due_days)).isoformat() + "Z",
        "status": "draft",
        "paidAt": None,
        "createdAt": datetime.utcnow().isoformat() + "Z",
    }

    db.collection("users").document(uid).collection("invoices").document(invoice_id).set(invoice)
    invoice["id"] = invoice_id
    return jsonify(invoice), 201


@quotes_bp.put("/invoices/<invoice_id>")
@require_firebase_auth
def update_invoice(invoice_id):
    uid = request.firebase_user["uid"]
    db = get_db()
    data = request.get_json() or {}
    allowed = {"lineItems", "taxRate", "discount", "notes", "status", "paymentTerms", "contactId", "contactName"}
    updates = {k: v for k, v in data.items() if k in allowed}

    if updates.get("status") == "paid":
        updates["paidAt"] = datetime.utcnow().isoformat() + "Z"
        # Move contact to "paid" pipeline stage
        inv_doc = db.collection("users").document(uid).collection("invoices").document(invoice_id).get()
        if inv_doc.exists:
            contact_id = inv_doc.to_dict().get("contactId")
            if contact_id:
                db.collection("users").document(uid).collection("contacts").document(contact_id).update({
                    "pipelineStage": "paid"
                })

    if not updates:
        return jsonify({"error": "No valid fields"}), 400
    db.collection("users").document(uid).collection("invoices").document(invoice_id).update(updates)
    return jsonify({"success": True})


@quotes_bp.post("/invoices/<invoice_id>/pdf")
@require_firebase_auth
def generate_invoice_pdf_route(invoice_id):
    uid = request.firebase_user["uid"]
    db = get_db()

    doc = db.collection("users").document(uid).collection("invoices").document(invoice_id).get()
    if not doc.exists:
        return jsonify({"error": "Invoice not found"}), 404

    invoice = doc.to_dict()
    business = _get_user_profile(db, uid)
    contact = _get_contact(db, uid, invoice.get("contactId"))

    pdf_bytes = generate_invoice_pdf(invoice, business, contact)
    pdf_b64 = base64.b64encode(pdf_bytes).decode()

    return jsonify({"pdf": pdf_b64, "filename": f"{invoice.get('invoiceNumber', 'invoice')}.pdf"})
