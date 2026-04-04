import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFirebaseAuth } from "../contexts/FirebaseAuthContext";
import { parseWebsite, completeOnboarding as apiCompleteOnboarding } from "../services/api";
import { toast } from "sonner";
import { Building2, Target, MapPin, Globe, ArrowRight, ArrowLeft, Loader2, Check, X, ChevronDown, Search } from "lucide-react";
import { City } from "country-state-city";

const INDUSTRIES = [
  "Aerospace",
  "Agriculture",
  "Airlines",
  "Alternative Energy",
  "Animation",
  "Apparel",
  "Architecture",
  "Artificial Intelligence",
  "Arts and Crafts",
  "Automotive",
  "Aviation Services",
  "Banking",
  "Biotechnology",
  "Blockchain",
  "Broadcast Media",
  "Building Materials",
  "Business Consulting",
  "Cannabis",
  "Capital Markets",
  "Chemicals",
  "Childcare Services",
  "Civic and Social Organizations",
  "Civil Engineering",
  "Cloud Computing",
  "Commercial Real Estate",
  "Computer Hardware",
  "Computer Networking",
  "Computer Software",
  "Construction",
  "Consumer Electronics",
  "Consumer Goods",
  "Consumer Services",
  "Content Creation",
  "Corporate Training",
  "Cosmetics",
  "Courier Services",
  "Cybersecurity",
  "Data Analytics",
  "Defense and Space",
  "Dental Services",
  "Design Services",
  "Digital Marketing",
  "Distribution",
  "E-learning",
  "E-commerce",
  "Education Management",
  "Electrical Manufacturing",
  "Emergency Services",
  "Employment Services",
  "Energy",
  "Engineering Services",
  "Entertainment",
  "Environmental Services",
  "Event Services",
  "Facilities Services",
  "Farming",
  "Fashion",
  "Film Production",
  "Financial Services",
  "Fine Art",
  "Fishing",
  "Food and Beverage",
  "Food Production",
  "Fundraising",
  "Furniture",
  "Gambling and Casinos",
  "Glass and Ceramics",
  "Government Administration",
  "Graphic Design",
  "Health and Wellness",
  "Health Insurance",
  "Higher Education",
  "Home Services",
  "Hospital and Health Care",
  "Hospitality",
  "Human Resources",
  "HVAC Services",
  "Import and Export",
  "Industrial Automation",
  "Industrial Engineering",
  "Information Services",
  "Information Technology",
  "Infrastructure",
  "Insurance",
  "Interior Design",
  "Internet",
  "Investment Banking",
  "Investment Management",
  "Janitorial Services",
  "Jewelry",
  "Law Enforcement",
  "Law Practice",
  "Leasing",
  "Legal Services",
  "Leisure and Travel",
  "Logistics",
  "Luxury Goods",
  "Machinery",
  "Management Consulting",
  "Marine Services",
  "Market Research",
  "Marketing and Advertising",
  "Mechanical Engineering",
  "Media Production",
  "Medical Devices",
  "Medical Practice",
  "Mental Health Care",
  "Metals",
  "Mining and Metals",
  "Mobile Apps",
  "Motion Pictures",
  "Museums and Institutions",
  "Music",
  "Nanotechnology",
  "Nonprofit Organization Management",
  "Oil and Gas",
  "Online Publishing",
  "Outsourcing",
  "Package and Freight Delivery",
  "Packaging and Containers",
  "Paper and Forest Products",
  "Performing Arts",
  "Personal Care",
  "Personal Development",
  "Pet Services",
  "Pharmaceuticals",
  "Photography",
  "Plastics",
  "Political Organization",
  "Primary Education",
  "Printing",
  "Procurement Services",
  "Professional Training",
  "Program Development",
  "Property Management",
  "Public Policy",
  "Public Relations",
  "Public Safety",
  "Publishing",
  "Railroad Manufacturing",
  "Real Estate",
  "Recreational Facilities",
  "Religious Institutions",
  "Renewables and Environment",
  "Research",
  "Restaurants",
  "Retail",
  "Robotics",
  "Security Services",
  "Semiconductors",
  "Shipbuilding",
  "Skincare",
  "Smart Home Technology",
  "Social Media",
  "Sporting Goods",
  "Sports",
  "Staffing and Recruiting",
  "Supply Chain",
  "Telecommunications",
  "Textiles",
  "Think Tanks",
  "Tobacco",
  "Translation and Localization",
  "Transportation",
  "Travel and Tourism",
  "Utilities",
  "Venture Capital",
  "Veterinary",
  "Video Games",
  "Warehousing",
  "Waste Management",
  "Water Treatment",
  "Web Development",
  "Wholesale",
  "Wine and Spirits",
  "Wireless",
  "Writing and Editing",
  "3D Printing",
  "Acoustics",
  "AdTech",
  "Affiliate Marketing",
  "AgriTech",
  "Animal Health",
  "Aquaculture",
  "Battery Technology",
  "Bioinformatics",
  "Building Security",
  "Business Intelligence",
  "Call Center Services",
  "Cartography",
  "Clinical Research",
  "Clinical Services",
  "Commercial Cleaning",
  "Commodities Trading",
  "Community Management",
  "Compliance Services",
  "Construction Tech",
  "Creative Services",
  "CRM Software",
  "Cryptocurrency",
  "Customer Support Services",
  "Deep Tech",
  "Delivery Services",
  "Digital Health",
  "Digital Identity",
  "Drone Services",
  "EdTech",
  "Electrical Equipment",
  "Enterprise Software",
  "EV Charging",
  "Family Services",
  "Field Services",
  "Fleet Management",
  "Food Tech",
  "Fraud Prevention",
  "Franchising",
  "Fulfillment Services",
  "Gaming Hardware",
  "Geospatial Services",
  "GovTech",
  "Green Building",
  "Help Desk Services",
  "Home Improvement",
  "Identity and Access Management",
  "Inspection Services",
  "InsurTech",
  "IoT",
  "Knowledge Management",
  "Laboratory Services",
  "Last-Mile Delivery",
  "Manufacturing",
  "MarTech",
  "MedTech",
  "Micro-mobility",
  "Mortgage Services",
  "Network Security",
  "Occupational Health",
  "Office Supplies",
  "Payment Processing",
  "People Operations",
  "Point of Sale",
  "Predictive Analytics",
  "Private Equity",
  "Process Automation",
  "Product Design",
  "Quantum Computing",
  "RegTech",
  "Remote Work Tools",
  "Revenue Operations",
  "Risk Management",
  "Sales Enablement",
  "Sales Tech",
  "Search Engine Optimization",
  "Smart Manufacturing",
  "Space Technology",
  "Sustainability",
  "Tech Support",
  "Telehealth",
  "Testing and QA",
  "Urban Planning",
  "UX/UI Design",
  "Virtual Reality",
  "Voice Technology",
  "Workplace Safety",
];

const steps = [
  { icon: Building2, title: "Company Details", desc: "Tell us what your company does" },
  { icon: Target, title: "Audience & Location", desc: "Define target customers and city" },
  { icon: MapPin, title: "Create Your Page", desc: "Review and finish setup" },
];

const US_CITIES = Array.from(
  new Set(
    (City.getCitiesOfCountry("US") ?? [])
      .filter((city) => city.name && city.stateCode)
      .map((city) => `${city.name}, ${city.stateCode}`),
  ),
).sort((a, b) => a.localeCompare(b));

export default function OnboardingFlow() {
  const { completeOnboarding } = useFirebaseAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [targetCustomerInput, setTargetCustomerInput] = useState("");
  const [targetCustomerTags, setTargetCustomerTags] = useState<string[]>([]);
  const [industryQuery, setIndustryQuery] = useState("");
  const [showIndustryDropdown, setShowIndustryDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const industryInputRef = useRef<HTMLInputElement>(null);
  const industryListRef = useRef<HTMLDivElement>(null);

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

  const addTargetCustomer = (value: string) => {
    const cleanValue = value.trim();
    if (!cleanValue) return;
    if (targetCustomerTags.some((tag) => tag.toLowerCase() === cleanValue.toLowerCase())) {
      setTargetCustomerInput("");
      return;
    }
    const updated = [...targetCustomerTags, cleanValue];
    setTargetCustomerTags(updated);
    setTargetCustomerInput("");
    update("targetCustomers", updated.join(", "));
  };

  const removeTargetCustomer = (tagToRemove: string) => {
    const updated = targetCustomerTags.filter((tag) => tag !== tagToRemove);
    setTargetCustomerTags(updated);
    update("targetCustomers", updated.join(", "));
  };

  const selectedCityExists = useMemo(() => US_CITIES.includes(form.location), [form.location]);

  const canProceed = () => {
    if (step === 0) return form.companyName && form.industry && form.description;
    if (step === 1) {
      const hasCustomers = targetCustomerTags.length > 0 || targetCustomerInput.trim().length > 0;
      return hasCustomers && form.location && selectedCityExists;
    }
    return true;
  };
  const filteredIndustries = useMemo(() => {
    const query = industryQuery.trim().toLowerCase();
    const matches = query
      ? INDUSTRIES.filter((industry) => industry.toLowerCase().includes(query))
      : INDUSTRIES;
    return matches.slice(0, 7);
  }, [industryQuery]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [industryQuery]);

  useEffect(() => {
    if (showIndustryDropdown && industryListRef.current) {
      const highlighted = industryListRef.current.querySelector("[data-highlighted='true']");
      if (highlighted) highlighted.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex, showIndustryDropdown]);

  const selectIndustry = useCallback((value: string) => {
    update("industry", value);
    setIndustryQuery(value);
    setShowIndustryDropdown(false);
    setHighlightedIndex(0);
    industryInputRef.current?.blur();
  }, []);

  const handleIndustryKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showIndustryDropdown) {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          setShowIndustryDropdown(true);
        }
        return;
      }
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) => (prev + 1) % filteredIndustries.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) => (prev - 1 + filteredIndustries.length) % filteredIndustries.length);
          break;
        case "Enter":
          e.preventDefault();
          if (filteredIndustries.length > 0) {
            selectIndustry(filteredIndustries[highlightedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          setShowIndustryDropdown(false);
          industryInputRef.current?.blur();
          break;
        case "Tab":
          setShowIndustryDropdown(false);
          break;
      }
    },
    [showIndustryDropdown, filteredIndustries, highlightedIndex, selectIndustry],
  );
  const inputClass =
    "w-full rounded-lg border border-[#E5E7EB] bg-white px-4 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-200 hover:bg-slate-50 focus:border-[#3B82F6] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/15";

  return (
    <div className="h-screen overflow-hidden bg-[#f8fafc]">
      <div className="grid h-full grid-cols-1 xl:grid-cols-[55%_45%]">
        <main className="flex items-center justify-center overflow-y-auto">
          <div className="w-full max-w-[580px] px-8 py-12 md:px-10">
            <div className="text-left">
              <p className="text-sm font-medium text-slate-500">Step {step + 1} of {steps.length}</p>
              <div className="mt-4 flex items-center gap-1">
                {steps.map((_, i) => (
                  <div key={i} className="flex items-center">
                    <span
                      className={`h-6 w-6 rounded-full border-2 transition-all duration-300 ${
                        i <= step ? "border-[#3B82F6] bg-[#3B82F6]" : "border-[#D1D5DB] bg-white"
                      }`}
                    />
                    {i < steps.length - 1 && (
                      <span
                        className={`mx-4 h-px w-16 transition-colors duration-300 ${
                          i < step ? "bg-[#3B82F6]/70" : "bg-slate-200"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-[2.25rem] font-semibold leading-tight tracking-tight text-slate-900">{steps[step].title}</h3>
              <p className="mt-2 text-lg text-slate-500">{steps[step].desc}</p>
            </div>

            <div className="mt-10">
              {step === 0 && (
                <div className="space-y-8">
                  <div>
                    <label className="mb-2.5 block text-sm font-normal text-slate-500">Company Name</label>
                    <input
                      className="w-full rounded-lg border border-[#E5E7EB] bg-white px-4 py-4 text-[20px] text-slate-900 placeholder:text-slate-400 transition-all duration-200 hover:bg-slate-50 focus:border-[#3B82F6] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/15"
                      placeholder="Acme Inc."
                      value={form.companyName}
                      onChange={(e) => update("companyName", e.target.value)}
                    />
                  </div>

                  <div className="relative">
                    <label className="mb-2.5 block text-sm font-normal text-slate-500">Industry</label>
                    <div className="relative">
                      <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        ref={industryInputRef}
                        role="combobox"
                        aria-expanded={showIndustryDropdown}
                        aria-haspopup="listbox"
                        aria-autocomplete="list"
                        autoComplete="off"
                        className={`${inputClass} cursor-text pl-10 pr-11`}
                        placeholder="Search or select an industry"
                        value={industryQuery}
                        onClick={() => setShowIndustryDropdown(true)}
                        onFocus={() => {
                          setShowIndustryDropdown(true);
                          if (!industryQuery && form.industry) setIndustryQuery(form.industry);
                        }}
                        onChange={(e) => {
                          setIndustryQuery(e.target.value);
                          setShowIndustryDropdown(true);
                        }}
                        onBlur={() => {
                          setTimeout(() => setShowIndustryDropdown(false), 150);
                        }}
                        onKeyDown={handleIndustryKeyDown}
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setShowIndustryDropdown((prev) => !prev);
                          industryInputRef.current?.focus();
                        }}
                        className="absolute inset-y-0 right-2 flex cursor-pointer items-center px-1 text-slate-400 hover:text-slate-600"
                        aria-label="Toggle industry options"
                      >
                        <ChevronDown
                          size={16}
                          className={`transition-transform duration-200 ${showIndustryDropdown ? "rotate-180" : ""}`}
                        />
                      </button>
                    </div>
                    {showIndustryDropdown && (
                      <div
                        ref={industryListRef}
                        role="listbox"
                        className="absolute left-0 right-0 z-30 mt-1.5 max-h-[252px] overflow-auto overscroll-contain rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                      >
                        {filteredIndustries.length === 0 ? (
                          <div className="px-4 py-3 text-center text-sm text-slate-500">No industries found</div>
                        ) : (
                          filteredIndustries.map((industry, idx) => (
                            <button
                              key={industry}
                              role="option"
                              aria-selected={form.industry === industry}
                              data-highlighted={idx === highlightedIndex}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onMouseEnter={() => setHighlightedIndex(idx)}
                              onClick={() => selectIndustry(industry)}
                              className={`flex w-full cursor-pointer items-center px-4 py-2.5 text-left text-sm transition-colors ${
                                idx === highlightedIndex
                                  ? "bg-[#3B82F6]/10 text-[#3B82F6]"
                                  : "text-slate-700 hover:bg-slate-50"
                              } ${form.industry === industry ? "font-medium" : ""}`}
                            >
                              {industry}
                              {form.industry === industry && (
                                <Check size={14} className="ml-auto text-[#3B82F6]" />
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="mb-2.5 block text-sm font-normal text-slate-500">What are you building?</label>
                    <textarea
                      className={inputClass}
                      rows={6}
                      style={{ minHeight: "120px" }}
                      placeholder="We help [who] do [what] by [how]..."
                      value={form.description}
                      onChange={(e) => update("description", e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="mb-2.5 block text-sm font-normal text-slate-500">Company Website (optional)</label>
                    <input
                      className={inputClass}
                      placeholder="https://yourcompany.com"
                      value={form.website}
                      onChange={(e) => update("website", e.target.value)}
                    />
                    <p className="mt-3 text-xs text-slate-500">We&apos;ll use this to auto-fill your details</p>
                  </div>

                  {form.parsedWebsite && (
                    <div className="rounded-md bg-emerald-50/80 p-4 text-sm text-emerald-900">
                      <h4 className="mb-2 font-medium">Extracted Website Info</h4>
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

              {step === 1 && (
                <div className="space-y-8">
                  <div>
                    <label className="mb-2.5 block text-sm font-normal text-slate-500">Target Customer(s)</label>
                    <input
                      className={inputClass}
                      placeholder="Type a target customer and press Enter"
                      value={targetCustomerInput}
                      onChange={(e) => setTargetCustomerInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTargetCustomer(targetCustomerInput);
                        }
                      }}
                    />
                    <p className="mt-2 text-xs text-slate-500">Press Enter after each customer profile.</p>
                  </div>

                  <div>
                    <label className="mb-2.5 block text-sm font-normal text-slate-500">Saved Target Customers</label>
                    <div className="flex min-h-10 flex-wrap gap-2 rounded-md bg-gray-50 p-3">
                      {targetCustomerTags.length === 0 && (
                        <span className="text-xs text-slate-500">No target customers added yet.</span>
                      )}
                      {targetCustomerTags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTargetCustomer(tag)}
                            className="rounded p-0.5 text-blue-500 hover:bg-blue-100"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2.5 block text-sm font-normal text-slate-500">Location</label>
                    <select
                      className={inputClass}
                      value={form.location}
                      onChange={(e) => update("location", e.target.value)}
                    >
                      <option value="">Select a U.S. city...</option>
                      {US_CITIES.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                    {!selectedCityExists && form.location && (
                      <p className="mt-2 text-xs text-red-600">
                        Please select a valid U.S. city from the dropdown list.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <p className="text-sm text-slate-600">
                    Everything looks good. Click below and we&apos;ll create your page.
                  </p>
                  <div className="rounded-md bg-gray-50 p-4 text-sm text-slate-700">
                    <div><span className="font-medium">Company:</span> {form.companyName || "Not set"}</div>
                    <div className="mt-1"><span className="font-medium">Industry:</span> {form.industry || "Not set"}</div>
                    <div className="mt-1"><span className="font-medium">Targets:</span> {targetCustomerTags.length}</div>
                    <div className="mt-1"><span className="font-medium">City:</span> {form.location || "Not set"}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {step > 0 && (
                  <button
                    onClick={() => setStep(step - 1)}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
                  >
                    <ArrowLeft size={16} /> Back
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                {step === 0 && (
                  <button
                    onClick={handleParseWebsite}
                    disabled={parsing || !form.website}
                    className="flex h-11 min-w-[116px] items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
                  >
                    {parsing ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
                    Parse
                  </button>
                )}

                {step < steps.length - 1 ? (
                  <button
                    onClick={() => {
                      if (step === 1 && targetCustomerInput.trim()) {
                        addTargetCustomer(targetCustomerInput);
                      }
                      setStep(step + 1);
                    }}
                    disabled={!canProceed()}
                    className="flex h-12 min-w-[164px] items-center justify-center gap-1 rounded-lg bg-[#3B82F6] px-7 text-base font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-600 disabled:opacity-50"
                  >
                    Continue <ArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    onClick={handleComplete}
                    disabled={loading}
                    className="flex h-12 min-w-[164px] items-center justify-center gap-1 rounded-lg bg-[#3B82F6] px-7 text-base font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-600 disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    Create Page
                  </button>
                )}
              </div>
            </div>
          </div>
        </main>

        <aside className="relative hidden overflow-hidden xl:flex xl:items-center xl:justify-center xl:px-12 xl:py-12">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100/80" />
          <div className="absolute -top-20 right-16 h-64 w-64 rounded-full bg-blue-300/20 blur-3xl" />
          <div className="absolute -bottom-20 left-16 h-72 w-72 rounded-full bg-indigo-300/20 blur-3xl" />
          <div className="relative z-10 w-full max-w-[460px] rounded-2xl border border-white/40 bg-white/60 p-8 shadow-lg shadow-slate-200/40 backdrop-blur">
            <div className="rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-8">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/30" />
                <div className="space-y-2">
                  <div className="h-2.5 w-28 rounded bg-blue-200/40" />
                  <div className="h-2 w-20 rounded bg-slate-400/40" />
                </div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-white/10 p-3">
                  <div className="h-2 w-16 rounded bg-white/45" />
                  <div className="mt-2 h-2 w-10 rounded bg-white/30" />
                </div>
                <div className="rounded-lg bg-white/10 p-3">
                  <div className="h-2 w-14 rounded bg-white/45" />
                  <div className="mt-2 h-2 w-9 rounded bg-white/30" />
                </div>
                <div className="col-span-2 rounded-lg bg-white/10 p-4">
                  <div className="h-2 w-24 rounded bg-white/45" />
                  <div className="mt-3 h-20 rounded-md bg-white/8" />
                </div>
              </div>
            </div>
            <p className="mt-5 text-sm text-slate-600">
              Build your workspace profile and we&apos;ll tailor lead generation, targeting, and campaign setup.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
