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

function DraggableCard({ contact, stageColor }: { contact: ContactCard; stageColor: string }) {
  const daysInStage = contact.stageEnteredAt
    ? Math.floor((Date.now() - new Date(contact.stageEnteredAt).getTime()) / 86400000)
    : null;

  return (
    <div
      className="group cursor-grab rounded-lg border bg-white p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing"
      style={{ borderLeftWidth: 4, borderLeftColor: stageColor }}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-gray-900 truncate">
            {contact.firstName} {contact.lastName}
          </div>
          {contact.jobTitle && (
            <div className="text-xs text-gray-500 truncate">{contact.jobTitle}</div>
          )}
          {contact.company && (
            <div className="text-xs text-gray-500 truncate">{contact.company}</div>
          )}
        </div>
        <GripVertical size={14} className="mt-0.5 flex-shrink-0 text-gray-300 group-hover:text-gray-400" />
      </div>

      {/* Deal value & days in stage */}
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        {contact.dealValue != null && contact.dealValue > 0 && (
          <span className="flex items-center gap-0.5 rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
            <DollarSign size={9} />
            {contact.dealValue.toLocaleString()}
          </span>
        )}
        {daysInStage != null && daysInStage > 0 && (
          <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
            {daysInStage}d
          </span>
        )}
        {contact.aiCategory && contact.aiCategory !== "null" && (
          <span className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
            contact.aiCategory === "interested" ? "bg-green-100 text-green-700" :
            contact.aiCategory === "not_interested" ? "bg-red-100 text-red-700" :
            contact.aiCategory === "follow_up" ? "bg-amber-100 text-amber-700" :
            contact.aiCategory === "question" ? "bg-blue-100 text-blue-700" :
            "bg-gray-100 text-gray-600"
          }`}>
            <Sparkles size={8} />
            {contact.aiCategory.replace(/_/g, " ")}
          </span>
        )}
      </div>

      {/* Contact actions */}
      <div className="mt-2 flex items-center gap-1">
        {contact.email && (
          <a href={`mailto:${contact.email}`} className="rounded p-0.5 text-gray-400 hover:text-purple-600" title={contact.email}>
            <Mail size={12} />
          </a>
        )}
        {contact.phone && (
          <a href={`tel:${contact.phone}`} className="rounded p-0.5 text-gray-400 hover:text-purple-600" title={contact.phone}>
            <Phone size={12} />
          </a>
        )}
        {contact.linkedinUrl && (
          <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer" className="rounded p-0.5 text-gray-400 hover:text-purple-600">
            <Linkedin size={12} />
          </a>
        )}
      </div>

      {/* Unread reply indicator */}
      {contact.hasUnreadReply && (
        <div className="mt-1.5 flex items-center gap-1 text-[10px] font-medium text-green-600">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
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
      className={`flex h-full flex-shrink-0 flex-col rounded-xl transition-colors ${
        isOver ? "bg-purple-50/60 ring-2 ring-purple-300" : "bg-gray-50/50"
      }`}
      style={{ width: 280 }}
    >
      {/* Stage header */}
      <div className={`mx-2 mt-2 flex items-center gap-2 rounded-lg border-l-4 px-3 py-2.5 ${stage.bg}`}>
        <span
          className="h-2.5 w-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: stage.color }}
        />
        <span className="text-sm font-semibold text-gray-800">{stage.label}</span>
        <span className="ml-auto rounded-full bg-white/80 px-2 py-0.5 text-xs font-medium text-gray-600">
          {contacts.length}
        </span>
      </div>

      {/* Total deal value */}
      {totalValue > 0 && (
        <div className="mx-4 mt-1 text-[10px] text-gray-400 font-medium">
          ${totalValue.toLocaleString()} total
        </div>
      )}

      {/* Cards */}
      <div className="flex-1 space-y-2 overflow-y-auto p-2" style={{ maxHeight: "calc(100vh - 220px)" }}>
        {contacts.map((c) => (
          <DraggableCardWrapper key={c.id} contact={c} stageColor={stage.color} />
        ))}
        {contacts.length === 0 && (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-200 py-8 text-xs text-gray-400">
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
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pipeline</h1>
          <p className="text-muted-foreground">{totalContacts} contacts in pipeline</p>
        </div>
      </div>

      {totalContacts === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <Users className="mb-3 text-muted-foreground" size={40} />
          <h3 className="text-lg font-medium">Pipeline is empty</h3>
          <p className="text-sm text-muted-foreground">
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
          <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: "calc(100vh - 200px)" }}>
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
