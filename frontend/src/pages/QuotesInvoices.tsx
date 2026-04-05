import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getQuotes, createQuote, deleteQuote, generateQuotePdf, convertQuoteToInvoice,
  getInvoices, createInvoice, updateInvoice, generateInvoicePdf, getContacts,
} from "../services/api";
import { toast } from "sonner";
import {
  FileText, Plus, Loader2, Trash2, Download, Send,
  ArrowRight, DollarSign, CheckCircle, Clock, AlertCircle,
} from "lucide-react";

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  draft: { bg: "#F1F5F9", color: "#64748B" },
  sent: { bg: "#F5F3FF", color: "#7C3AED" },
  approved: { bg: "#F0FDF4", color: "#16A34A" },
  rejected: { bg: "#FEE2E2", color: "#DC2626" },
  expired: { bg: "#F1F5F9", color: "#94A3B8" },
  paid: { bg: "#ECFDF5", color: "#059669" },
  overdue: { bg: "#FEE2E2", color: "#DC2626" },
  viewed: { bg: "#F5F3FF", color: "#7C3AED" },
};

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

const font = "'Inter', sans-serif";
const serifFont = "'Libre Baskerville', Georgia, serif";

export default function QuotesInvoices() {
  const queryClient = useQueryClient();
  const { data: quotes = [], isLoading: quotesLoading } = useQuery({ queryKey: ["quotes"], queryFn: getQuotes });
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({ queryKey: ["invoices"], queryFn: getInvoices });
  const { data: contacts = [] } = useQuery({ queryKey: ["contacts"], queryFn: getContacts });
  const [tab, setTab] = useState<"quotes" | "invoices">("quotes");
  const [showBuilder, setShowBuilder] = useState(false);
  const [builderType, setBuilderType] = useState<"quote" | "invoice">("quote");

  // Builder form state
  const [contactId, setContactId] = useState("");
  const [contactName, setContactName] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unitPrice: 0, total: 0 },
  ]);
  const [taxRate, setTaxRate] = useState(0);
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState<"flat" | "percent">("percent");
  const [notes, setNotes] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("net_30");

  const resetBuilder = () => {
    setContactId("");
    setContactName("");
    setLineItems([{ description: "", quantity: 1, unitPrice: 0, total: 0 }]);
    setTaxRate(0);
    setDiscountValue(0);
    setNotes("");
    setShowBuilder(false);
  };

  const createQuoteMutation = useMutation({
    mutationFn: (data: any) => createQuote(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Quote created!");
      resetBuilder();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const createInvoiceMutation = useMutation({
    mutationFn: (data: any) => createInvoice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice created!");
      resetBuilder();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteQuote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Quote deleted");
    },
  });

  const convertMutation = useMutation({
    mutationFn: (quoteId: string) => convertQuoteToInvoice(quoteId, { paymentTerms: "net_30" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Quote converted to invoice!");
      setTab("invoices");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const markPaidMutation = useMutation({
    mutationFn: (invoiceId: string) => updateInvoice(invoiceId, { status: "paid" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      toast.success("Marked as paid!");
    },
  });

  // Line item helpers
  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems];
    (updated[index] as any)[field] = value;
    if (field === "quantity" || field === "unitPrice") {
      updated[index].total = Number(updated[index].quantity) * Number(updated[index].unitPrice);
    }
    setLineItems(updated);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { description: "", quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = discountType === "percent" ? subtotal * discountValue / 100 : discountValue;
  const taxable = subtotal - discountAmount;
  const taxAmount = taxable * taxRate / 100;
  const total = taxable + taxAmount;

  const handleSubmit = () => {
    const validItems = lineItems.filter(i => i.description.trim());
    if (validItems.length === 0) {
      toast.error("Add at least one line item");
      return;
    }
    const payload = {
      contactId,
      contactName,
      lineItems: validItems,
      taxRate,
      discount: { type: discountType, value: discountValue },
      notes,
      paymentTerms,
    };
    if (builderType === "quote") {
      createQuoteMutation.mutate(payload);
    } else {
      createInvoiceMutation.mutate(payload);
    }
  };

  const handleContactSelect = (id: string) => {
    const c = contacts.find((c: any) => c.id === id);
    setContactId(id);
    setContactName(c ? `${c.firstName} ${c.lastName}` : "");
  };

  const handleDownloadPdf = async (id: string, type: "quote" | "invoice") => {
    try {
      const fn = type === "quote" ? generateQuotePdf : generateInvoicePdf;
      const result = await fn(id);
      const bytes = Uint8Array.from(atob(result.pdf), c => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded!");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate PDF");
    }
  };

  const isLoading = quotesLoading || invoicesLoading;

  const cardStyle: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #E2E8F0",
    borderRadius: 3,
    padding: 24,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    borderRadius: 3,
    border: "1px solid #E2E8F0",
    padding: "8px 12px",
    fontSize: 13,
    fontFamily: font,
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: 4,
    fontSize: 13,
    fontWeight: 500,
    color: "#0f2545",
    fontFamily: font,
  };

  const smallLabelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: 4,
    fontSize: 11,
    fontWeight: 500,
    color: "#64748B",
    fontFamily: font,
  };

  const iconBtnStyle: React.CSSProperties = {
    borderRadius: 3,
    padding: 6,
    color: "#94A3B8",
    border: "none",
    background: "transparent",
    cursor: "pointer",
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 48px", fontFamily: font }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 600, color: "#0f2545", fontFamily: serifFont, margin: 0 }}>Quotes & Invoices</h1>
          <p style={{ color: "#64748B", fontSize: 13, margin: "4px 0 0" }}>{quotes.length} quotes, {invoices.length} invoices</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => { resetBuilder(); setBuilderType("invoice"); setShowBuilder(true); }}
            style={{
              display: "flex", alignItems: "center", gap: 8, borderRadius: 3,
              border: "1px solid #E2E8F0", padding: "8px 16px", fontSize: 13, fontWeight: 500,
              background: "#fff", cursor: "pointer", fontFamily: font, color: "#0f2545",
            }}
          >
            <FileText size={16} /> New Invoice
          </button>
          <button
            onClick={() => { resetBuilder(); setBuilderType("quote"); setShowBuilder(true); }}
            style={{
              display: "flex", alignItems: "center", gap: 8, borderRadius: 3,
              background: "#0F172A", color: "#EDE9FE", padding: "8px 16px",
              fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer", fontFamily: font,
            }}
          >
            <Plus size={16} /> New Quote
          </button>
        </div>
      </div>

      {/* Builder */}
      {showBuilder && (
        <div style={{ ...cardStyle, marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "#0f2545", margin: "0 0 16px" }}>
            {builderType === "quote" ? "Create Quote" : "Create Invoice"}
          </h3>

          {/* Contact select */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Client</label>
            <select
              style={inputStyle}
              value={contactId}
              onChange={(e) => handleContactSelect(e.target.value)}
            >
              <option value="">Select a contact...</option>
              {contacts.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName} {c.company ? `- ${c.company}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Line items */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ ...labelStyle, marginBottom: 8 }}>Line Items</label>
            <div style={{ borderRadius: 3, border: "1px solid #E2E8F0", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ background: "#F8FAFC", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, color: "#64748B", padding: "8px 12px", textAlign: "left" }}>Description</th>
                    <th style={{ background: "#F8FAFC", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, color: "#64748B", padding: "8px 12px", textAlign: "right", width: 80 }}>Qty</th>
                    <th style={{ background: "#F8FAFC", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, color: "#64748B", padding: "8px 12px", textAlign: "right", width: 112 }}>Unit Price</th>
                    <th style={{ background: "#F8FAFC", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, color: "#64748B", padding: "8px 12px", textAlign: "right", width: 112 }}>Total</th>
                    <th style={{ background: "#F8FAFC", padding: "8px 8px", width: 40 }} />
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, i) => (
                    <tr key={i} style={{ borderTop: "1px solid #E2E8F0" }}>
                      <td style={{ padding: "6px 8px" }}>
                        <input
                          style={{ ...inputStyle, border: "none", padding: "6px 4px" }}
                          placeholder="Service or product description"
                          value={item.description}
                          onChange={(e) => updateLineItem(i, "description", e.target.value)}
                        />
                      </td>
                      <td style={{ padding: "6px 8px" }}>
                        <input
                          type="number"
                          min={1}
                          style={{ ...inputStyle, border: "none", padding: "6px 4px", textAlign: "right" }}
                          value={item.quantity}
                          onChange={(e) => updateLineItem(i, "quantity", Number(e.target.value))}
                        />
                      </td>
                      <td style={{ padding: "6px 8px" }}>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          style={{ ...inputStyle, border: "none", padding: "6px 4px", textAlign: "right" }}
                          value={item.unitPrice}
                          onChange={(e) => updateLineItem(i, "unitPrice", Number(e.target.value))}
                        />
                      </td>
                      <td style={{ padding: "6px 12px", textAlign: "right", fontSize: 13, fontWeight: 500, color: "#0f2545" }}>
                        ${item.total.toFixed(2)}
                      </td>
                      <td style={{ padding: "6px 8px" }}>
                        {lineItems.length > 1 && (
                          <button onClick={() => removeLineItem(i)} style={{ ...iconBtnStyle, color: "#94A3B8" }}>
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={addLineItem}
              style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 500, color: "#7C3AED", background: "transparent", border: "none", cursor: "pointer", fontFamily: font }}
            >
              <Plus size={12} /> Add line item
            </button>
          </div>

          {/* Tax, Discount, Payment Terms */}
          <div style={{ marginBottom: 16, display: "grid", gridTemplateColumns: builderType === "invoice" ? "1fr 1fr 1fr 1fr" : "1fr 1fr", gap: 16 }}>
            <div>
              <label style={smallLabelStyle}>Tax Rate (%)</label>
              <input
                type="number"
                min={0}
                step={0.1}
                style={inputStyle}
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
              />
            </div>
            <div>
              <label style={smallLabelStyle}>Discount</label>
              <div style={{ display: "flex", gap: 4 }}>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  style={inputStyle}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                />
                <select
                  style={{ ...inputStyle, width: "auto", flex: "none", padding: "8px 8px" }}
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as "flat" | "percent")}
                >
                  <option value="percent">%</option>
                  <option value="flat">$</option>
                </select>
              </div>
            </div>
            {builderType === "invoice" && (
              <div>
                <label style={smallLabelStyle}>Payment Terms</label>
                <select
                  style={inputStyle}
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                >
                  <option value="due_on_receipt">Due on Receipt</option>
                  <option value="net_15">Net 15</option>
                  <option value="net_30">Net 30</option>
                  <option value="net_60">Net 60</option>
                </select>
              </div>
            )}
          </div>

          {/* Totals preview */}
          <div style={{ marginBottom: 16, display: "flex", justifyContent: "flex-end" }}>
            <div style={{ width: 256, display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748B" }}>Subtotal</span>
                <span style={{ color: "#0f2545" }}>${subtotal.toFixed(2)}</span>
              </div>
              {discountValue > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", color: "#DC2626" }}>
                  <span>Discount</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              {taxRate > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748B" }}>Tax ({taxRate}%)</span>
                  <span style={{ color: "#0f2545" }}>${taxAmount.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #E2E8F0", paddingTop: 8, fontSize: 15, fontWeight: 700, color: "#0f2545" }}>
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Notes / Terms</label>
            <textarea
              style={{ ...inputStyle, resize: "vertical" }}
              rows={2}
              placeholder="Payment instructions, scope of work, special conditions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleSubmit}
              disabled={createQuoteMutation.isPending || createInvoiceMutation.isPending}
              style={{
                display: "flex", alignItems: "center", gap: 8, borderRadius: 3,
                background: "#0F172A", color: "#EDE9FE", padding: "10px 20px",
                fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer", fontFamily: font,
                opacity: (createQuoteMutation.isPending || createInvoiceMutation.isPending) ? 0.5 : 1,
              }}
            >
              {(createQuoteMutation.isPending || createInvoiceMutation.isPending)
                ? <Loader2 size={14} className="animate-spin" />
                : <FileText size={14} />}
              Create {builderType === "quote" ? "Quote" : "Invoice"}
            </button>
            <button
              onClick={resetBuilder}
              style={{
                borderRadius: 3, border: "1px solid #E2E8F0", padding: "10px 16px",
                fontSize: 13, color: "#64748B", background: "#fff", cursor: "pointer", fontFamily: font,
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ marginBottom: 16, display: "flex", gap: 4, borderBottom: "1px solid #E2E8F0" }}>
        <button
          onClick={() => setTab("quotes")}
          style={{
            padding: "10px 16px", fontSize: 13, fontWeight: 500, fontFamily: font,
            background: "transparent", border: "none", cursor: "pointer",
            borderBottom: tab === "quotes" ? "2px solid #7C3AED" : "2px solid transparent",
            color: tab === "quotes" ? "#7C3AED" : "#64748B",
          }}
        >
          Quotes ({quotes.length})
        </button>
        <button
          onClick={() => setTab("invoices")}
          style={{
            padding: "10px 16px", fontSize: 13, fontWeight: 500, fontFamily: font,
            background: "transparent", border: "none", cursor: "pointer",
            borderBottom: tab === "invoices" ? "2px solid #7C3AED" : "2px solid transparent",
            color: tab === "invoices" ? "#7C3AED" : "#64748B",
          }}
        >
          Invoices ({invoices.length})
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
          <Loader2 className="animate-spin" style={{ color: "#94A3B8" }} />
        </div>
      ) : tab === "quotes" ? (
        quotes.length === 0 ? (
          <EmptyState type="quotes" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {quotes.map((q: any) => (
              <div key={q.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: 3, border: "1px solid #E2E8F0", background: "#fff", padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 3, background: "#F5F3FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <FileText size={18} style={{ color: "#7C3AED" }} />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#0f2545" }}>{q.quoteNumber}</span>
                      <StatusBadge status={q.status} />
                    </div>
                    <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
                      {q.contactName || "No client"} &middot; {new Date(q.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: "#0f2545" }}>${(q.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      onClick={() => handleDownloadPdf(q.id, "quote")}
                      style={iconBtnStyle}
                      title="Download PDF"
                    >
                      <Download size={15} />
                    </button>
                    {q.status === "draft" && (
                      <button
                        onClick={() => convertMutation.mutate(q.id)}
                        disabled={convertMutation.isPending}
                        style={iconBtnStyle}
                        title="Convert to Invoice"
                      >
                        <ArrowRight size={15} />
                      </button>
                    )}
                    <button
                      onClick={() => deleteMutation.mutate(q.id)}
                      style={iconBtnStyle}
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        invoices.length === 0 ? (
          <EmptyState type="invoices" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {invoices.map((inv: any) => {
              const iconBg = inv.status === "paid" ? "#ECFDF5" : inv.status === "overdue" ? "#FEE2E2" : "#F5F3FF";
              const iconColor = inv.status === "paid" ? "#059669" : inv.status === "overdue" ? "#DC2626" : "#7C3AED";
              return (
                <div key={inv.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: 3, border: "1px solid #E2E8F0", background: "#fff", padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 3, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {inv.status === "paid" ? <CheckCircle size={18} style={{ color: iconColor }} /> :
                       inv.status === "overdue" ? <AlertCircle size={18} style={{ color: iconColor }} /> :
                       <FileText size={18} style={{ color: iconColor }} />}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#0f2545" }}>{inv.invoiceNumber}</span>
                        <StatusBadge status={inv.status} />
                        {inv.quoteNumber && (
                          <span style={{ fontSize: 10, color: "#94A3B8" }}>from {inv.quoteNumber}</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
                        {inv.contactName || "No client"} &middot; Due {new Date(inv.dueDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: "#0f2545" }}>${(inv.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        onClick={() => handleDownloadPdf(inv.id, "invoice")}
                        style={iconBtnStyle}
                        title="Download PDF"
                      >
                        <Download size={15} />
                      </button>
                      {inv.status !== "paid" && (
                        <button
                          onClick={() => markPaidMutation.mutate(inv.id)}
                          style={iconBtnStyle}
                          title="Mark as Paid"
                        >
                          <DollarSign size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.draft;
  return (
    <span style={{ borderRadius: 100, padding: "2px 8px", fontSize: 10, fontWeight: 600, background: s.bg, color: s.color, textTransform: "capitalize" }}>
      {status}
    </span>
  );
}

function EmptyState({ type }: { type: "quotes" | "invoices" }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      borderRadius: 3, border: "1px dashed #E2E8F0", padding: "64px 0", fontFamily: "'Inter', sans-serif",
    }}>
      <FileText size={40} style={{ marginBottom: 12, color: "#94A3B8" }} />
      <h3 style={{ fontSize: 17, fontWeight: 500, color: "#0f2545", margin: "0 0 4px" }}>No {type} yet</h3>
      <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>
        {type === "quotes" ? "Create a quote for a client" : "Convert a quote or create a standalone invoice"}
      </p>
    </div>
  );
}
