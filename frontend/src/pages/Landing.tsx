import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, Menu, X, Search, Wrench, Send, Zap,
  CheckCircle2, Star, Users, BarChart3, Clipboard,
  Clock, DollarSign, Check,
} from "lucide-react";
import logoImg from "../assets/logo-circle.png";
import heroPhoto from "../assets/hero-photo.png";
import collageImg from "../assets/collage.png";

/* ═══════════════════════════════════════
   DATA
   ═══════════════════════════════════════ */

const NAV_LINKS = [
  { label: "Features", id: "features" },
  { label: "How It Works", id: "how-it-works" },
  { label: "Reviews", id: "testimonials" },
  { label: "Pricing", id: "pricing" },
];

const TYPEWRITER_WORDS = ["landscapers.", "roofers.", "plumbers.", "contractors.", "small businesses."];

const STEP_SECTIONS = [
  {
    step: "Step 1", headline: "Find your next client in seconds",
    copy: "Search millions of verified contacts by industry, location, company size, and job title. Powered by Offerloop's database. No cold list buying. No guesswork. Your next customer is already in here.",
    stat: "10M+ verified contacts in our database", icon: Search, mockupLabel: "Contact Database Preview",
  },
  {
    step: "Step 2", headline: "AI writes your emails. You just hit send.",
    copy: "Design email campaigns, generate personalized outreach with AI, and track opens and replies — all from one place. No more switching between Gmail, spreadsheets, and sticky notes.",
    stat: "80% of sales need 5+ follow-ups. Outbound automates them.", icon: Send, mockupLabel: "AI Email Composer Preview",
  },
  {
    step: "Step 3", headline: "Every lead, every deal, one view",
    copy: "Leads from your campaigns flow directly into your pipeline. See exactly where every prospect stands and know who to call today. Nothing falls through the cracks.",
    stat: "35% close rate with follow-up vs 22% without", icon: BarChart3, mockupLabel: "Pipeline Dashboard Preview",
  },
];

const TRADE_PILLS = ["Landscaping", "Roofing", "HVAC", "Plumbing", "Electrical", "General Contracting", "Painting", "Fencing"];

const MARQUEE_QUOTES = [
  { text: "Found 50 qualified leads in my first hour. Nothing else comes close.", name: "Jason M.", trade: "Marketing Agency" },
  { text: "The AI emails sound like me. Clients have no idea it's automated.", name: "Sarah T.", trade: "Consulting Firm" },
  { text: "Apollo was overkill. Outbound is exactly what a small team needs.", name: "David K.", trade: "Roofing Company" },
  { text: "We booked 4 new clients in our first week using the database.", name: "Maria S.", trade: "Landscaping Business" },
  { text: "Set up in 90 seconds. Closed my first deal in 3 days.", name: "James L.", trade: "HVAC Company" },
  { text: "Finally — outbound sales that doesn't require a full sales team.", name: "Tom W.", trade: "Electrical Contractor" },
];

const COMPARISON_ROWS = [
  { feature: "Contact database", apollo: "Enterprise only", hubspot: false, outbound: "Included" },
  { feature: "AI email writing", apollo: "Limited", hubspot: "Paid add-on", outbound: "Built in" },
  { feature: "Setup time", apollo: "Days", hubspot: "Hours", outbound: "90 seconds" },
  { feature: "Price for small team", apollo: "$150+/mo", hubspot: "$150+/mo", outbound: "$29/mo flat" },
  { feature: "Built for small business", apollo: false, hubspot: false, outbound: true },
  { feature: "Outreach + pipeline in one", apollo: false, hubspot: "Partial", outbound: true },
];

const TESTIMONIALS = [
  { name: "Carlos M.", role: "Roofing contractor", location: "San Antonio, TX", text: "I used to lose track of deals all the time. Now I just open the app and everything's there. Closed 4 extra deals last month I would've forgotten about.", rating: 5 },
  { name: "Sarah J.", role: "Landscaping owner", location: "Austin, TX", text: "Honestly I signed up because the follow-up templates looked useful. Turns out that's all I needed — clients actually respond now.", rating: 5 },
  { name: "Priya K.", role: "Agency owner", location: "Houston, TX", text: "We were using spreadsheets for everything. This replaced all of it in about an hour. My team loves the pipeline view.", rating: 5 },
];

const KANBAN_COLS = ["New Lead", "Estimate Sent", "Follow-Up", "Job Won"];
const KANBAN_INIT: { id: string; name: string; job: string; value: string; col: string }[] = [
  { id: "k1", name: "Green Valley LLC", job: "Spring cleanup", value: "$1,800", col: "New Lead" },
  { id: "k2", name: "Mike Torres", job: "Lawn redesign", value: "$4,200", col: "Estimate Sent" },
  { id: "k3", name: "Sarah Mitchell", job: "Patio install", value: "$8,500", col: "Follow-Up" },
];

/* ═══════════════════════════════════════
   HOOKS
   ═══════════════════════════════════════ */

function useTypewriter(words: string[], typingSpeed = 60, holdTime = 2000, deleteSpeed = 35) {
  const [display, setDisplay] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = words[wordIndex];
    let timeout: ReturnType<typeof setTimeout>;

    if (!deleting && charIndex < word.length) {
      timeout = setTimeout(() => { setCharIndex(charIndex + 1); setDisplay(word.slice(0, charIndex + 1)); }, typingSpeed);
    } else if (!deleting && charIndex === word.length) {
      timeout = setTimeout(() => setDeleting(true), holdTime);
    } else if (deleting && charIndex > 0) {
      timeout = setTimeout(() => { setCharIndex(charIndex - 1); setDisplay(word.slice(0, charIndex - 1)); }, deleteSpeed);
    } else if (deleting && charIndex === 0) {
      setDeleting(false);
      setWordIndex((wordIndex + 1) % words.length);
    }

    return () => clearTimeout(timeout);
  }, [charIndex, deleting, wordIndex, words, typingSpeed, holdTime, deleteSpeed]);

  return display;
}

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("visible"); } }); },
      { threshold: 0.1 }
    );
    const children = el.querySelectorAll(".scroll-reveal");
    children.forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, []);

  return ref;
}

function useAnimatedCounter(target: number, duration = 1500) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && !started) setStarted(true); },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const startTime = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, target, duration]);

  return { count, ref };
}

/* ═══════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════ */

export default function Landing() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);

  // Typewriter
  const typedWord = useTypewriter(TYPEWRITER_WORDS);

  // Scroll reveal refs
  const painRef = useScrollReveal();
  const statsRef = useScrollReveal();
  const stepsRef = useScrollReveal();
  const compareRef = useScrollReveal();
  const pipelineRef = useScrollReveal();
  const testimonialsRef = useScrollReveal();
  const pricingRef = useScrollReveal();

  // Animated counters
  const stat2 = useAnimatedCounter(80);
  const stat3 = useAnimatedCounter(3);
  const stat4 = useAnimatedCounter(90);

  // Kanban state
  const [kanbanCards, setKanbanCards] = useState(KANBAN_INIT);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [confetti, setConfetti] = useState<{ id: number; left: number; color: string }[]>([]);
  const [flashCol, setFlashCol] = useState<string | null>(null);

  const handleDragStart = (id: string) => setDragId(id);
  const handleDragOver = (e: React.DragEvent, col: string) => { e.preventDefault(); setDragOverCol(col); };
  const handleDragLeave = () => setDragOverCol(null);
  const handleDrop = useCallback((col: string) => {
    if (!dragId) return;
    setKanbanCards((prev) => prev.map((c) => c.id === dragId ? { ...c, col } : c));
    setDragOverCol(null);
    setDragId(null);
    if (col === "Job Won") {
      setFlashCol("Job Won");
      setTimeout(() => setFlashCol(null), 600);
      const pieces = Array.from({ length: 20 }, (_, i) => ({
        id: Date.now() + i,
        left: Math.random() * 100,
        color: ["#7C3AED", "#A78BFA", "#FACC15", "#34D399", "#F472B6"][Math.floor(Math.random() * 5)],
      }));
      setConfetti(pieces);
      setTimeout(() => setConfetti([]), 1500);
    }
  }, [dragId]);

  useEffect(() => {
    const handleScroll = () => setNavScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileMenuOpen(false);
  };

  const SERIF = "'Libre Baskerville', Georgia, serif";

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "linear-gradient(135deg, #F0EEFF 0%, #FFFFFF 100%)", overflowX: "hidden" }}>

      {/* ── NAVBAR ── */}
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-center" style={{ padding: "12px 24px 8px" }}>
        <header
          className="flex items-center justify-between w-full h-12 px-5 md:px-6"
          style={{
            maxWidth: 860,
            background: navScrolled ? "rgba(255,255,255,0.96)" : "rgba(255,255,255,0.88)",
            backdropFilter: "blur(16px) saturate(1.4)",
            WebkitBackdropFilter: "blur(16px) saturate(1.4)",
            border: "1px solid rgba(91,33,182,0.1)",
            borderRadius: 100,
            boxShadow: navScrolled ? "0 2px 16px rgba(91,33,182,0.08)" : "0 1px 8px rgba(0,0,0,0.03)",
            transition: "all 0.3s ease",
          }}
        >
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <img src={logoImg} alt="Outbound" style={{ width: 32, height: 32, objectFit: "contain" }} />
            <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 17, color: "#0f2545" }}>Outbound</span>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <button key={link.id} onClick={() => scrollTo(link.id)} className="nav-link text-sm relative" style={{ color: "#4A5E80", fontFamily: SERIF, fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>
                {link.label}
              </button>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => navigate("/onboarding")}
              style={{ background: "transparent", color: "#0F172A", fontSize: 12, fontWeight: 600, fontFamily: SERIF, padding: "6px 14px", borderRadius: 100, border: "1px solid rgba(91,33,182,0.2)", cursor: "pointer", transition: "all 0.15s ease", lineHeight: 1.4, whiteSpace: "nowrap" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,0,0,0.03)"; e.currentTarget.style.borderColor = "rgba(91,33,182,0.35)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(91,33,182,0.2)"; }}
            >Sign in</button>
            <button
              onClick={() => navigate("/onboarding")}
              style={{ background: "#7C3AED", color: "#fff", fontSize: 12, fontWeight: 600, fontFamily: SERIF, padding: "6px 14px", borderRadius: 3, border: "none", cursor: "pointer", transition: "background 0.15s ease", lineHeight: 1.4, whiteSpace: "nowrap" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#5B21B6"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#7C3AED"; }}
            >Try it free</button>
          </div>

          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2" style={{ color: "#4A5E80", background: "none", border: "none" }}>
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>
      </div>

      {mobileMenuOpen && (
        <div className="fixed top-[72px] left-4 right-4 md:hidden z-40" style={{ background: "rgba(255,255,255,0.98)", border: "1px solid rgba(91,33,182,0.1)", borderRadius: 16, boxShadow: "0 4px 24px rgba(91,33,182,0.08)", backdropFilter: "blur(16px)" }}>
          <nav className="flex flex-col p-3 gap-1">
            {NAV_LINKS.map((link) => (
              <button key={link.id} onClick={() => scrollTo(link.id)} className="text-left px-4 py-3 text-sm font-medium rounded-lg hover:bg-gray-50" style={{ color: "#4A5E80", fontFamily: SERIF, background: "none", border: "none" }}>{link.label}</button>
            ))}
            <div style={{ borderTop: "1px solid rgba(91,33,182,0.08)", marginTop: 8, paddingTop: 8 }}>
              <button onClick={() => { navigate("/onboarding"); setMobileMenuOpen(false); }} className="w-full text-center py-3 text-sm font-semibold" style={{ background: "#7C3AED", color: "#fff", borderRadius: 3, border: "none", cursor: "pointer" }}>Try it free</button>
            </div>
          </nav>
        </div>
      )}

      <div className="h-20" />

      {/* ═══ HERO ═══ */}
      <section className="bg-waffle" style={{ background: "linear-gradient(135deg, #F0EEFF 0%, #FFFFFF 100%)", overflow: "hidden", position: "relative", minHeight: 640 }}>
        {/* Hero image */}
        <div className="hero-fade-up hero-fade-up-delay-2" style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "flex-end", alignItems: "flex-end" }}>
          <img src={heroPhoto} alt="Outbound CRM dashboard with team collaboration" className="hero-bg-img" style={{ width: "70%", height: "auto", display: "block", objectFit: "contain", objectPosition: "right bottom" }} />
        </div>

        {/* Text overlay */}
        <div style={{ position: "relative", zIndex: 3, maxWidth: 1200, margin: "0 auto", padding: "0 clamp(24px, 4vw, 64px)", minHeight: 640, display: "flex", alignItems: "center" }}>
          <div className="hero-left-col" style={{ maxWidth: 440, paddingTop: 100, paddingBottom: 80 }}>
            <div className="hero-fade-up hero-fade-up-delay-1" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
              <img src={logoImg} alt="Outbound" style={{ width: 34, height: 34, objectFit: "contain" }} />
              <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 18, color: "#0f2545" }}>Outbound</span>
            </div>

            <h1 className="hero-fade-up hero-fade-up-delay-1" style={{ fontFamily: SERIF, fontSize: 38, fontWeight: 400, lineHeight: 1.25, letterSpacing: "-0.015em", color: "#0f2545", margin: "0 0 16px" }}>
              The simple CRM<br />for <span style={{ color: "#A78BFA" }}>{typedWord}</span><span className="typewriter-cursor" />
            </h1>

            <p className="hero-fade-up hero-fade-up-delay-3" style={{ fontSize: 14, lineHeight: 1.7, color: "#6B7280", margin: "0 0 24px", maxWidth: 380 }}>
              48% of estimates go unfollowed. Outbound makes sure yours aren't. Track clients, follow up automatically, and close more jobs — set up in 90 seconds.
            </p>

            <div className="hero-fade-up hero-fade-up-delay-4" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={() => navigate("/onboarding")} className="btn-pulse" style={{ background: "#7C3AED", color: "#fff", fontFamily: SERIF, fontWeight: 600, borderRadius: 3, padding: "10px 22px", border: "none", cursor: "pointer", fontSize: 13 }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#5B21B6"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#7C3AED"; }}
              >Start free trial <ArrowRight size={13} style={{ display: "inline", marginLeft: 5, verticalAlign: "middle" }} /></button>
              <button onClick={() => scrollTo("features")} style={{ background: "rgba(255,255,255,0.8)", color: "#4A5E80", fontFamily: SERIF, fontWeight: 600, borderRadius: 3, padding: "10px 22px", border: "1px solid rgba(91,33,182,0.2)", cursor: "pointer", fontSize: 13, backdropFilter: "blur(4px)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.95)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.8)"; }}
              >See how it works</button>
            </div>

            <p className="hero-fade-up hero-fade-up-delay-4" style={{ fontSize: 11, color: "#94A3B8", marginTop: 12, lineHeight: 1.5 }}>
              Trusted by landscapers, roofers, HVAC techs, and contractors across the US. Free plan. No credit card. 90 seconds to set up.
            </p>
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 768px) {
          .hero-bg-img { width: 100% !important; }
          .hero-left-col { max-width: 100% !important; }
        }
      `}</style>

      {/* ═══ TRADE PILLS ═══ */}
      <section style={{ background: "#FAFBFF", borderTop: "1px solid #EDE9FE", borderBottom: "1px solid #EDE9FE", padding: "16px 0" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10 }}>
          {TRADE_PILLS.map((t) => (
            <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#F5F3FF", color: "#7C3AED", fontSize: 13, fontWeight: 500, padding: "5px 12px", borderRadius: 100 }}>
              <Check size={13} strokeWidth={3} /> {t}
            </span>
          ))}
        </div>
      </section>

      {/* ═══ PAIN POINTS ═══ */}
      <section style={{ position: "relative", padding: "80px 0 80px", overflow: "hidden" }} ref={painRef}>
        {/* Collage background */}
        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          <img src={collageImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.18, filter: "grayscale(20%) blur(1px)" }} />
        </div>
        {/* White overlay */}
        <div style={{ position: "absolute", inset: 0, zIndex: 1, background: "rgba(255,255,255,0.35)" }} />

        <div style={{ position: "relative", zIndex: 2, maxWidth: 1000, margin: "0 auto", padding: "0 24px" }}>
          <div className="scroll-reveal" style={{ textAlign: "left", marginBottom: 48 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#7C3AED", marginBottom: 12 }}>Sound familiar?</div>
            <h2 style={{ fontFamily: SERIF, fontSize: 38, fontWeight: 700, color: "#0f2545", lineHeight: 1.2, marginBottom: 12 }}>Most small teams lose deals before they even start.</h2>
            <p style={{ fontSize: 16, color: "#6B7280", maxWidth: 540 }}>Not because of bad service — because of missing systems. Here's where it breaks down.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {[
              { emoji: "\uD83D\uDCCB", title: "You hunt for contacts manually", pain: "You spend hours looking for the right person at the right company. Then you still don't know what to say.", fix: "Outbound finds verified contacts instantly and writes the first email for you.", iconBg: "#FFF5F5", iconColor: "#FCA5A5" },
              { emoji: "\u23F1", title: "One email and nothing", pain: "You send one email, hear nothing, and move on. 80% of deals close after 5+ touchpoints.", fix: "Outbound runs your follow-up sequence automatically until they respond.", iconBg: "#FFF5F5", iconColor: "#FCA5A5" },
              { emoji: "\uD83D\uDCB8", title: "Everything is disconnected", pain: "Your leads live in a spreadsheet, your emails are in Gmail, and your pipeline is in your head.", fix: "Outbound connects all three. One platform, zero chaos.", iconBg: "#F5F3FF", iconColor: "#C4B5FD" },
            ].map((item, i) => (
              <div key={i} className="scroll-reveal" style={{ transitionDelay: `${i * 0.1}s`, borderRadius: 16, overflow: "hidden", border: "1px solid rgba(226,232,240,0.7)", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", transition: "all 0.2s ease" }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(0,0,0,0.08)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.04)"; }}
              >
                <div style={{ background: "rgba(255,255,255,0.88)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", padding: 24 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: item.iconBg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14, fontSize: 20 }}>
                    {item.emoji}
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0F172A", fontFamily: SERIF, marginBottom: 8 }}>{item.title}</h3>
                  <p style={{ fontSize: 14, lineHeight: 1.6, color: "#475569" }}>{item.pain}</p>
                </div>
                <div style={{ background: "rgba(255,255,255,0.88)", backdropFilter: "blur(12px)", padding: "12px 24px", borderTop: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: 8 }}>
                  <CheckCircle2 size={14} style={{ color: "#059669", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: "#059669", fontWeight: 500 }}>{item.fix}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ STATS BAR ═══ */}
      <section style={{ position: "relative", overflow: "hidden" }} ref={statsRef}>
        {/* Collage background */}
        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          <img src={collageImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.12, filter: "grayscale(60%)" }} />
        </div>
        {/* Purple overlay */}
        <div style={{ position: "absolute", inset: 0, zIndex: 1, background: "rgba(124,58,237,0.92)" }} />

        <div className="scroll-reveal" style={{ position: "relative", zIndex: 2, maxWidth: 1060, margin: "0 auto", padding: "3rem 2rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 32, textAlign: "center" }}>
          <div>
            <div style={{ fontSize: 44, fontWeight: 700, color: "#fff", fontFamily: SERIF }}>2.2B+</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 6 }}>verified contacts in our database</div>
          </div>
          <div>
            <div style={{ fontSize: 44, fontWeight: 700, color: "#fff", fontFamily: SERIF }}><span ref={stat2.ref}>{stat2.count}</span>%</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 6 }}>of sales need 5+ follow-ups to close</div>
          </div>
          <div>
            <div style={{ fontSize: 44, fontWeight: 700, color: "#fff", fontFamily: SERIF }}><span ref={stat3.ref}>{stat3.count}</span>x</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 6 }}>more replies with AI-personalized outreach</div>
          </div>
          <div>
            <div style={{ fontSize: 44, fontWeight: 700, color: "#fff", fontFamily: SERIF }}><span ref={stat4.ref}>{stat4.count}</span>s</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 6 }}>to set up — no training required</div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURE STEPS (alternating left/right) ═══ */}
      <div ref={stepsRef}>
        {STEP_SECTIONS.map((section, i) => {
          const textLeft = i % 2 === 0;
          const textBlock = (
            <div style={{ flex: "1 1 45%", minWidth: 300 }}>
              <span className="scroll-reveal" style={{ display: "inline-block", background: "#F5F3FF", color: "#7C3AED", fontSize: 12, fontWeight: 500, padding: "4px 14px", borderRadius: 20, marginBottom: 16, transitionDelay: "0s" }}>{section.step}</span>
              <h2 className="scroll-reveal" style={{ fontFamily: SERIF, fontSize: 36, fontWeight: 400, color: "#0f2545", lineHeight: 1.2, marginBottom: 16, transitionDelay: "0.05s" }}>{section.headline}</h2>
              <p className="scroll-reveal" style={{ fontSize: 15, lineHeight: 1.65, color: "#6B7280", marginBottom: 20, maxWidth: 440, transitionDelay: "0.1s" }}>{section.copy}</p>
              <div className="scroll-reveal" style={{ display: "flex", alignItems: "center", gap: 8, transitionDelay: "0.15s" }}>
                <CheckCircle2 size={16} style={{ color: "#7C3AED", flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#7C3AED" }}>{section.stat}</span>
              </div>
            </div>
          );
          const mockup = (
            <div className="scroll-reveal" style={{ flex: "1 1 45%", minWidth: 300, display: "flex", alignItems: "center", justifyContent: "center", transitionDelay: "0.1s" }}>
              <div style={{ width: "100%", maxWidth: 440, height: 300, background: "#F5F3FF", border: "2px dashed #C4B5FD", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ textAlign: "center" }}>
                  <section.icon size={32} style={{ color: "#C4B5FD", marginBottom: 8 }} />
                  <div style={{ fontSize: 13, color: "#94A3B8" }}>{section.mockupLabel}</div>
                </div>
              </div>
            </div>
          );
          return (
            <section key={i} id={i === 0 ? "features" : undefined} style={{ padding: "80px 0", background: i % 2 === 0 ? "#fff" : "#FAFBFF" }}>
              <div style={{ maxWidth: 1060, margin: "0 auto", padding: "0 clamp(24px, 4vw, 64px)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 48, minHeight: 500 }}>
                {textLeft ? <>{textBlock}{mockup}</> : <>{mockup}{textBlock}</>}
              </div>
            </section>
          );
        })}
      </div>

      {/* ═══ INTERACTIVE PIPELINE ═══ */}
      <section style={{ padding: "80px 0", background: "#fff" }} ref={pipelineRef}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px" }}>
          <div className="scroll-reveal" style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontFamily: SERIF, fontSize: "clamp(28px, 4vw, 36px)", fontWeight: 400, color: "#0f2545", marginBottom: 10 }}>See your pipeline. Drag a deal.</h2>
            <p style={{ fontSize: 16, color: "#6B7280" }}>Try it — drag a card to a new stage.</p>
          </div>
          <div className="scroll-reveal" style={{ display: "grid", gridTemplateColumns: `repeat(${KANBAN_COLS.length}, 1fr)`, gap: 12, minHeight: 260 }}>
            {KANBAN_COLS.map((col) => {
              const stageColors: Record<string, string> = { "New Lead": "#3B82F6", "Estimate Sent": "#F59E0B", "Follow-Up": "#7C3AED", "Job Won": "#10B981" };
              return (
                <div key={col} className={`kanban-col${dragOverCol === col ? " drag-over" : ""}${flashCol === col ? " job-won-flash" : ""}`}
                  style={{ background: "#F8FAFC", borderRadius: 8, padding: 10, minHeight: 200, position: "relative", transition: "background 0.2s" }}
                  onDragOver={(e) => handleDragOver(e, col)} onDragLeave={handleDragLeave} onDrop={() => handleDrop(col)}
                >
                  <div style={{ display: "inline-block", background: stageColors[col], color: "#fff", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 100, marginBottom: 10 }}>{col}</div>
                  {kanbanCards.filter((c) => c.col === col).map((card) => (
                    <div key={card.id} className={`kanban-card${dragId === card.id ? " dragging" : ""}`} draggable onDragStart={() => handleDragStart(card.id)}
                      style={{ background: "#fff", borderRadius: 6, padding: "10px 12px", marginBottom: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", border: "1px solid #E2E8F0" }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#0F172A" }}>{card.name}</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>{card.job} · {card.value}</div>
                    </div>
                  ))}
                  {col === "Job Won" && confetti.map((p) => (
                    <div key={p.id} className="confetti-piece" style={{ left: `${p.left}%`, top: 0, background: p.color, animationDelay: `${Math.random() * 0.3}s` }} />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ TESTIMONIAL MARQUEE ═══ */}
      <section style={{ padding: "48px 0", background: "#FAFBFF", overflow: "hidden", borderTop: "1px solid #EDE9FE", borderBottom: "1px solid #EDE9FE" }}>
        <div style={{ overflow: "hidden" }}>
          <div className="marquee-track">
            {[...MARQUEE_QUOTES, ...MARQUEE_QUOTES].map((q, i) => (
              <div key={i} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, padding: "20px 24px", minWidth: 300, maxWidth: 340, flexShrink: 0 }}>
                <span style={{ fontFamily: SERIF, fontSize: 28, color: "#C4B5FD", lineHeight: 1 }}>"</span>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: "#475569", marginTop: -8, marginBottom: 12 }}>{q.text}</p>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{q.name}</div>
                <div style={{ fontSize: 11, color: "#94A3B8" }}>{q.trade}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TESTIMONIALS ═══ */}
      <section id="testimonials" style={{ padding: "80px 0", background: "#FFFFFF" }} ref={testimonialsRef}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px" }}>
          <div className="scroll-reveal" style={{ textAlign: "center", marginBottom: 56 }}>
            <h2 style={{ fontFamily: SERIF, fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 400, color: "#0f2545" }}>Don't take our word for it</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {TESTIMONIALS.map((t, i) => (
              <div key={t.name} className="glass-card scroll-reveal" style={{ padding: 24, transitionDelay: `${i * 0.1}s` }}>
                <div style={{ display: "flex", gap: 2, marginBottom: 12 }}>
                  {Array.from({ length: t.rating }).map((_, j) => <Star key={j} size={14} className="fill-amber-400 text-amber-400" />)}
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.65, color: "#475569", marginBottom: 16 }}>"{t.text}"</p>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>{t.name}</div>
                <div style={{ fontSize: 12, color: "#94A3B8" }}>{t.role} · {t.location}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section id="pricing" className="bg-dots" style={{ background: "#FAFBFF", padding: "80px 0" }} ref={pricingRef}>
        <div style={{ maxWidth: 420, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
          <div className="scroll-reveal">
            <h2 style={{ fontFamily: SERIF, fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 400, color: "#0f2545", marginBottom: 12 }}>Pricing that makes sense</h2>
            <p style={{ fontSize: 16, color: "#6B7280", marginBottom: 32 }}>Start free. Upgrade when you're ready. Cancel whenever.</p>
          </div>
          <div className="glass-card scroll-reveal" style={{ padding: 32, textAlign: "left" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#7C3AED", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>Starter</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 8 }}>
              <span style={{ fontSize: 40, fontWeight: 700, color: "#0F172A", fontFamily: SERIF }}>$0</span>
              <span style={{ fontSize: 14, color: "#94A3B8" }}>/month</span>
            </div>
            <p style={{ fontSize: 14, color: "#64748b", marginBottom: 24 }}>Up to 50 contacts. No strings.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {["Unlimited pipeline tracking", "AI-written email sequences", "AI assistant (50 queries/mo)", "Contact database access", "Activity log & notes"].map((item) => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#475569" }}>
                  <CheckCircle2 size={16} style={{ color: "#7C3AED", flexShrink: 0 }} />
                  {item}
                </div>
              ))}
            </div>
            <button onClick={() => navigate("/onboarding")} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 0", fontSize: 14, fontWeight: 600, background: "#7C3AED", color: "#fff", borderRadius: 3, fontFamily: SERIF, border: "none", cursor: "pointer" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#5B21B6"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#7C3AED"; }}
            >Get started free <ArrowRight size={14} /></button>
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section style={{ padding: "100px 0", background: "#1E1B2E" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
          <h2 style={{ fontFamily: SERIF, fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 400, color: "#fff", marginBottom: 16 }}>Your next client is already in our database.</h2>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.65)", marginBottom: 32 }}>Find them, reach out, and close the deal — all in one platform. Free to start.</p>
          <button onClick={() => navigate("/onboarding")} style={{ background: "#fff", color: "#7C3AED", fontFamily: SERIF, fontWeight: 600, borderRadius: 3, padding: "14px 34px", border: "none", cursor: "pointer", fontSize: 15, transition: "all 0.15s ease" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#F5F3FF"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}
          >Start finding clients free <ArrowRight size={14} style={{ display: "inline", marginLeft: 6, verticalAlign: "middle" }} /></button>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 16 }}>No credit card. 90 seconds to set up. Cancel anytime.</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: "#1E1B2E", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "48px 0", color: "#f8fafc" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src={logoImg} alt="Outbound" style={{ width: 28, height: 28, objectFit: "contain" }} />
            <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 16, color: "#fff" }}>Outbound</span>
          </div>
          <div style={{ display: "flex", gap: 24, fontSize: 13, color: "rgba(255,255,255,.45)" }}>
            <span className="cursor-pointer hover:text-white" style={{ transition: "color 0.2s" }}>Privacy</span>
            <span className="cursor-pointer hover:text-white" style={{ transition: "color 0.2s" }}>Terms</span>
            <span className="cursor-pointer hover:text-white" style={{ transition: "color 0.2s" }}>Support</span>
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.30)" }}>&copy; 2026 Outbound</div>
        </div>
      </footer>
    </div>
  );
}
