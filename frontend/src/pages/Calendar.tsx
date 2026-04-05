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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Schedule Meeting</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Contact */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Contact</label>
            <select
              value={contactId}
              onChange={(e) => handleContactChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
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
            <label className="mb-1 block text-sm font-medium text-gray-700">Title *</label>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              required
              placeholder="Call with John Doe"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          {/* Date */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Date *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Start</label>
              <div className="flex gap-1">
                <select value={startHour} onChange={(e) => setStartHour(e.target.value)} className="flex-1 rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-purple-500 focus:outline-none">
                  {Array.from({ length: 12 }, (_, i) => i + 7).map((h) => (
                    <option key={h} value={String(h)}>{h > 12 ? h - 12 : h}{h >= 12 ? "pm" : "am"}</option>
                  ))}
                </select>
                <select value={startMin} onChange={(e) => setStartMin(e.target.value)} className="w-16 rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-purple-500 focus:outline-none">
                  <option value="00">:00</option>
                  <option value="30">:30</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">End</label>
              <div className="flex gap-1">
                <select value={endHour} onChange={(e) => setEndHour(e.target.value)} className="flex-1 rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-purple-500 focus:outline-none">
                  {Array.from({ length: 12 }, (_, i) => i + 7).map((h) => (
                    <option key={h} value={String(h)}>{h > 12 ? h - 12 : h}{h >= 12 ? "pm" : "am"}</option>
                  ))}
                </select>
                <select value={endMin} onChange={(e) => setEndMin(e.target.value)} className="w-16 rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-purple-500 focus:outline-none">
                  <option value="00">:00</option>
                  <option value="30">:30</option>
                </select>
              </div>
            </div>
          </div>

          {/* Attendee email */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Attendee Email</label>
            <input
              type="email"
              value={attendeeEmail}
              onChange={(e) => setAttendeeEmail(e.target.value)}
              placeholder="john@example.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Discuss proposal details..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending || !summary}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
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
    <div className="overflow-auto rounded-xl border border-gray-200 bg-white">
      {/* Header row */}
      <div className="grid border-b border-gray-200" style={{ gridTemplateColumns: "60px repeat(5, 1fr)" }}>
        <div className="border-r border-gray-200 p-2" />
        {days.map((d, i) => {
          const isToday = isSameDay(d, new Date());
          return (
            <div
              key={i}
              className={`border-r border-gray-200 p-2 text-center text-sm last:border-r-0 ${
                isToday ? "bg-purple-50 font-semibold text-purple-700" : "text-gray-600"
              }`}
            >
              <div className="text-xs uppercase">{WEEKDAYS[i]}</div>
              <div className={`mt-0.5 text-lg ${isToday ? "text-purple-700" : "text-gray-900"}`}>{d.getDate()}</div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="relative grid" style={{ gridTemplateColumns: "60px repeat(5, 1fr)" }}>
        {/* Time labels */}
        <div className="border-r border-gray-200">
          {HOURS.map((h) => (
            <div
              key={h}
              className="relative border-b border-gray-100 text-right text-[10px] text-gray-400 pr-2"
              style={{ height: slotHeight }}
            >
              <span className="absolute -top-2 right-2">
                {h > 12 ? h - 12 : h}{h >= 12 ? "pm" : "am"}
              </span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((d, dayIdx) => (
          <div key={dayIdx} className="relative border-r border-gray-200 last:border-r-0">
            {/* Hour lines */}
            {HOURS.map((h) => (
              <div key={h} className="border-b border-gray-100" style={{ height: slotHeight }} />
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
                  className={`absolute left-1 right-1 overflow-hidden rounded px-1.5 py-0.5 text-xs shadow-sm ${
                    hasAttendees
                      ? "border border-purple-200 bg-purple-100 text-purple-800"
                      : "border border-blue-200 bg-blue-100 text-blue-800"
                  }`}
                  style={{ top, height, zIndex: 10 }}
                  title={`${ev.summary}\n${formatTime(ev.start)} - ${formatTime(ev.end)}`}
                >
                  <div className="truncate font-medium">{ev.summary}</div>
                  {height > 30 && (
                    <div className="truncate text-[10px] opacity-70">
                      {formatTime(ev.start)} - {formatTime(ev.end)}
                    </div>
                  )}
                  {height > 46 && hasAttendees && (
                    <div className="truncate text-[10px] opacity-70">
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
      <div className="rounded-xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-400">
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
    <div className="space-y-4">
      {Object.entries(grouped).map(([dayLabel, dayEvents]) => (
        <div key={dayLabel}>
          <h3 className="mb-2 text-sm font-semibold text-gray-600">
            {new Date(dayEvents[0].start).toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}
          </h3>
          <div className="space-y-2">
            {dayEvents.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
              >
                <div className={`h-10 w-1 flex-shrink-0 rounded-full ${ev.attendees.length > 0 ? "bg-purple-500" : "bg-blue-500"}`} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-gray-900">{ev.summary}</div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock size={11} />
                    {formatTime(ev.start)} - {formatTime(ev.end)}
                    {ev.attendees.length > 0 && (
                      <>
                        <Users size={11} className="ml-1" />
                        {ev.attendees.map((a) => a.name || a.email).join(", ")}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1">
                  {ev.htmlLink && (
                    <a
                      href={ev.htmlLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                      title="Open in Google Calendar"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                  <button
                    onClick={() => deleteMutation.mutate(ev.id)}
                    disabled={deleteMutation.isPending}
                    className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
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
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          <p className="text-muted-foreground">{events.length} upcoming events</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-200">
            <button
              onClick={() => setView("week")}
              className={`px-3 py-1.5 text-sm ${view === "week" ? "bg-purple-50 font-medium text-purple-700" : "text-gray-600 hover:bg-gray-50"} rounded-l-lg`}
            >
              Week
            </button>
            <button
              onClick={() => setView("list")}
              className={`px-3 py-1.5 text-sm ${view === "list" ? "bg-purple-50 font-medium text-purple-700" : "text-gray-600 hover:bg-gray-50"} rounded-r-lg`}
            >
              List
            </button>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
          >
            <Plus size={16} />
            Schedule Meeting
          </button>
        </div>
      </div>

      {view === "week" ? (
        <>
          {/* Week navigation */}
          <div className="mb-4 flex items-center gap-3">
            <button
              onClick={() => setWeekOffset((o) => o - 1)}
              className="rounded-lg border border-gray-200 p-1.5 hover:bg-gray-50"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
            >
              Today
            </button>
            <button
              onClick={() => setWeekOffset((o) => o + 1)}
              className="rounded-lg border border-gray-200 p-1.5 hover:bg-gray-50"
            >
              <ChevronRight size={18} />
            </button>
            <span className="text-sm font-medium text-gray-700">{weekLabel}</span>
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
