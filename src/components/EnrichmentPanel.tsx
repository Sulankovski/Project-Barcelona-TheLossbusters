import { useState } from "react";
import { Case, EnrichmentData } from "@/data/cases";
import { Search, Globe, User, Briefcase, MapPin, Phone, Shield, AlertTriangle, ExternalLink, Loader2, Sparkles, MessageSquare } from "lucide-react";
import LeverageGraph from "./intelligence/LeverageGraph";
import IdentityAmbiguity from "./intelligence/IdentityAmbiguity";
import RecoveryEstimator from "./intelligence/RecoveryEstimator";
import NegativeSignalDetector from "./intelligence/NegativeSignalDetector";
import LifestyleGap from "./intelligence/LifestyleGap";
import DecisionEngine from "./intelligence/DecisionEngine";
import MomentumTracker from "./intelligence/MomentumTracker";
import EvidenceTree from "./intelligence/EvidenceTree";

interface Props {
  caseData: Case;
}

export default function EnrichmentPanel({ caseData }: Props) {
  const [enrichment, setEnrichment] = useState<EnrichmentData | null>(null);
  const [name, setName] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [isEnriching, setIsEnriching] = useState(false);

  const runEnrichment = async () => {
    if (!name.trim()) return;
    setIsEnriching(true);
    setEnrichment({ status: "enriching", confidence: 0, gaps: [] });

    await new Promise(r => setTimeout(r, 1500));
    setEnrichment({
      status: "complete",
      timestamp: new Date().toISOString(),
      confidence: 0.72,
      gaps: ["No social media profiles found", "Employment status unconfirmed"],
      profile: {
        estimated_employment: "Possible self-employed — business registration signals detected",
        estimated_income_bracket: "€25,000–€45,000 annual (estimated from area median)",
        social_presence: ["LinkedIn profile (limited)", "Facebook (private)"],
        possible_assets: caseData.legal_asset_finding !== "no_assets_found"
          ? ["Confirmed via legal: " + caseData.legal_asset_finding.replace(/_/g, " ")]
          : ["No legal assets found — check vehicle registries, property records"],
        contact_alternatives: ["Possible secondary phone via business listing", "Email found via domain registration"],
        location_signals: [`${caseData.country} — city-level geolocation from IP/public records`],
        business_connections: ["Registered as director of a small company (2019–present)"],
        risk_indicators: caseData.call_outcome === "denies_identity"
          ? ["Identity denial suggests awareness of debt", "Multiple contact attempts may indicate evasion"]
          : ["Standard collection resistance pattern"],
        leverage_points: generateLeveragePoints(caseData),
      },
      sources: [
        { url: "https://business-registry.example.com", type: "Business Registry", snippet: "Company registration found matching debtor name" },
        { url: "https://linkedin.com/in/example", type: "LinkedIn", snippet: "Professional profile with employment history" },
        { url: "https://property-records.example.com", type: "Property Registry", snippet: "Address cross-referenced with municipal records" },
      ],
      negotiation_strategy: generateNegotiationStrategy(caseData),
    });
    setIsEnriching(false);
  };

  return (
    <div className="space-y-3">
      {/* OSINT Input */}
      <div className="bg-surface-2 border border-amber-dim rounded-md p-4 glow-amber">
        <h3 className="text-[10px] font-mono tracking-wider text-amber mb-3 flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5" /> OSINT ENRICHMENT AGENT
        </h3>
        <p className="text-[11px] text-muted-foreground mb-3">
          Enter a name and any additional information to activate the AI enrichment agent.
        </p>
        <div className="space-y-2">
          <input
            className="w-full bg-surface-3 border border-border rounded px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
            placeholder="Full name of the debtor..."
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <textarea
            className="w-full bg-surface-3 border border-border rounded px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors resize-none h-16"
            placeholder="Additional info: phone, address, email, employer, city..."
            value={additionalInfo}
            onChange={e => setAdditionalInfo(e.target.value)}
          />
          <button
            onClick={runEnrichment}
            disabled={!name.trim() || isEnriching}
            className="w-full bg-primary text-primary-foreground font-mono text-sm font-medium py-2 rounded flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {isEnriching ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Enriching...</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Run Intelligence Scan</>
            )}
          </button>
        </div>
      </div>

      {/* Scanning animation */}
      {enrichment?.status === "enriching" && (
        <div className="bg-surface-2 border border-border rounded-md p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-mono text-amber">SCANNING PUBLIC SOURCES...</span>
          </div>
          <div className="space-y-2">
            {["Business registries", "Social media profiles", "Public records", "Domain lookups", "Identity disambiguation", "Network mapping"].map((s, i) => (
              <div key={s} className="flex items-center gap-2 text-xs font-mono text-muted-foreground animate-fade-in" style={{ animationDelay: `${i * 0.25}s` }}>
                <Loader2 className="w-3 h-3 animate-spin text-amber" />
                {s}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full Intelligence Suite */}
      {enrichment?.status === "complete" && enrichment.profile && (
        <div className="space-y-3 animate-fade-in">
          {/* Decision Engine — top priority */}
          <DecisionEngine caseData={caseData} />

          {/* Recovery Estimator */}
          <RecoveryEstimator caseData={caseData} />

          {/* Leverage Network Graph */}
          <LeverageGraph caseData={caseData} name={name} />

          {/* Identity Ambiguity */}
          <IdentityAmbiguity caseData={caseData} name={name} />

          {/* Confidence */}
          <div className="bg-surface-2 border border-border rounded-md p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono tracking-wider text-muted-foreground">OVERALL CONFIDENCE</span>
              <span className="text-xs font-mono text-amber font-bold">{(enrichment.confidence * 100).toFixed(0)}%</span>
            </div>
            <div className="w-full h-1.5 bg-surface-3 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${enrichment.confidence * 100}%` }} />
            </div>
          </div>

          {/* Profile Sections */}
          <ProfileSection icon={Briefcase} title="EMPLOYMENT" items={[enrichment.profile.estimated_employment ?? "Unknown"]} />
          <ProfileSection icon={Globe} title="SOCIAL PRESENCE" items={enrichment.profile.social_presence ?? []} />
          <ProfileSection icon={Shield} title="POSSIBLE ASSETS" items={enrichment.profile.possible_assets ?? []} />
          <ProfileSection icon={Phone} title="ALTERNATIVE CONTACTS" items={enrichment.profile.contact_alternatives ?? []} />
          <ProfileSection icon={MapPin} title="LOCATION SIGNALS" items={enrichment.profile.location_signals ?? []} />
          <ProfileSection icon={User} title="BUSINESS CONNECTIONS" items={enrichment.profile.business_connections ?? []} />
          <ProfileSection icon={AlertTriangle} title="RISK INDICATORS" items={enrichment.profile.risk_indicators ?? []} color="text-red" />
          <ProfileSection icon={Sparkles} title="LEVERAGE POINTS" items={enrichment.profile.leverage_points ?? []} color="text-green" />

          {/* Evidence Tree */}
          <EvidenceTree caseData={caseData} name={name} />

          {/* Lifestyle Gap */}
          <LifestyleGap caseData={caseData} />

          {/* Negative Signal Detector */}
          <NegativeSignalDetector caseData={caseData} />

          {/* Sources */}
          {enrichment.sources && enrichment.sources.length > 0 && (
            <div className="bg-surface-2 border border-border rounded-md p-3">
              <h4 className="text-[10px] font-mono tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                <ExternalLink className="w-3 h-3" /> SOURCES
              </h4>
              {enrichment.sources.map((s, i) => (
                <div key={i} className="flex items-start gap-2 py-1.5 border-t border-border first:border-0">
                  <span className="text-[9px] font-mono text-amber bg-surface-3 px-1.5 py-0.5 rounded">{s.type}</span>
                  <span className="text-[11px] text-muted-foreground flex-1">{s.snippet}</span>
                </div>
              ))}
            </div>
          )}

          {/* Gaps */}
          {enrichment.gaps.length > 0 && (
            <div className="bg-surface-2 border border-red-dim rounded-md p-3">
              <h4 className="text-[10px] font-mono tracking-wider text-red mb-2">⚠ INTELLIGENCE GAPS</h4>
              {enrichment.gaps.map((g, i) => (
                <div key={i} className="text-[11px] text-muted-foreground py-0.5">• {g}</div>
              ))}
            </div>
          )}

          {/* Negotiation Strategy */}
          {enrichment.negotiation_strategy && (
            <div className="bg-surface-2 border border-green-dim rounded-md p-4 glow-green">
              <h4 className="text-[10px] font-mono tracking-wider text-green mb-2 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" /> RECOMMENDED NEGOTIATION APPROACH
              </h4>
              <p className="text-xs text-foreground leading-relaxed whitespace-pre-line">{enrichment.negotiation_strategy}</p>
            </div>
          )}

          {/* Momentum Tracker — shows value created */}
          <MomentumTracker caseData={caseData} />
        </div>
      )}
    </div>
  );
}

function ProfileSection({ icon: Icon, title, items, color = "text-foreground" }: { icon: any; title: string; items: string[]; color?: string }) {
  if (!items.length) return null;
  return (
    <div className="bg-surface-2 border border-border rounded-md p-3">
      <h4 className="text-[10px] font-mono tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
        <Icon className="w-3 h-3" /> {title}
      </h4>
      {items.map((item, i) => (
        <div key={i} className={`text-[11px] ${color} py-0.5`}>• {item}</div>
      ))}
    </div>
  );
}

function generateLeveragePoints(c: Case): string[] {
  const points: string[] = [];
  if (c.legal_asset_finding === "employment_income") points.push("Employment income confirmed — wage garnishment is a viable enforcement path");
  if (c.legal_asset_finding === "bank_account") points.push("Bank account identified — account seizure possible via court order");
  if (c.legal_asset_finding === "vehicle") points.push("Vehicle registered — can be used as collateral or seized");
  if (c.debt_eur > 20000) points.push("High debt amount increases debtor's motivation to negotiate vs face legal action");
  if (c.call_outcome === "wont_pay") points.push("Refusal to pay combined with asset evidence strengthens legal position");
  if (c.call_outcome === "denies_identity") points.push("Identity denial + public records match creates strong confrontation leverage");
  if (c.debt_origin === "sme_loan") points.push("Business loan — company reputation and ongoing operations create settlement incentive");
  if (points.length === 0) points.push("Limited leverage — focus on contact discovery and asset identification");
  return points;
}

function generateNegotiationStrategy(c: Case): string {
  const lines: string[] = [];

  if (c.call_outcome === "denies_identity") {
    lines.push("APPROACH: Identity Confrontation");
    lines.push("Open with verifiable facts from public records. Present business registration and social media presence. Use: 'Our records indicate you are registered as director of [company]. We have confirmed your address at [location].'");
    lines.push("\nThis shifts the conversation from 'who are you?' to 'what arrangement can we reach?'");
  } else if (c.call_outcome === "wont_pay") {
    lines.push("APPROACH: Escalation Preview");
    lines.push("Present evidence of seizable assets. Outline legal timeline and costs to debtor. Offer settlement at 60-70% as a 'final opportunity before legal proceedings.'");
  } else if (["rings_out", "invalid_number", "voicemail"].includes(c.call_outcome)) {
    lines.push("APPROACH: Multi-Channel Contact");
    lines.push("Use discovered alternative contacts — business phone, email, or LinkedIn. If employer is identified, consider formal notice via employer (where legally permitted).");
    lines.push("\nSend formal notice to confirmed address with 14-day deadline before escalation.");
  } else {
    lines.push("APPROACH: Standard Settlement");
    lines.push("Engage with understanding of debtor's financial situation based on enrichment data. Propose structured payment plan aligned with estimated income bracket.");
  }

  if (c.debt_eur > 30000) {
    lines.push("\n💡 HIGH-VALUE: Consider assigning dedicated collector. ROI justifies intensive approach.");
  }

  return lines.join("\n");
}
