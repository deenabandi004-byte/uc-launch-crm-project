import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFirebaseAuth } from "../contexts/FirebaseAuthContext";
import { parseWebsite, completeOnboarding as apiCompleteOnboarding } from "../services/api";
import { toast } from "sonner";
import { Building2, Target, MapPin, Globe, ArrowRight, ArrowLeft, Loader2, Check } from "lucide-react";

const INDUSTRIES = [
  "Technology", "SaaS", "E-commerce", "Healthcare", "Finance",
  "Real Estate", "Education", "Marketing", "Manufacturing", "Consulting",
  "Legal", "Construction", "Food & Beverage", "Retail", "Other",
];

const steps = [
  { icon: Building2, title: "Company Info", desc: "Tell us about your business" },
  { icon: Target, title: "Target Customers", desc: "Who do you sell to?" },
  { icon: MapPin, title: "Location", desc: "Where do you operate?" },
  { icon: Globe, title: "Website", desc: "Let us analyze your website" },
];

export default function OnboardingFlow() {
  const { completeOnboarding } = useFirebaseAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);

  const [form, setForm] = useState({
    companyName: "",
    industry: "",
    description: "",
    targetCustomers: "",
    targetIndustries: [] as string[],
    location: "",
    website: "",
    parsedWebsite: null as any,
  });

  const update = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const handleParseWebsite = async () => {
    if (!form.website) return;
    setParsing(true);
    try {
      const result = await parseWebsite(form.website);
      update("parsedWebsite", result);
      toast.success("Website analyzed successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to parse website");
    } finally {
      setParsing(false);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      // Try backend first, but fall back to client-side Firestore write
      try {
        await apiCompleteOnboarding(form);
      } catch (backendErr) {
        console.warn("Backend onboarding failed, using client-side write:", backendErr);
      }
      await completeOnboarding(form);
      toast.success("Welcome to OutboundCRM!");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Failed to complete onboarding");
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    if (step === 0) return form.companyName && form.industry;
    if (step === 1) return form.targetCustomers;
    if (step === 2) return form.location;
    return true;
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Steps sidebar */}
      <div className="hidden w-72 flex-col justify-center border-r bg-white/80 p-8 md:flex">
        <h2 className="mb-8 text-xl font-bold">Get Started</h2>
        {steps.map((s, i) => (
          <div key={i} className="mb-6 flex items-start gap-3">
            <div
              className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${
                i < step ? "bg-green-500 text-white" : i === step ? "bg-primary text-white" : "bg-muted text-muted-foreground"
              }`}
            >
              {i < step ? <Check size={16} /> : <s.icon size={16} />}
            </div>
            <div>
              <div className={`text-sm font-medium ${i === step ? "text-primary" : "text-foreground"}`}>
                {s.title}
              </div>
              <div className="text-xs text-muted-foreground">{s.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Form */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-lg space-y-6 rounded-2xl bg-white p-8 shadow-lg">
          <div>
            <h3 className="text-2xl font-bold">{steps[step].title}</h3>
            <p className="text-muted-foreground">{steps[step].desc}</p>
          </div>

          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Company Name</label>
                <input
                  className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Acme Inc."
                  value={form.companyName}
                  onChange={(e) => update("companyName", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Industry</label>
                <select
                  className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  value={form.industry}
                  onChange={(e) => update("industry", e.target.value)}
                >
                  <option value="">Select industry...</option>
                  {INDUSTRIES.map((i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Description</label>
                <textarea
                  className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  rows={3}
                  placeholder="What does your company do? (2-3 sentences)"
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Who are your target customers?</label>
                <textarea
                  className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  rows={3}
                  placeholder="e.g., Small to mid-size SaaS companies looking to improve their sales outreach"
                  value={form.targetCustomers}
                  onChange={(e) => update("targetCustomers", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Target Industries</label>
                <div className="flex flex-wrap gap-2">
                  {INDUSTRIES.map((ind) => (
                    <button
                      key={ind}
                      onClick={() => {
                        const arr = form.targetIndustries.includes(ind)
                          ? form.targetIndustries.filter((i) => i !== ind)
                          : [...form.targetIndustries, ind];
                        update("targetIndustries", arr);
                      }}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        form.targetIndustries.includes(ind)
                          ? "bg-primary text-white"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {ind}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <label className="mb-1 block text-sm font-medium">Geographic Focus</label>
              <input
                className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="e.g., San Francisco, United States"
                value={form.location}
                onChange={(e) => update("location", e.target.value)}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Where are your ideal customers located?
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Website URL</label>
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="https://yourcompany.com"
                    value={form.website}
                    onChange={(e) => update("website", e.target.value)}
                  />
                  <button
                    onClick={handleParseWebsite}
                    disabled={parsing || !form.website}
                    className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                  >
                    {parsing ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
                    Parse
                  </button>
                </div>
              </div>

              {form.parsedWebsite && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm">
                  <h4 className="mb-2 font-medium text-green-800">Extracted Info</h4>
                  {form.parsedWebsite.products?.length > 0 && (
                    <div className="mb-1">
                      <span className="font-medium">Products:</span>{" "}
                      {form.parsedWebsite.products.join(", ")}
                    </div>
                  )}
                  {form.parsedWebsite.targetMarket && (
                    <div className="mb-1">
                      <span className="font-medium">Target Market:</span>{" "}
                      {form.parsedWebsite.targetMarket}
                    </div>
                  )}
                  {form.parsedWebsite.valueProps?.length > 0 && (
                    <div>
                      <span className="font-medium">Value Props:</span>
                      <ul className="ml-4 mt-1 list-disc">
                        {form.parsedWebsite.valueProps.map((v: string, i: number) => (
                          <li key={i}>{v}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-4">
            {step > 0 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-1 rounded-lg px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft size={16} /> Back
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="flex items-center gap-1 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                Next <ArrowRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={loading}
                className="flex items-center gap-1 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Complete Setup
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
