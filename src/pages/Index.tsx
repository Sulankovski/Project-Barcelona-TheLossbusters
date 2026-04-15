import { useState } from "react";
import { Radar, Shield, Search, Target, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import EnrichmentResults from "@/components/EnrichmentResults";
import LinkedInBotResults from "@/components/LinkedInBotResults";
import { normalizeEnrichmentResult } from "@/lib/enrichment";

const LINKEDIN_BOT_URL = "http://localhost:3001";

export default function Index() {
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanStage, setScanStage] = useState(0);

  // LinkedIn bot state
  const [isLinkedInRunning, setIsLinkedInRunning] = useState(false);
  const [linkedInResult, setLinkedInResult] = useState<any>(null);
  const [linkedInError, setLinkedInError] = useState<string | null>(null);

  const scanStages = [
    "Initializing intelligence agent...",
    "Searching business registries...",
    "Scanning social media profiles...",
    "Cross-referencing public records...",
    "Analyzing domain registrations...",
    "Mapping business connections...",
    "Evaluating identity matches...",
    "Building leverage network...",
    "Generating negotiation strategy...",
    "Compiling intelligence report...",
  ];

  const runLinkedInBot = async () => {
    if (!name.trim()) return;
    setIsLinkedInRunning(true);
    setLinkedInError(null);
    setLinkedInResult(null);

    try {
      const res = await fetch(`${LINKEDIN_BOT_URL}/api/linkedin-bot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          country: country.trim() || undefined,
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
          additionalInfo: additionalInfo.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "LinkedIn bot failed");
      }

      setLinkedInResult(json.data);
    } catch (err: any) {
      console.error("LinkedIn bot error:", err);
      setLinkedInError(
        err.message === "Failed to fetch"
          ? "Cannot reach LinkedIn Bot server. Run: cd server && npm install && node index.js"
          : err.message ?? "LinkedIn bot failed"
      );
    } finally {
      setIsLinkedInRunning(false);
    }
  };

  const runSearch = async () => {
    if (!name.trim()) return;
    setIsSearching(true);
    setError(null);
    setResult(null);
    setScanStage(0);

    const interval = setInterval(() => {
      setScanStage(prev => (prev >= scanStages.length - 1 ? prev : prev + 1));
    }, 1200);

    try {
      const extraInfo = [
        phone && `Phone: ${phone}`,
        address && `Address: ${address}`,
        additionalInfo,
      ].filter(Boolean).join("\n");

      const request = supabase.functions.invoke('enrich-debtor', {
        body: {
          name: name.trim(),
          country: country || undefined,
          additionalInfo: extraInfo || undefined,
        },
      });

      const timeoutMs = 45000;
      const timeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Scan timed out after 45s. Check network or Supabase function status.')), timeoutMs);
      });

      const { data, error: fnError } = await Promise.race([request, timeout]);

      if (fnError) throw new Error(fnError.message || 'Search failed');
      if (!data?.success) throw new Error(data?.error || 'Unknown error');
      if (!data?.data || typeof data.data !== 'object') {
        throw new Error('Scan returned no usable results');
      }

      setResult(normalizeEnrichmentResult(data.data));
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message || 'Failed to run search');
    } finally {
      clearInterval(interval);
      setIsSearching(false);
    }
  };

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

      {/* Main */}
      <main className="max-w-[900px] mx-auto px-4 py-6 space-y-4">
        {/* Search Panel */}
        <div className="bg-surface-2 border border-amber-dim rounded-md p-5 glow-amber">
          <h3 className="text-[10px] font-mono tracking-wider text-amber mb-3 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5" /> INTELLIGENCE SEARCH
          </h3>
          <p className="text-[11px] text-muted-foreground mb-4">
            Enter a name and any available info. The AI agent will search public sources and return actionable intelligence.
          </p>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                className="w-full bg-surface-3 border border-border rounded px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
                placeholder="Full name *"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && runSearch()}
              />
              <input
                className="w-full bg-surface-3 border border-border rounded px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
                placeholder="Country"
                value={country}
                onChange={e => setCountry(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                className="w-full bg-surface-3 border border-border rounded px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
                placeholder="Phone number"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
              <input
                className="w-full bg-surface-3 border border-border rounded px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
                placeholder="Address"
                value={address}
                onChange={e => setAddress(e.target.value)}
              />
            </div>
            <textarea
              className="w-full bg-surface-3 border border-border rounded px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors resize-none h-16"
              placeholder="Additional info: email, employer, any known details..."
              value={additionalInfo}
              onChange={e => setAdditionalInfo(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={runSearch}
                disabled={!name.trim() || isSearching}
                className="w-full bg-primary text-primary-foreground font-mono text-sm font-medium py-3 rounded flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                {isSearching ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Scanning...</>
                ) : (
                  <><Target className="w-4 h-4" /> Launch AI Intelligence Agent</>
                )}
              </button>
              <button
                onClick={runLinkedInBot}
                disabled={!name.trim() || isLinkedInRunning}
                className="w-full bg-blue-600 text-white font-mono text-sm font-medium py-3 rounded flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                {isLinkedInRunning ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Bot Running...</>
                ) : (
                  <><ExternalLink className="w-4 h-4" /> Use LinkedIn Bot</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Scanning animation */}
        {isSearching && (
          <div className="bg-surface-2 border border-border rounded-md p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-mono text-amber">AI AGENT ACTIVE — SCANNING PUBLIC SOURCES...</span>
            </div>
            <div className="space-y-2">
              {scanStages.map((stage, i) => (
                <div
                  key={stage}
                  className={`flex items-center gap-2 text-xs font-mono transition-all duration-300 ${
                    i <= scanStage ? 'text-foreground' : 'text-muted-foreground/30'
                  }`}
                >
                  {i < scanStage ? (
                    <span className="text-green w-3 h-3 flex items-center justify-center">✓</span>
                  ) : i === scanStage ? (
                    <Loader2 className="w-3 h-3 animate-spin text-amber" />
                  ) : (
                    <span className="w-3 h-3 flex items-center justify-center text-muted-foreground/30">○</span>
                  )}
                  {stage}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-surface-2 border border-red-dim rounded-md p-3">
            <p className="text-xs font-mono text-red">⚠ {error}</p>
          </div>
        )}

        {/* LinkedIn Bot loading */}
        {isLinkedInRunning && (
          <div className="bg-surface-2 border border-blue-500/30 rounded-md p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-xs font-mono text-blue-400">LINKEDIN BOT ACTIVE — BROWSER AGENT RUNNING...</span>
            </div>
            <p className="text-[11px] font-mono text-muted-foreground">
              A browser window has opened. The agent is navigating LinkedIn to find <span className="text-foreground">{name}</span>. This may take 30–60 seconds.
            </p>
          </div>
        )}

        {/* LinkedIn Bot error */}
        {linkedInError && (
          <div className="bg-surface-2 border border-blue-500/20 rounded-md p-3">
            <p className="text-xs font-mono text-blue-400">⚠ LinkedIn Bot: {linkedInError}</p>
          </div>
        )}

        {/* LinkedIn Bot results */}
        {linkedInResult && <LinkedInBotResults data={linkedInResult} />}

        {/* Results */}
        {result && (
          <EnrichmentResults result={result} caseData={{} as any} name={name} />
        )}
      </main>
    </div>
  );
}
