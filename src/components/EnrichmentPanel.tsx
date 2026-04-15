import { useState } from "react";
import { Case, EnrichmentData } from "@/data/cases";
import { Search, Globe, User, Briefcase, MapPin, Phone, Shield, AlertTriangle, ExternalLink, Loader2, Sparkles, MessageSquare, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { normalizeEnrichmentResult } from "@/lib/enrichment";
import LeverageGraph from "./intelligence/LeverageGraph";
import IdentityAmbiguity from "./intelligence/IdentityAmbiguity";
import RecoveryEstimator from "./intelligence/RecoveryEstimator";
import NegativeSignalDetector from "./intelligence/NegativeSignalDetector";
import LifestyleGap from "./intelligence/LifestyleGap";
import DecisionEngine from "./intelligence/DecisionEngine";
import MomentumTracker from "./intelligence/MomentumTracker";
import EvidenceTree from "./intelligence/EvidenceTree";
import EnrichmentResults from "./EnrichmentResults";

interface Props {
  caseData: Case;
}

export default function EnrichmentPanel({ caseData }: Props) {
  const [name, setName] = useState("");
  const [country, setCountry] = useState(caseData.country || "");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [isEnriching, setIsEnriching] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanStage, setScanStage] = useState(0);

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

  const runEnrichment = async () => {
    if (!name.trim()) return;
    setIsEnriching(true);
    setError(null);
    setAiResult(null);
    setScanStage(0);

    // Animate scan stages
    const interval = setInterval(() => {
      setScanStage(prev => {
        if (prev >= scanStages.length - 1) return prev;
        return prev + 1;
      });
    }, 1200);

    try {
      // Build additional info from all fields
      const extraInfo = [
        phone && `Phone: ${phone}`,
        address && `Address: ${address}`,
        additionalInfo,
      ].filter(Boolean).join("\n");

      const request = supabase.functions.invoke('enrich-debtor', {
        body: {
          name: name.trim(),
          country: country || caseData.country,
          additionalInfo: extraInfo || undefined,
          caseContext: {
            debt_eur: caseData.debt_eur,
            debt_origin: caseData.debt_origin,
            call_outcome: caseData.call_outcome,
            legal_asset_finding: caseData.legal_asset_finding,
            debt_age_months: caseData.debt_age_months,
          },
        },
      });

      const timeoutMs = 45000;
      const timeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Scan timed out after 45s. Check network or Supabase function status.')), timeoutMs);
      });

      const { data, error: fnError } = await Promise.race([request, timeout]);

      if (fnError) throw new Error(fnError.message || 'Enrichment failed');
      if (!data?.success) throw new Error(data?.error || 'Unknown error');

      setAiResult(normalizeEnrichmentResult(data.data));
    } catch (err: any) {
      console.error('Enrichment error:', err);
      setError(err.message || 'Failed to run enrichment');
    } finally {
      clearInterval(interval);
      setIsEnriching(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* OSINT Input */}
      <div className="bg-surface-2 border border-amber-dim rounded-md p-4 glow-amber">
        <h3 className="text-[10px] font-mono tracking-wider text-amber mb-3 flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5" /> AI OSINT ENRICHMENT AGENT
        </h3>
        <p className="text-[11px] text-muted-foreground mb-3">
          Enter minimal starting info — name, country, phone, address — the AI agent will research and return actionable intelligence.
        </p>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              className="w-full bg-surface-3 border border-border rounded px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
              placeholder="Full name *"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <input
              className="w-full bg-surface-3 border border-border rounded px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
              placeholder="Country"
              value={country}
              onChange={e => setCountry(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              className="w-full bg-surface-3 border border-border rounded px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
              placeholder="Phone number"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
            <input
              className="w-full bg-surface-3 border border-border rounded px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
              placeholder="Address"
              value={address}
              onChange={e => setAddress(e.target.value)}
            />
          </div>
          <textarea
            className="w-full bg-surface-3 border border-border rounded px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors resize-none h-16"
            placeholder="Additional info: email, employer, any known details..."
            value={additionalInfo}
            onChange={e => setAdditionalInfo(e.target.value)}
          />
          <button
            onClick={runEnrichment}
            disabled={!name.trim() || isEnriching}
            className="w-full bg-primary text-primary-foreground font-mono text-sm font-medium py-2.5 rounded flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {isEnriching ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Running Intelligence Scan...</>
            ) : (
              <><Target className="w-4 h-4" /> Launch AI Intelligence Agent</>
            )}
          </button>
        </div>
      </div>

      {/* Scanning animation */}
      {isEnriching && (
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

      {/* AI Results */}
      {aiResult && (
        <EnrichmentResults result={aiResult} caseData={caseData} name={name} />
      )}
    </div>
  );
}
