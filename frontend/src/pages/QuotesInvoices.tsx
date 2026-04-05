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

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-purple-100 text-purple-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-gray-100 text-gray-500",
  paid: "bg-emerald-100 text-emerald-700",
  overdue: "bg-red-100 text-red-700",
  viewed: "bg-purple-100 text-purple-700",
};

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

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

  return (
    <div className="mx-auto max-w-5xl p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quotes & Invoices</h1>
          <p className="text-muted-foreground">{quotes.length} quotes, {invoices.length} invoices</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { resetBuilder(); setBuilderType("invoice"); setShowBuilder(true); }}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary"
          >
            <FileText size={16} /> New Invoice
          </button>
          <button
            onClick={() => { resetBuilder(); setBuilderType("quote"); setShowBuilder(true); }}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            <Plus size={16} /> New Quote
          </button>
        </div>
      </div>

      {/* Builder */}
      {showBuilder && (
        <div className="mb-6 rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">
            {builderType === "quote" ? "Create Quote" : "Create Invoice"}
          </h3>

          {/* Contact select */}
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">Client</label>
            <select
              className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
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
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium">Line Items</label>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-xs font-medium uppercase text-gray-500">
                    <th className="px-3 py-2 text-left">Description</th>
                    <th className="w-20 px-3 py-2 text-right">Qty</th>
                    <th className="w-28 px-3 py-2 text-right">Unit Price</th>
                    <th className="w-28 px-3 py-2 text-right">Total</th>
                    <th className="w-10 px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-2 py-1.5">
                        <input
                          className="w-full rounded border-0 px-1 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="Service or product description"
                          value={item.description}
                          onChange={(e) => updateLineItem(i, "description", e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          min={1}
                          className="w-full rounded border-0 px-1 py-1.5 text-right text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(i, "quantity", Number(e.target.value))}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          className="w-full rounded border-0 px-1 py-1.5 text-right text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          value={item.unitPrice}
                          onChange={(e) => updateLineItem(i, "unitPrice", Number(e.target.value))}
                        />
                      </td>
                      <td className="px-3 py-1.5 text-right text-sm font-medium">
                        ${item.total.toFixed(2)}
                      </td>
                      <td className="px-2 py-1.5">
                        {lineItems.length > 1 && (
                          <button onClick={() => removeLineItem(i)} className="rounded p-1 text-gray-400 hover:text-red-500">
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
              className="mt-2 flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <Plus size={12} /> Add line item
            </button>
          </div>

          {/* Tax, Discount, Payment Terms */}
          <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Tax Rate (%)</label>
              <input
                type="number"
                min={0}
                step={0.1}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Discount</label>
              <div className="flex gap-1">
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                />
                <select
                  className="rounded-lg border border-border px-2 py-2 text-xs focus:outline-none"
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
                <label className="mb-1 block text-xs font-medium text-gray-500">Payment Terms</label>
                <select
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
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
          <div className="mb-4 flex justify-end">
            <div className="w-64 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {discountValue > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Discount</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              {taxRate > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Tax ({taxRate}%)</span>
                  <span>${taxAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">Notes / Terms</label>
            <textarea
              className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
              rows={2}
              placeholder="Payment instructions, scope of work, special conditions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={createQuoteMutation.isPending || createInvoiceMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {(createQuoteMutation.isPending || createInvoiceMutation.isPending)
                ? <Loader2 size={14} className="animate-spin" />
                : <FileText size={14} />}
              Create {builderType === "quote" ? "Quote" : "Invoice"}
            </button>
            <button onClick={resetBuilder} className="rounded-lg border border-border px-4 py-2.5 text-sm text-muted-foreground hover:bg-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-border">
        <button
          onClick={() => setTab("quotes")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === "quotes" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Quotes ({quotes.length})
        </button>
        <button
          onClick={() => setTab("invoices")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === "invoices" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Invoices ({invoices.length})
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-muted-foreground" /></div>
      ) : tab === "quotes" ? (
        quotes.length === 0 ? (
          <EmptyState type="quotes" />
        ) : (
          <div className="space-y-2">
            {quotes.map((q: any) => (
              <div key={q.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
                    <FileText size={18} className="text-purple-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{q.quoteNumber}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${STATUS_COLORS[q.status] || STATUS_COLORS.draft}`}>
                        {q.status}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {q.contactName || "No client"} &middot; {new Date(q.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold">${(q.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleDownloadPdf(q.id, "quote")}
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      title="Download PDF"
                    >
                      <Download size={15} />
                    </button>
                    {q.status === "draft" && (
                      <button
                        onClick={() => convertMutation.mutate(q.id)}
                        disabled={convertMutation.isPending}
                        className="rounded p-1.5 text-gray-400 hover:bg-green-50 hover:text-green-600"
                        title="Convert to Invoice"
                      >
                        <ArrowRight size={15} />
                      </button>
                    )}
                    <button
                      onClick={() => deleteMutation.mutate(q.id)}
                      className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
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
          <div className="space-y-2">
            {invoices.map((inv: any) => (
              <div key={inv.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    inv.status === "paid" ? "bg-emerald-50" : inv.status === "overdue" ? "bg-red-50" : "bg-purple-50"
                  }`}>
                    {inv.status === "paid" ? <CheckCircle size={18} className="text-emerald-600" /> :
                     inv.status === "overdue" ? <AlertCircle size={18} className="text-red-600" /> :
                     <FileText size={18} className="text-purple-600" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{inv.invoiceNumber}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${STATUS_COLORS[inv.status] || STATUS_COLORS.draft}`}>
                        {inv.status}
                      </span>
                      {inv.quoteNumber && (
                        <span className="text-[10px] text-muted-foreground">from {inv.quoteNumber}</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {inv.contactName || "No client"} &middot; Due {new Date(inv.dueDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold">${(inv.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleDownloadPdf(inv.id, "invoice")}
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      title="Download PDF"
                    >
                      <Download size={15} />
                    </button>
                    {inv.status !== "paid" && (
                      <button
                        onClick={() => markPaidMutation.mutate(inv.id)}
                        className="rounded p-1.5 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600"
                        title="Mark as Paid"
                      >
                        <DollarSign size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

function EmptyState({ type }: { type: "quotes" | "invoices" }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
      <FileText className="mb-3 text-muted-foreground" size={40} />
      <h3 className="text-lg font-medium">No {type} yet</h3>
      <p className="text-sm text-muted-foreground">
        {type === "quotes" ? "Create a quote for a client" : "Convert a quote or create a standalone invoice"}
      </p>
    </div>
  );
}
