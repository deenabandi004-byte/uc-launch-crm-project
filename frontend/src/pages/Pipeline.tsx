import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPipeline, movePipelineContact } from "../services/api";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  Loader2, Mail, GripVertical, Sparkles,
  Users, Phone, DollarSign, Linkedin,
} from "lucide-react";

const STAGES = [
  { key: "new_lead", label: "New Lead", color: "#7C3AED", bg: "bg-purple-50 border-purple-300" },
  { key: "contacted", label: "Contacted", color: "#6D28D9", bg: "bg-purple-50 border-purple-300" },
  { key: "interested", label: "Interested", color: "#0D9488", bg: "bg-teal-50 border-teal-300" },
  { key: "estimate_sent", label: "Estimate Sent", color: "#4F46E5", bg: "bg-indigo-50 border-indigo-300" },
  { key: "approved", label: "Approved", color: "#D97706", bg: "bg-amber-50 border-amber-300" },
  { key: "in_progress", label: "In Progress", color: "#EA580C", bg: "bg-orange-50 border-orange-300" },
  { key: "complete", label: "Complete", color: "#059669", bg: "bg-green-50 border-green-300" },
  { key: "paid", label: "Paid", color: "#047857", bg: "bg-emerald-50 border-emerald-300" },
];

const CONTEXTUAL_PROMPTS: Record<string, string> = {
  contacted: "Send an email to this contact?",
  interested: "Schedule a call with this contact?",
  estimate_sent: "Create a quote for this client?",
  approved: "Schedule a start date?",
  in_progress: "Send a confirmation email?",
  complete: "Generate an invoice?",
  paid: "Send a thank-you email!",
};

interface ContactCard {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  company?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  dealValue?: number;
  pipelineStage: string;
  hasUnreadReply?: boolean;
  lastMessageSnippet?: string;
  aiCategory?: string;
  stageEnteredAt?: string;
}

const AI_CATEGORY_STYLES: Record<string, { background: string; color: string }> = {
  interested: { background: "#DCFCE7", color: "#15803D" },
  not_interested: { background: "#FEE2E2", color: "#B91C1C" },
  follow_up: { background: "#FEF3C7", color: "#B45309" },
  question: { background: "#DBEAFE", color: "#1D4ED8" },
};

function DraggableCard({ contact, stageColor }: { contact: ContactCard; stageColor: string }) {
  const daysInStage = contact.stageEnteredAt
    ? Math.floor((Date.now() - new Date(contact.stageEnteredAt).getTime()) / 86400000)
    : null;

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E2E8F0",
        borderLeft: `3px solid ${stageColor}`,
        borderRadius: 3,
        padding: 12,
        cursor: "grab",
        transition: "border-color 0.15s, box-shadow 0.15s",
        fontFamily: "'Inter', sans-serif",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#C4B5FD";
        e.currentTarget.style.borderLeft = `3px solid ${stageColor}`;
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(124,58,237,0.10)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#E2E8F0";
        e.currentTarget.style.borderLeft = `3px solid ${stageColor}`;
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#0f2545", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {contact.firstName} {contact.lastName}
          </div>
          {contact.jobTitle && (
            <div style={{ fontSize: 11, color: "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{contact.jobTitle}</div>
          )}
          {contact.company && (
            <div style={{ fontSize: 11, color: "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{contact.company}</div>
          )}
        </div>
        <GripVertical size={14} style={{ flexShrink: 0, marginTop: 2, color: "#94A3B8" }} />
      </div>

      {/* Deal value & days in stage */}
      <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        {contact.dealValue != null && contact.dealValue > 0 && (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 2,
            borderRadius: 100, background: "#DCFCE7", padding: "2px 7px",
            fontSize: 10, fontWeight: 600, color: "#15803D",
          }}>
            <DollarSign size={9} />
            {contact.dealValue.toLocaleString()}
          </span>
        )}
        {daysInStage != null && daysInStage > 0 && (
          <span style={{
            borderRadius: 100, background: "#F1F5F9", padding: "2px 7px",
            fontSize: 10, color: "#64748B",
          }}>
            {daysInStage}d
          </span>
        )}
        {contact.aiCategory && contact.aiCategory !== "null" && (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 2,
            borderRadius: 100, padding: "2px 7px",
            fontSize: 10, fontWeight: 600,
            background: AI_CATEGORY_STYLES[contact.aiCategory]?.background || "#F1F5F9",
            color: AI_CATEGORY_STYLES[contact.aiCategory]?.color || "#64748B",
          }}>
            <Sparkles size={8} />
            {contact.aiCategory.replace(/_/g, " ")}
          </span>
        )}
      </div>

      {/* Contact actions */}
      <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}>
        {contact.email && (
          <a href={`mailto:${contact.email}`} style={{ borderRadius: 3, padding: 2, color: "#94A3B8", transition: "color 0.15s" }} title={contact.email}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#7C3AED"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#94A3B8"; }}
          >
            <Mail size={12} />
          </a>
        )}
        {contact.phone && (
          <a href={`tel:${contact.phone}`} style={{ borderRadius: 3, padding: 2, color: "#94A3B8", transition: "color 0.15s" }} title={contact.phone}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#7C3AED"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#94A3B8"; }}
          >
            <Phone size={12} />
          </a>
        )}
        {contact.linkedinUrl && (
          <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer" style={{ borderRadius: 3, padding: 2, color: "#94A3B8", transition: "color 0.15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#7C3AED"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#94A3B8"; }}
          >
            <Linkedin size={12} />
          </a>
        )}
      </div>

      {/* Unread reply indicator */}
      {contact.hasUnreadReply && (
        <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 600, color: "#059669" }}>
          <span style={{ height: 6, width: 6, borderRadius: "50%", background: "#059669", display: "inline-block" }} />
          New reply
        </div>
      )}
    </div>
  );
}

function DroppableColumn({
  stage,
  contacts,
  isOver,
}: {
  stage: typeof STAGES[number];
  contacts: ContactCard[];
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({ id: stage.key });

  const totalValue = contacts.reduce((sum, c) => sum + (c.dealValue || 0), 0);

  return (
    <div
      ref={setNodeRef}
      style={{
        display: "flex",
        height: "100%",
        flexShrink: 0,
        flexDirection: "column",
        width: 280,
        borderRadius: 3,
        transition: "background 0.15s",
        background: isOver ? "rgba(124,58,237,0.06)" : "#F8FAFC",
        outline: isOver ? "2px solid #C4B5FD" : "none",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Stage header */}
      <div style={{
        margin: "8px 8px 0 8px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        borderRadius: 3,
        background: "#F8FAFC",
        border: "1px solid #E2E8F0",
        padding: "10px 12px",
      }}>
        <span
          style={{
            height: 8,
            width: 8,
            borderRadius: "50%",
            flexShrink: 0,
            backgroundColor: stage.color,
            display: "inline-block",
          }}
        />
        <span style={{ fontSize: 13, fontWeight: 600, color: "#0f2545" }}>{stage.label}</span>
        <span style={{
          marginLeft: "auto",
          borderRadius: 100,
          background: "rgba(255,255,255,0.8)",
          padding: "2px 8px",
          fontSize: 11,
          fontWeight: 500,
          color: "#64748B",
        }}>
          {contacts.length}
        </span>
      </div>

      {/* Total deal value */}
      {totalValue > 0 && (
        <div style={{ margin: "4px 16px 0", fontSize: 10, color: "#94A3B8", fontWeight: 500 }}>
          ${totalValue.toLocaleString()} total
        </div>
      )}

      {/* Cards */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", padding: 8, maxHeight: "calc(100vh - 220px)" }}>
        {contacts.map((c) => (
          <DraggableCardWrapper key={c.id} contact={c} stageColor={stage.color} />
        ))}
        {contacts.length === 0 && (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px dashed #E2E8F0",
            borderRadius: 3,
            padding: "32px 0",
            fontSize: 12,
            color: "#94A3B8",
          }}>
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}

function DraggableCardWrapper({ contact, stageColor }: { contact: ContactCard; stageColor: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable(contact.id);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
        opacity: isDragging ? 0.3 : 1,
      }}
    >
      <DraggableCard contact={contact} stageColor={stageColor} />
    </div>
  );
}

function useDraggable(id: string) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggableHook({ id });
  return { attributes, listeners, setNodeRef, transform, isDragging };
}

// We need to import useDraggable from dnd-kit
import { useDraggable as useDraggableHook } from "@dnd-kit/core";

export default function Pipeline() {
  const queryClient = useQueryClient();
  const { data: pipeline = {}, isLoading } = useQuery({ queryKey: ["pipeline"], queryFn: getPipeline });
  const [activeCard, setActiveCard] = useState<ContactCard | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const moveMutation = useMutation({
    mutationFn: ({ contactId, stage }: { contactId: string; stage: string }) =>
      movePipelineContact(contactId, stage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const findContact = (id: string): ContactCard | null => {
    for (const stage of STAGES) {
      const contacts = (pipeline as any)[stage.key] || [];
      const found = contacts.find((c: ContactCard) => c.id === id);
      if (found) return { ...found, pipelineStage: stage.key };
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const contact = findContact(event.active.id as string);
    setActiveCard(contact);
  };

  const handleDragOver = (event: any) => {
    const overId = event.over?.id as string | undefined;
    if (overId && STAGES.some((s) => s.key === overId)) {
      setOverColumn(overId);
    } else {
      setOverColumn(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);
    setOverColumn(null);

    if (!over) return;

    const contactId = active.id as string;
    const targetStage = over.id as string;

    if (!STAGES.some((s) => s.key === targetStage)) return;

    const contact = findContact(contactId);
    if (!contact || contact.pipelineStage === targetStage) return;

    // Optimistically move the card
    moveMutation.mutate({ contactId, stage: targetStage });

    // Show contextual prompt
    const prompt = CONTEXTUAL_PROMPTS[targetStage];
    const stageLabel = STAGES.find((s) => s.key === targetStage)?.label || targetStage;
    if (prompt) {
      toast.success(`Moved to ${stageLabel}`, {
        description: prompt,
        duration: 4000,
      });
    } else {
      toast.success(`Moved to ${stageLabel}`);
    }
  };

  const totalContacts = Object.values(pipeline).flat().length;

  if (isLoading) {
    return (
      <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif" }}>
        <Loader2 className="animate-spin" style={{ color: "#94A3B8" }} />
      </div>
    );
  }

  return (
    <div style={{ height: "100%", padding: "40px 40px 40px 48px", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 600, color: "#0f2545", fontFamily: "'Libre Baskerville', Georgia, serif", margin: 0 }}>Pipeline</h1>
          <p style={{ color: "#64748B", fontSize: 14, margin: "4px 0 0" }}>{totalContacts} contacts in pipeline</p>
        </div>
      </div>

      {totalContacts === 0 ? (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          border: "2px dashed #E2E8F0",
          borderRadius: 3,
          padding: "64px 0",
        }}>
          <Users style={{ marginBottom: 12, color: "#94A3B8" }} size={40} />
          <h3 style={{ fontSize: 18, fontWeight: 500, color: "#0f2545", margin: 0 }}>Pipeline is empty</h3>
          <p style={{ fontSize: 14, color: "#64748B", margin: "4px 0 0" }}>
            Add contacts and send a campaign to see them here
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 16, minHeight: "calc(100vh - 200px)" }}>
            {STAGES.map((stage) => {
              const contacts = (pipeline as any)[stage.key] || [];
              return (
                <DroppableColumn
                  key={stage.key}
                  stage={stage}
                  contacts={contacts}
                  isOver={overColumn === stage.key}
                />
              );
            })}
          </div>

          <DragOverlay>
            {activeCard ? (
              <div style={{ width: 264 }}>
                <DraggableCard
                  contact={activeCard}
                  stageColor={STAGES.find((s) => s.key === activeCard.pipelineStage)?.color || "#7C3AED"}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
