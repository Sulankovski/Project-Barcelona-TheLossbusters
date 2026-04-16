import { useState, useRef } from "react";
import { Radar, Shield, Search, Loader2, ExternalLink, Zap, ChevronDown, ChevronUp, CheckCircle, Circle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import EnrichmentResults from "@/components/EnrichmentResults";
import LinkedInBotResults from "@/components/LinkedInBotResults";
import FacebookBotResults from "@/components/FacebookBotResults";
import SuperVexorSummary from "@/components/SuperVexorSummary";
import { normalizeEnrichmentResult } from "@/lib/enrichment";

const BOT_URL = "http://localhost:3001";

// ── SuperVexor progress phases ────────────────────────────────────────────────
type Phase = "idle" | "linkedin_login" | "linkedin_done" | "linkedin_error"
           | "facebook_login" | "facebook_done" | "facebook_error"
           | "analysis" | "complete" | "error";

interface ProgressMsg { phase: string; stage: string; message: string }

function phaseIcon(status: "pending" | "active" | "done" | "error") {
  if (status === "done")    return <CheckCircle className="w-4 h-4 text-green-400" />;
  if (status === "error")   return <AlertCircle className="w-4 h-4 text-red-400" />;
  if (status === "active")  return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
  return <Circle className="w-4 h-4 text-muted-foreground/30" />;
}

export default function Index() {
  // Form
  const [name, setName]                   = useState("");
  const [country, setCountry]             = useState("");
  const [phone, setPhone]                 = useState("");
  const [address, setAddress]             = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");

  // Legacy AI scan
  const [isSearching, setIsSearching]     = useState(false);
  const [result, setResult]               = useState<any>(null);
  const [error, setError]                 = useState<string | null>(null);
  const [scanStage, setScanStage]         = useState(0);

  // Standalone bots
  const [isLinkedInRunning, setIsLinkedInRunning] = useState(false);
  const [linkedInResult, setLinkedInResult]       = useState<any>(null);
  const [linkedInError, setLinkedInError]         = useState<string | null>(null);

  const [isFacebookRunning, setIsFacebookRunning] = useState(false);
  const [facebookResult, setFacebookResult]       = useState<any>(null);
  const [facebookError, setFacebookError]         = useState<string | null>(null);

  // SuperVexor
  const [svRunning, setSvRunning]           = useState(false);
  const [svPhase, setSvPhase]               = useState<Phase>("idle");
  const [svMessages, setSvMessages]         = useState<ProgressMsg[]>([]);
  const [svLinkedIn, setSvLinkedIn]         = useState<any>(null);
  const [svFacebook, setSvFacebook]         = useState<any>(null);
  const [svSummary, setSvSummary]           = useState<any>(null);
  const [svError, setSvError]               = useState<string | null>(null);
  const [showSvLinkedIn, setShowSvLinkedIn] = useState(false);
  const [showSvFacebook, setShowSvFacebook] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  const scanStages = [
    "Initializing intelligence agent...", "Searching business registries...",
    "Scanning social media profiles...", "Cross-referencing public records...",
    "Analyzing domain registrations...", "Mapping business connections...",
    "Evaluating identity matches...", "Building leverage network...",
    "Generating negotiation strategy...", "Compiling intelligence report...",
  ];

  // ── SuperVexor ──────────────────────────────────────────────────────────────
  const runSuperVexor = () => {
    if (!name.trim() || svRunning) return;

    // Reset state
    setSvRunning(true);
    setSvPhase("linkedin_login");
    setSvMessages([]);
    setSvLinkedIn(null);
    setSvFacebook(null);
    setSvSummary(null);
    setSvError(null);
    setShowSvLinkedIn(false);
    setShowSvFacebook(false);

    const params = new URLSearchParams({ name: name.trim() });
    if (country.trim())      params.set("country", country.trim());
    if (phone.trim())        params.set("phone", phone.trim());
    if (address.trim())      params.set("address", address.trim());
    if (additionalInfo.trim()) params.set("additionalInfo", additionalInfo.trim());

    const es = new EventSource(`${BOT_URL}/api/supervexor?${params}`);
    esRef.current = es;

    es.addEventListener("progress", (e) => {
      const msg: ProgressMsg = JSON.parse(e.data);
      setSvMessages(prev => [...prev, msg]);
      if (msg.phase === "linkedin") {
        setSvPhase(msg.stage === "done" ? "linkedin_done" : msg.stage === "error" ? "linkedin_error" : "linkedin_login");
      } else if (msg.phase === "facebook") {
        setSvPhase(msg.stage === "done" ? "facebook_done" : msg.stage === "error" ? "facebook_error" : "facebook_login");
      } else if (msg.phase === "analysis") {
        setSvPhase("analysis");
      }
    });

    es.addEventListener("linkedin_done", (e) => {
      const { data } = JSON.parse(e.data);
      setSvLinkedIn(data);
      setSvPhase("linkedin_done");
    });

    es.addEventListener("facebook_done", (e) => {
      const { data } = JSON.parse(e.data);
      setSvFacebook(data);
      setSvPhase("facebook_done");
    });

    es.addEventListener("complete", (e) => {
      const { summary } = JSON.parse(e.data);
      setSvSummary(summary);
      setSvPhase("complete");
      setSvRunning(false);
      es.close();
    });

    es.addEventListener("error", (e: MessageEvent) => {
      if (e.data) {
        const { message } = JSON.parse(e.data);
        setSvError(message);
      }
      setSvPhase("error");
      setSvRunning(false);
      es.close();
    });

    es.onerror = () => {
      // Only treat as error if we haven't completed
      setSvRunning(prev => {
        if (prev) setSvError("Connection to bot server lost.");
        return false;
      });
      es.close();
    };
  };

  // ── Standalone LinkedIn bot ─────────────────────────────────────────────────
  const runLinkedInBot = async () => {
    if (!name.trim()) return;
    setIsLinkedInRunning(true);
    setLinkedInError(null);
    setLinkedInResult(null);
    try {
      const res = await fetch(`${BOT_URL}/api/linkedin-bot`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), country: country.trim() || undefined,
          phone: phone.trim() || undefined, address: address.trim() || undefined,
          additionalInfo: additionalInfo.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "LinkedIn bot failed");
      setLinkedInResult(json.data);
    } catch (err: any) {
      setLinkedInError(err.message === "Failed to fetch"
        ? "Cannot reach bot server. Run: cd server && node index.js"
        : err.message ?? "LinkedIn bot failed");
    } finally { setIsLinkedInRunning(false); }
  };

  // ── Standalone Facebook bot ─────────────────────────────────────────────────
  const runFacebookBot = async () => {
    if (!name.trim()) return;
    setIsFacebookRunning(true);
    setFacebookError(null);
    setFacebookResult(null);
    try {
      const res = await fetch(`${BOT_URL}/api/facebook-bot`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), country: country.trim() || undefined,
          phone: phone.trim() || undefined, address: address.trim() || undefined,
          additionalInfo: additionalInfo.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Facebook bot failed");
      setFacebookResult(json.data);
    } catch (err: any) {
      setFacebookError(err.message === "Failed to fetch"
        ? "Cannot reach bot server. Run: cd server && node index.js"
        : err.message ?? "Facebook bot failed");
    } finally { setIsFacebookRunning(false); }
  };

  // ── Legacy AI scan ──────────────────────────────────────────────────────────
  const runSearch = async () => {
    if (!name.trim()) return;
    setIsSearching(true); setError(null); setResult(null); setScanStage(0);
    const interval = setInterval(() => setScanStage(prev => prev >= scanStages.length - 1 ? prev : prev + 1), 1200);
    try {
      const extraInfo = [phone && `Phone: ${phone}`, address && `Address: ${address}`, additionalInfo].filter(Boolean).join("\n");
      const request = supabase.functions.invoke("enrich-debtor", {
        body: { name: name.trim(), country: country || undefined, additionalInfo: extraInfo || undefined },
      });
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Scan timed out after 45s.")), 45000));
      const { data, error: fnError } = await Promise.race([request, timeout]);
      if (fnError) throw new Error(fnError.message || "Search failed");
      if (!data?.success) throw new Error(data?.error || "Unknown error");
      if (!data?.data || typeof data.data !== "object") throw new Error("Scan returned no usable results");
      setResult(normalizeEnrichmentResult(data.data));
    } catch (err: any) {
      setError(err.message || "Failed to run search");
    } finally { clearInterval(interval); setIsSearching(false); }
  };

  // ── SuperVexor phase helpers ────────────────────────────────────────────────
  // Both LinkedIn and Facebook run in parallel — track by data presence, not phase sequence
  const liStatus = svLinkedIn ? "done"
    : svPhase === "linkedin_error" ? "error"
    : svRunning ? "active" : "pending";

  const fbStatus = svFacebook ? "done"
    : svPhase === "facebook_error" ? "error"
    : svRunning ? "active" : "pending";

  const anStatus = svPhase === "analysis" ? "active"
    : svPhase === "complete" ? "done"
    : svPhase === "error" ? "error" : "pending";

  const lastMsg = svMessages[svMessages.length - 1]?.message ?? "";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-surface-1">
        <div className="max-w-[900px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
              <Radar className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-mono font-bold text-foreground text-sm tracking-tight flex items-center gap-2">
                VEXOR <span className="text-primary">INTELLIGENCE</span>
              </h1>
              <p className="text-[9px] font-mono text-muted-foreground tracking-widest">AI OSINT AGENT</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span className="text-[10px] font-mono text-accent">ONLINE</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[10px] font-mono text-muted-foreground">AGENT READY</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[900px] mx-auto px-4 py-6 space-y-4">

        {/* Search Panel */}
        <div className="bg-surface-2 border border-amber-dim rounded-md p-5 glow-amber">
          <h3 className="text-[10px] font-mono tracking-wider text-amber mb-3 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5" /> INTELLIGENCE SEARCH
          </h3>
          <p className="text-[11px] text-muted-foreground mb-4">
            Enter a name and any available info. Run SuperVexor to launch the full multi-platform investigation.
          </p>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input className="w-full bg-surface-3 border border-border rounded px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
                placeholder="Full name *" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && runSearch()} />
              <input className="w-full bg-surface-3 border border-border rounded px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
                placeholder="Country" value={country} onChange={e => setCountry(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input className="w-full bg-surface-3 border border-border rounded px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
                placeholder="Phone number" value={phone} onChange={e => setPhone(e.target.value)} />
              <input className="w-full bg-surface-3 border border-border rounded px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
                placeholder="Address" value={address} onChange={e => setAddress(e.target.value)} />
            </div>
            <textarea className="w-full bg-surface-3 border border-border rounded px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors resize-none h-16"
              placeholder="Additional info: email, employer, any known details..."
              value={additionalInfo} onChange={e => setAdditionalInfo(e.target.value)} />

            {/* SuperVexor — primary button */}
            <button
              onClick={runSuperVexor}
              disabled={!name.trim() || svRunning}
              className="w-full bg-primary text-primary-foreground font-mono text-sm font-bold py-3 rounded flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {svRunning ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> SuperVexor Running...</>
              ) : (
                <><Zap className="w-4 h-4" /> Run SuperVexor</>
              )}
            </button>

            {/* Secondary bots */}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={runLinkedInBot} disabled={!name.trim() || isLinkedInRunning}
                className="w-full bg-blue-600 text-white font-mono text-xs font-medium py-2 rounded flex items-center justify-center gap-1.5 disabled:opacity-50 hover:opacity-90 transition-opacity">
                {isLinkedInRunning ? <><Loader2 className="w-3 h-3 animate-spin" /> Running...</> : <><ExternalLink className="w-3 h-3" /> LinkedIn Bot</>}
              </button>
              <button onClick={runFacebookBot} disabled={!name.trim() || isFacebookRunning}
                className="w-full bg-blue-800 text-white font-mono text-xs font-medium py-2 rounded flex items-center justify-center gap-1.5 disabled:opacity-50 hover:opacity-90 transition-opacity">
                {isFacebookRunning ? <><Loader2 className="w-3 h-3 animate-spin" /> Running...</> : <><ExternalLink className="w-3 h-3" /> Facebook Bot</>}
              </button>
            </div>
          </div>
        </div>

        {/* ── SuperVexor progress + results ── */}
        {(svRunning || svPhase !== "idle") && (
          <div className="space-y-3">

            {/* Phase tracker */}
            <div className="bg-surface-2 border border-primary/20 rounded-md p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] font-mono tracking-widest text-primary">SUPERVEXOR — ACTIVE INVESTIGATION</span>
              </div>
              <div className="space-y-3">
                {/* Phase 1 */}
                <div className="flex items-start gap-3">
                  {phaseIcon(liStatus)}
                  <div>
                    <p className={`text-xs font-mono font-medium ${liStatus === "active" ? "text-foreground" : liStatus === "done" ? "text-green-400" : liStatus === "error" ? "text-red-400" : "text-muted-foreground/40"}`}>
                      Phase 1 — LinkedIn Research
                    </p>
                    {svLinkedIn && (
                      <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                        {svLinkedIn.profiles?.length ?? 0} profiles found
                      </p>
                    )}
                  </div>
                </div>
                {/* Phase 2 */}
                <div className="flex items-start gap-3">
                  {phaseIcon(fbStatus)}
                  <div>
                    <p className={`text-xs font-mono font-medium ${fbStatus === "active" ? "text-foreground" : fbStatus === "done" ? "text-green-400" : fbStatus === "error" ? "text-red-400" : "text-muted-foreground/40"}`}>
                      Phase 2 — Facebook Research
                    </p>
                    {svFacebook && (
                      <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                        {svFacebook.profiles?.length ?? 0} profiles found
                      </p>
                    )}
                  </div>
                </div>
                {/* Phase 3 */}
                <div className="flex items-start gap-3">
                  {phaseIcon(anStatus)}
                  <div>
                    <p className={`text-xs font-mono font-medium ${anStatus === "active" ? "text-foreground" : anStatus === "done" ? "text-green-400" : anStatus === "error" ? "text-red-400" : "text-muted-foreground/40"}`}>
                      Phase 3 — Master Analysis
                    </p>
                  </div>
                </div>
              </div>
              {/* Live message */}
              {lastMsg && svRunning && (
                <p className="text-[10px] font-mono text-muted-foreground mt-3 border-t border-border pt-2">{lastMsg}</p>
              )}
            </div>

            {/* LinkedIn results (collapsible) */}
            {svLinkedIn && (
              <div className="bg-surface-2 border border-blue-500/20 rounded-md overflow-hidden">
                <button
                  onClick={() => setShowSvLinkedIn(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-3 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[10px] font-mono tracking-wider text-blue-400">LINKEDIN RESULTS</span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      — {svLinkedIn.profiles?.length ?? 0} profiles
                    </span>
                  </div>
                  {showSvLinkedIn ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                </button>
                {showSvLinkedIn && (
                  <div className="border-t border-border p-4">
                    <LinkedInBotResults data={svLinkedIn} />
                  </div>
                )}
              </div>
            )}

            {/* Facebook results (collapsible) */}
            {svFacebook && (
              <div className="bg-surface-2 border border-blue-700/20 rounded-md overflow-hidden">
                <button
                  onClick={() => setShowSvFacebook(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-3 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded bg-blue-700 flex items-center justify-center">
                      <span className="text-white text-[8px] font-bold leading-none">f</span>
                    </div>
                    <span className="text-[10px] font-mono tracking-wider text-blue-400">FACEBOOK RESULTS</span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      — {svFacebook.profiles?.length ?? 0} profiles
                    </span>
                  </div>
                  {showSvFacebook ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                </button>
                {showSvFacebook && (
                  <div className="border-t border-border p-4">
                    <FacebookBotResults data={svFacebook} />
                  </div>
                )}
              </div>
            )}

            {/* Master summary */}
            {svSummary && <SuperVexorSummary data={svSummary} />}

            {/* SuperVexor error */}
            {svError && (
              <div className="bg-surface-2 border border-red-500/20 rounded-md p-3">
                <p className="text-xs font-mono text-red-400">⚠ SuperVexor: {svError}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Legacy AI scan ── */}
        {isSearching && (
          <div className="bg-surface-2 border border-border rounded-md p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-mono text-amber">AI AGENT ACTIVE — SCANNING PUBLIC SOURCES...</span>
            </div>
            <div className="space-y-2">
              {scanStages.map((stage, i) => (
                <div key={stage} className={`flex items-center gap-2 text-xs font-mono transition-all duration-300 ${i <= scanStage ? "text-foreground" : "text-muted-foreground/30"}`}>
                  {i < scanStage ? <span className="text-green w-3 h-3 flex items-center justify-center">✓</span>
                    : i === scanStage ? <Loader2 className="w-3 h-3 animate-spin text-amber" />
                    : <span className="w-3 h-3 flex items-center justify-center text-muted-foreground/30">○</span>}
                  {stage}
                </div>
              ))}
            </div>
          </div>
        )}
        {error && <div className="bg-surface-2 border border-red-dim rounded-md p-3"><p className="text-xs font-mono text-red">⚠ {error}</p></div>}
        {result && <EnrichmentResults result={result} caseData={{} as any} name={name} />}

        {/* ── Standalone bot results ── */}
        {isLinkedInRunning && (
          <div className="bg-surface-2 border border-blue-500/30 rounded-md p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-xs font-mono text-blue-400">LINKEDIN BOT ACTIVE...</span>
            </div>
            <p className="text-[11px] font-mono text-muted-foreground">Searching LinkedIn for <span className="text-foreground">{name}</span>.</p>
          </div>
        )}
        {linkedInError && <div className="bg-surface-2 border border-blue-500/20 rounded-md p-3"><p className="text-xs font-mono text-blue-400">⚠ LinkedIn: {linkedInError}</p></div>}
        {linkedInResult && <LinkedInBotResults data={linkedInResult} />}

        {isFacebookRunning && (
          <div className="bg-surface-2 border border-blue-800/40 rounded-md p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-xs font-mono text-blue-400">FACEBOOK BOT ACTIVE...</span>
            </div>
            <p className="text-[11px] font-mono text-muted-foreground">Searching Facebook for <span className="text-foreground">{name}</span>.</p>
          </div>
        )}
        {facebookError && <div className="bg-surface-2 border border-blue-800/30 rounded-md p-3"><p className="text-xs font-mono text-blue-400">⚠ Facebook: {facebookError}</p></div>}
        {facebookResult && <FacebookBotResults data={facebookResult} />}

      </main>
    </div>
  );
}
