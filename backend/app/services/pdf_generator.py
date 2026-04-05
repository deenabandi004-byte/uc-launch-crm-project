"""
PDF generator for quotes and invoices using ReportLab.
"""
import io
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_RIGHT, TA_CENTER


PURPLE = colors.HexColor("#7C3AED")
LIGHT_PURPLE = colors.HexColor("#EDE9FE")
DARK_GRAY = colors.HexColor("#111827")
GRAY = colors.HexColor("#6B7280")
LIGHT_GRAY = colors.HexColor("#F3F4F6")


def generate_quote_pdf(quote: dict, business: dict, contact: dict) -> bytes:
    """Generate a branded PDF for a quote."""
    return _generate_document(quote, business, contact, doc_type="quote")


def generate_invoice_pdf(invoice: dict, business: dict, contact: dict) -> bytes:
    """Generate a branded PDF for an invoice."""
    return _generate_document(invoice, business, contact, doc_type="invoice")


def _generate_document(doc: dict, business: dict, contact: dict, doc_type: str) -> bytes:
    buffer = io.BytesIO()
    pdf = SimpleDocTemplate(buffer, pagesize=letter,
                            leftMargin=0.75 * inch, rightMargin=0.75 * inch,
                            topMargin=0.6 * inch, bottomMargin=0.6 * inch)

    styles = getSampleStyleSheet()
    elements = []

    # Custom styles
    title_style = ParagraphStyle("DocTitle", parent=styles["Heading1"],
                                  fontSize=24, textColor=PURPLE, spaceAfter=4)
    heading_style = ParagraphStyle("Heading", parent=styles["Heading2"],
                                    fontSize=12, textColor=DARK_GRAY, spaceAfter=8)
    normal_style = ParagraphStyle("CustomNormal", parent=styles["Normal"],
                                   fontSize=10, textColor=DARK_GRAY)
    small_style = ParagraphStyle("Small", parent=styles["Normal"],
                                  fontSize=9, textColor=GRAY)
    right_style = ParagraphStyle("Right", parent=styles["Normal"],
                                  fontSize=10, alignment=TA_RIGHT, textColor=DARK_GRAY)
    right_small = ParagraphStyle("RightSmall", parent=styles["Normal"],
                                  fontSize=9, alignment=TA_RIGHT, textColor=GRAY)

    # ── Header: Business info (left) + Document info (right) ──
    doc_number = doc.get("quoteNumber" if doc_type == "quote" else "invoiceNumber", "")
    doc_label = "QUOTE" if doc_type == "quote" else "INVOICE"

    biz_name = business.get("companyName", "Your Business")
    biz_name_style = ParagraphStyle("BizName", parent=normal_style, fontSize=16, textColor=DARK_GRAY, spaceAfter=2)
    biz_lines = [Paragraph(f"<b>{biz_name}</b>", biz_name_style)]
    if business.get("industry"):
        biz_lines.append(Paragraph(business["industry"], small_style))
    if business.get("email"):
        biz_lines.append(Paragraph(business["email"], small_style))
    if business.get("phone"):
        biz_lines.append(Paragraph(business["phone"], small_style))
    if business.get("location"):
        biz_lines.append(Paragraph(business["location"], small_style))

    doc_label_style = ParagraphStyle("DocLabel", parent=right_style, fontSize=22, textColor=PURPLE, spaceAfter=4)
    doc_number_style = ParagraphStyle("DocNumber", parent=right_style, fontSize=11, textColor=GRAY, spaceAfter=6)
    doc_lines = [
        Paragraph(f"<b>{doc_label}</b>", doc_label_style),
        Paragraph(doc_number, doc_number_style),
        Paragraph(f"Date: {_format_date(doc.get('createdAt', ''))}", right_small),
    ]
    if doc_type == "quote" and doc.get("validUntil"):
        doc_lines.append(Paragraph(f"Valid until: {_format_date(doc['validUntil'])}", right_small))
    if doc_type == "invoice" and doc.get("dueDate"):
        doc_lines.append(Paragraph(f"Due: {_format_date(doc['dueDate'])}", right_small))
    if doc_type == "invoice" and doc.get("paymentTerms"):
        doc_lines.append(Paragraph(f"Terms: {doc['paymentTerms'].replace('_', ' ').title()}", right_small))

    header_data = [[biz_lines, doc_lines]]
    header_table = Table(header_data, colWidths=[3.5 * inch, 3.5 * inch])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 20))

    # ── Purple divider ──
    divider = Table([[""]], colWidths=[7 * inch], rowHeights=[3])
    divider.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), PURPLE)]))
    elements.append(divider)
    elements.append(Spacer(1, 16))

    # ── Bill To ──
    elements.append(Paragraph("<b>BILL TO</b>", ParagraphStyle("BillTo", parent=small_style, textColor=GRAY)))
    elements.append(Spacer(1, 4))
    contact_name = contact.get("name", f"{contact.get('firstName', '')} {contact.get('lastName', '')}".strip())
    elements.append(Paragraph(f"<b>{contact_name}</b>", normal_style))
    if contact.get("company"):
        elements.append(Paragraph(contact["company"], small_style))
    if contact.get("email"):
        elements.append(Paragraph(contact["email"], small_style))
    if contact.get("phone"):
        elements.append(Paragraph(contact["phone"], small_style))
    if contact.get("address"):
        elements.append(Paragraph(contact["address"], small_style))
    elements.append(Spacer(1, 20))

    # ── Line Items Table ──
    line_items = doc.get("lineItems", [])
    table_data = [["Description", "Qty", "Unit Price", "Total"]]
    for item in line_items:
        table_data.append([
            item.get("description", ""),
            str(item.get("quantity", 1)),
            f"${item.get('unitPrice', 0):,.2f}",
            f"${item.get('total', 0):,.2f}",
        ])

    col_widths = [3.5 * inch, 0.8 * inch, 1.2 * inch, 1.2 * inch]
    items_table = Table(table_data, colWidths=col_widths, repeatRows=1)
    items_table.setStyle(TableStyle([
        # Header row
        ("BACKGROUND", (0, 0), (-1, 0), PURPLE),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ("TOPPADDING", (0, 0), (-1, 0), 8),
        # Body rows
        ("FONTSIZE", (0, 1), (-1, -1), 10),
        ("TOPPADDING", (0, 1), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 6),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_GRAY]),
        # Alignment
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        # Grid
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 12))

    # ── Totals ──
    subtotal = doc.get("subtotal", 0)
    tax_rate = doc.get("taxRate", 0)
    discount = doc.get("discount", {})
    total = doc.get("total", 0)

    totals_data = [["Subtotal", f"${subtotal:,.2f}"]]
    if discount and discount.get("value", 0) > 0:
        disc_label = f"Discount ({discount['value']}%)" if discount.get("type") == "percent" else "Discount"
        disc_amount = subtotal * discount["value"] / 100 if discount.get("type") == "percent" else discount["value"]
        totals_data.append([disc_label, f"-${disc_amount:,.2f}"])
    if tax_rate > 0:
        tax_amount = (subtotal - (disc_amount if discount and discount.get("value", 0) > 0 else 0)) * tax_rate / 100
        totals_data.append([f"Tax ({tax_rate}%)", f"${tax_amount:,.2f}"])
    totals_data.append(["Total", f"${total:,.2f}"])

    totals_table = Table(totals_data, colWidths=[1.5 * inch, 1.2 * inch])
    totals_table.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        # Bold total row
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, -1), (-1, -1), 12),
        ("LINEABOVE", (0, -1), (-1, -1), 1.5, PURPLE),
        ("TOPPADDING", (0, -1), (-1, -1), 8),
    ]))
    # Right-align the totals table
    totals_wrapper = Table([[None, totals_table]], colWidths=[4.3 * inch, 2.7 * inch])
    totals_wrapper.setStyle(TableStyle([
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    elements.append(totals_wrapper)
    elements.append(Spacer(1, 24))

    # ── Notes ──
    if doc.get("notes"):
        elements.append(Paragraph("<b>Notes / Terms</b>", heading_style))
        elements.append(Paragraph(doc["notes"], small_style))
        elements.append(Spacer(1, 16))

    # ── Footer ──
    footer_style = ParagraphStyle("Footer", parent=styles["Normal"],
                                   fontSize=8, textColor=GRAY, alignment=TA_CENTER)
    elements.append(Spacer(1, 20))
    elements.append(Paragraph(f"Generated by OutboundCRM for {biz_name}", footer_style))

    pdf.build(elements)
    return buffer.getvalue()


def _format_date(date_str: str) -> str:
    if not date_str:
        return ""
    try:
        dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        return dt.strftime("%b %d, %Y")
    except (ValueError, TypeError):
        return date_str[:10] if len(date_str) >= 10 else date_str
