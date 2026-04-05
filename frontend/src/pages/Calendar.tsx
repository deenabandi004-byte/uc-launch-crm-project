import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCalendarEvents,
  createCalendarEvent,
  deleteCalendarEvent,
  getContacts,
} from "../services/api";
import { toast } from "sonner";
import {
  Loader2, ChevronLeft, ChevronRight, Plus, Trash2, Clock,
  ExternalLink, CalendarDays, Users, X,
} from "lucide-react";

// ---- helpers ----

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function formatDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 9); // 9..17 (9am-5pm, show 5pm line)
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  attendees: { email: string; name: string; responseStatus: string }[];
  description: string;
  htmlLink: string;
}

const font = "'Inter', sans-serif";
const serifFont = "'Libre Baskerville', Georgia, serif";

// ---- Schedule Meeting Modal ----

function ScheduleMeetingModal({
  onClose,
  contacts,
}: {
  onClose: () => void;
  contacts: any[];
}) {
  const queryClient = useQueryClient();
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(formatDateInput(new Date()));
  const [startHour, setStartHour] = useState("10");
  const [startMin, setStartMin] = useState("00");
  const [endHour, setEndHour] = useState("10");
  const [endMin, setEndMin] = useState("30");
  const [contactId, setContactId] = useState("");
  const [attendeeEmail, setAttendeeEmail] = useState("");

  const selectedContact = contacts.find((c: any) => c.id === contactId);

  const createMutation = useMutation({
    mutationFn: createCalendarEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendarEvents"] });
      toast.success("Meeting scheduled");
      onClose();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleContactChange = (id: string) => {
    setContactId(id);
    const c = contacts.find((ct: any) => ct.id === id);
    if (c?.email) setAttendeeEmail(c.email);
    if (c && !summary) setSummary(`Call with ${c.firstName} ${c.lastName}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const startTime = `${date}T${startHour.padStart(2, "0")}:${startMin}:00Z`;
    const endTime = `${date}T${endHour.padStart(2, "0")}:${endMin}:00Z`;
    createMutation.mutate({
      summary,
      description,
      startTime,
      endTime,
      attendeeEmail: attendeeEmail || undefined,
      contactId: contactId || undefined,
    });
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

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)" }}>
      <div style={{ width: "100%", maxWidth: 440, borderRadius: 3, background: "#fff", padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.15)", fontFamily: font }}>
        <div style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "between" }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: "#0f2545", fontFamily: serifFont, flex: 1 }}>Schedule Meeting</h2>
          <button onClick={onClose} style={{ borderRadius: 3, padding: 4, border: "none", background: "transparent", cursor: "pointer" }}>
            <X size={18} color="#64748B" />
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Contact */}
          <div>
            <label style={labelStyle}>Contact</label>
            <select
              value={contactId}
              onChange={(e) => handleContactChange(e.target.value)}
              style={inputStyle}
            >
              <option value="">-- Select contact (optional) --</option>
              {contacts.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}{c.company ? ` - ${c.company}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Summary */}
          <div>
            <label style={labelStyle}>Title *</label>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              required
              placeholder="Call with John Doe"
              style={inputStyle}
            />
          </div>

          {/* Date */}
          <div>
            <label style={labelStyle}>Date *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          {/* Time */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Start</label>
              <div style={{ display: "flex", gap: 4 }}>
                <select value={startHour} onChange={(e) => setStartHour(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
                  {Array.from({ length: 12 }, (_, i) => i + 7).map((h) => (
                    <option key={h} value={String(h)}>{h > 12 ? h - 12 : h}{h >= 12 ? "pm" : "am"}</option>
                  ))}
                </select>
                <select value={startMin} onChange={(e) => setStartMin(e.target.value)} style={{ ...inputStyle, width: 64, flex: "none" }}>
                  <option value="00">:00</option>
                  <option value="30">:30</option>
                </select>
              </div>
            </div>
            <div>
              <label style={labelStyle}>End</label>
              <div style={{ display: "flex", gap: 4 }}>
                <select value={endHour} onChange={(e) => setEndHour(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
                  {Array.from({ length: 12 }, (_, i) => i + 7).map((h) => (
                    <option key={h} value={String(h)}>{h > 12 ? h - 12 : h}{h >= 12 ? "pm" : "am"}</option>
                  ))}
                </select>
                <select value={endMin} onChange={(e) => setEndMin(e.target.value)} style={{ ...inputStyle, width: 64, flex: "none" }}>
                  <option value="00">:00</option>
                  <option value="30">:30</option>
                </select>
              </div>
            </div>
          </div>

          {/* Attendee email */}
          <div>
            <label style={labelStyle}>Attendee Email</label>
            <input
              type="email"
              value={attendeeEmail}
              onChange={(e) => setAttendeeEmail(e.target.value)}
              placeholder="john@example.com"
              style={inputStyle}
            />
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Discuss proposal details..."
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending || !summary}
            style={{
              display: "flex", width: "100%", alignItems: "center", justifyContent: "center", gap: 8,
              borderRadius: 3, background: "#0F172A", color: "#EDE9FE", padding: "10px 16px",
              fontSize: 13, fontWeight: 500, fontFamily: font, border: "none", cursor: "pointer",
              opacity: (createMutation.isPending || !summary) ? 0.5 : 1,
            }}
          >
            {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <CalendarDays size={16} />}
            Schedule
          </button>
        </form>
      </div>
    </div>
  );
}

// ---- Week View ----

function WeekView({ events, weekStart }: { events: CalendarEvent[]; weekStart: Date }) {
  const days = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));

  // Map events to day columns
  const eventsByDay = useMemo(() => {
    const map: Record<number, CalendarEvent[]> = {};
    for (let i = 0; i < 5; i++) map[i] = [];
    for (const ev of events) {
      const evDate = new Date(ev.start);
      for (let i = 0; i < 5; i++) {
        if (isSameDay(evDate, days[i])) {
          map[i].push(ev);
          break;
        }
      }
    }
    return map;
  }, [events, weekStart]);

  const slotHeight = 60; // px per hour

  return (
    <div style={{ overflow: "auto", borderRadius: 3, border: "1px solid #E2E8F0", background: "#fff", fontFamily: font }}>
      {/* Header row */}
      <div style={{ display: "grid", gridTemplateColumns: "60px repeat(5, 1fr)", borderBottom: "1px solid #E2E8F0" }}>
        <div style={{ borderRight: "1px solid #E2E8F0", padding: 8 }} />
        {days.map((d, i) => {
          const isToday = isSameDay(d, new Date());
          return (
            <div
              key={i}
              style={{
                borderRight: i < 4 ? "1px solid #E2E8F0" : "none",
                padding: 8,
                textAlign: "center",
                fontSize: 13,
                background: isToday ? "#F5F3FF" : "transparent",
                fontWeight: isToday ? 600 : 400,
                color: isToday ? "#7C3AED" : "#64748B",
              }}
            >
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>{WEEKDAYS[i]}</div>
              <div style={{ marginTop: 2, fontSize: 18, color: isToday ? "#7C3AED" : "#0f2545" }}>{d.getDate()}</div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div style={{ position: "relative", display: "grid", gridTemplateColumns: "60px repeat(5, 1fr)" }}>
        {/* Time labels */}
        <div style={{ borderRight: "1px solid #E2E8F0" }}>
          {HOURS.map((h) => (
            <div
              key={h}
              style={{ position: "relative", borderBottom: "1px solid #F1F5F9", textAlign: "right", fontSize: 10, color: "#94A3B8", paddingRight: 8, height: slotHeight }}
            >
              <span style={{ position: "absolute", top: -7, right: 8 }}>
                {h > 12 ? h - 12 : h}{h >= 12 ? "pm" : "am"}
              </span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((d, dayIdx) => (
          <div key={dayIdx} style={{ position: "relative", borderRight: dayIdx < 4 ? "1px solid #E2E8F0" : "none" }}>
            {/* Hour lines */}
            {HOURS.map((h) => (
              <div key={h} style={{ borderBottom: "1px solid #F1F5F9", height: slotHeight }} />
            ))}

            {/* Event cards */}
            {(eventsByDay[dayIdx] || []).map((ev) => {
              const evStart = new Date(ev.start);
              const evEnd = new Date(ev.end);
              const startHour = evStart.getHours() + evStart.getMinutes() / 60;
              const endHour = evEnd.getHours() + evEnd.getMinutes() / 60;
              const top = (startHour - 9) * slotHeight;
              const height = Math.max((endHour - startHour) * slotHeight, 24);
              const hasAttendees = ev.attendees.length > 0;

              return (
                <div
                  key={ev.id}
                  style={{
                    position: "absolute",
                    left: 4,
                    right: 4,
                    overflow: "hidden",
                    borderRadius: 3,
                    padding: "2px 6px",
                    fontSize: 11,
                    top,
                    height,
                    zIndex: 10,
                    border: "1px solid rgba(124, 58, 237, 0.25)",
                    background: "#F5F3FF",
                    color: "#7C3AED",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  }}
                  title={`${ev.summary}\n${formatTime(ev.start)} - ${formatTime(ev.end)}`}
                >
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>{ev.summary}</div>
                  {height > 30 && (
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 10, opacity: 0.7 }}>
                      {formatTime(ev.start)} - {formatTime(ev.end)}
                    </div>
                  )}
                  {height > 46 && hasAttendees && (
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 10, opacity: 0.7 }}>
                      {ev.attendees[0].name || ev.attendees[0].email}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Upcoming Events List ----

function UpcomingList({ events }: { events: CalendarEvent[] }) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: deleteCalendarEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendarEvents"] });
      toast.success("Event deleted");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Show next 7 days
  const now = new Date();
  const sevenDays = addDays(now, 7);
  const upcoming = events.filter((ev) => {
    const d = new Date(ev.start);
    return d >= now && d <= sevenDays;
  });

  if (upcoming.length === 0) {
    return (
      <div style={{
        borderRadius: 3, border: "1px dashed #E2E8F0", padding: "40px 0",
        textAlign: "center", fontSize: 13, color: "#94A3B8", fontFamily: font,
      }}>
        <CalendarDays size={32} style={{ margin: "0 auto 8px", color: "#94A3B8" }} />
        No upcoming events in the next 7 days
      </div>
    );
  }

  // Group by day
  const grouped: Record<string, CalendarEvent[]> = {};
  for (const ev of upcoming) {
    const key = new Date(ev.start).toLocaleDateString();
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(ev);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, fontFamily: font }}>
      {Object.entries(grouped).map(([dayLabel, dayEvents]) => (
        <div key={dayLabel}>
          <h3 style={{ marginBottom: 8, fontSize: 13, fontWeight: 600, color: "#64748B" }}>
            {new Date(dayEvents[0].start).toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {dayEvents.map((ev) => (
              <div
                key={ev.id}
                style={{
                  display: "flex", alignItems: "center", gap: 12, borderRadius: 3,
                  border: "1px solid #E2E8F0", background: "#fff", padding: 12,
                }}
              >
                <div style={{ height: 40, width: 4, flexShrink: 0, borderRadius: 100, background: "#7C3AED" }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13, fontWeight: 500, color: "#0f2545" }}>{ev.summary}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#64748B", marginTop: 2 }}>
                    <Clock size={11} />
                    {formatTime(ev.start)} - {formatTime(ev.end)}
                    {ev.attendees.length > 0 && (
                      <>
                        <Users size={11} style={{ marginLeft: 4 }} />
                        {ev.attendees.map((a) => a.name || a.email).join(", ")}
                      </>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", flexShrink: 0, alignItems: "center", gap: 4 }}>
                  {ev.htmlLink && (
                    <a
                      href={ev.htmlLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ borderRadius: 3, padding: 6, color: "#94A3B8", textDecoration: "none" }}
                      title="Open in Google Calendar"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                  <button
                    onClick={() => deleteMutation.mutate(ev.id)}
                    disabled={deleteMutation.isPending}
                    style={{ borderRadius: 3, padding: 6, color: "#94A3B8", border: "none", background: "transparent", cursor: "pointer" }}
                    title="Delete event"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- Main Calendar Page ----

export default function Calendar() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [view, setView] = useState<"week" | "list">("week");

  const weekStart = useMemo(() => {
    const base = startOfWeek(new Date());
    return addDays(base, weekOffset * 7);
  }, [weekOffset]);

  const weekEnd = addDays(weekStart, 4);

  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ["calendarEvents"],
    queryFn: getCalendarEvents,
  });

  const { data: contactsData } = useQuery({
    queryKey: ["contacts"],
    queryFn: getContacts,
  });

  const events: CalendarEvent[] = (eventsData as any)?.events || [];
  const contacts: any[] = Array.isArray(contactsData) ? contactsData : [];

  const weekLabel = `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;

  if (eventsLoading) {
    return (
      <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center" }}>
        <Loader2 className="animate-spin" style={{ color: "#94A3B8" }} />
      </div>
    );
  }

  return (
    <div style={{ width: "100%", padding: "40px 48px", fontFamily: font }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 600, color: "#0f2545", fontFamily: serifFont, margin: 0 }}>Calendar</h1>
          <p style={{ color: "#64748B", fontSize: 13, margin: "4px 0 0" }}>{events.length} upcoming events</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* View toggle */}
          <div style={{ display: "flex", borderRadius: 3, border: "1px solid #E2E8F0", overflow: "hidden" }}>
            <button
              onClick={() => setView("week")}
              style={{
                padding: "6px 12px", fontSize: 13, border: "none", cursor: "pointer", fontFamily: font,
                background: view === "week" ? "#F5F3FF" : "#fff",
                fontWeight: view === "week" ? 500 : 400,
                color: view === "week" ? "#7C3AED" : "#64748B",
              }}
            >
              Week
            </button>
            <button
              onClick={() => setView("list")}
              style={{
                padding: "6px 12px", fontSize: 13, border: "none", borderLeft: "1px solid #E2E8F0", cursor: "pointer", fontFamily: font,
                background: view === "list" ? "#F5F3FF" : "#fff",
                fontWeight: view === "list" ? 500 : 400,
                color: view === "list" ? "#7C3AED" : "#64748B",
              }}
            >
              List
            </button>
          </div>
          <button
            onClick={() => setShowModal(true)}
            style={{
              display: "flex", alignItems: "center", gap: 8, borderRadius: 3,
              background: "#0F172A", color: "#EDE9FE", padding: "8px 16px",
              fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer", fontFamily: font,
            }}
          >
            <Plus size={16} />
            Schedule Meeting
          </button>
        </div>
      </div>

      {view === "week" ? (
        <>
          {/* Week navigation */}
          <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => setWeekOffset((o) => o - 1)}
              style={{ borderRadius: 3, border: "1px solid #E2E8F0", padding: 6, background: "#fff", cursor: "pointer" }}
            >
              <ChevronLeft size={18} color="#64748B" />
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              style={{ borderRadius: 3, border: "1px solid #E2E8F0", padding: "6px 12px", fontSize: 13, fontWeight: 500, background: "#fff", cursor: "pointer", fontFamily: font }}
            >
              Today
            </button>
            <button
              onClick={() => setWeekOffset((o) => o + 1)}
              style={{ borderRadius: 3, border: "1px solid #E2E8F0", padding: 6, background: "#fff", cursor: "pointer" }}
            >
              <ChevronRight size={18} color="#64748B" />
            </button>
            <span style={{ fontSize: 13, fontWeight: 500, color: "#0f2545" }}>{weekLabel}</span>
          </div>

          <WeekView events={events} weekStart={weekStart} />
        </>
      ) : (
        <UpcomingList events={events} />
      )}

      {/* Schedule Modal */}
      {showModal && (
        <ScheduleMeetingModal onClose={() => setShowModal(false)} contacts={contacts} />
      )}
    </div>
  );
}
