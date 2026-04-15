import { Case, formatEur } from "@/data/cases";
import { Crosshair, ArrowRight } from "lucide-react";

type Decision = "PRIORITIZE_CONTACT" | "ESCALATE_LEGAL" | "DEPRIORITIZE" | "PASSIVE_MONITOR" | "ALTERNATIVE_CHANNELS";

interface DecisionResult {
  decision: Decision;
  label: string;
  color: string;
  why: string[];
  alternative: string;
}

function decide(c: Case): DecisionResult {
  const hasAssets = !["no_assets_found", "not_initiated", "assets_not_seizable"].includes(c.legal_asset_finding);
  const hasContact = !["invalid_number", "rings_out"].includes(c.call_outcome);
  const isHigh = c.debt_eur > 15000;
  const engaged = ["payment_plan", "needs_proof", "wont_pay"].includes(c.call_outcome);

  if (hasAssets && hasContact) {
    return {
      decision: "PRIORITIZE_CONTACT",
      label: "PRIORITIZE CONTACT",
      color: "text-green border-green-dim bg-green/5",
      why: [
        "Assets confirmed via legal channels",
        hasContact ? "Contact channel available" : "",
        isHigh ? `High-value case: ${formatEur(c.debt_eur)}` : "",
        engaged ? "Debtor has shown engagement" : "",
      ].filter(Boolean),
      alternative: engaged
        ? "If payment plan fails → escalate to enforcement with confirmed assets"
        : "If no response after 3 more attempts → legal enforcement using confirmed assets",
    };
  }

  if (hasAssets && !hasContact) {
    return {
      decision: "ALTERNATIVE_CHANNELS",
      label: "FIND ALTERNATIVE CHANNELS",
      color: "text-blue border-blue-dim bg-blue/5",
      why: [
        "Assets confirmed — enforcement viable",
        "No working contact channel",
        "OSINT enrichment should reveal alternative contacts",
      ],
      alternative: "If no alternative contact found → proceed directly to legal enforcement (assets already confirmed)",
    };
  }

  if (isHigh && !hasAssets) {
    return {
      decision: "ESCALATE_LEGAL",
      label: "ESCALATE — DEEP INVESTIGATION",
      color: "text-amber border-amber-dim bg-amber/5",
      why: [
        `High exposure: ${formatEur(c.debt_eur)}`,
        "No assets found — but debt size justifies deeper investigation",
        "ROI on investigation likely positive",
      ],
      alternative: "If deep investigation yields nothing → reduce to passive monitoring with periodic re-check",
    };
  }

  if (!hasAssets && !hasContact && c.debt_eur < 5000) {
    return {
      decision: "DEPRIORITIZE",
      label: "DEPRIORITIZE",
      color: "text-muted-foreground border-border bg-surface-3",
      why: [
        "No assets, no contact, low value",
        `Cost of pursuit exceeds probable recovery on ${formatEur(c.debt_eur)}`,
        "Resource allocation not justified",
      ],
      alternative: "Park in passive queue. Re-evaluate if new signals emerge from periodic data refresh.",
    };
  }

  return {
    decision: "PASSIVE_MONITOR",
    label: "PASSIVE MONITOR",
    color: "text-muted-foreground border-border bg-surface-3",
    why: [
      "Insufficient signals for active pursuit",
      "Periodic re-enrichment recommended",
      c.call_attempts > 3 ? "Multiple contact attempts exhausted" : "Limited contact attempts — may retry",
    ],
    alternative: "Set 90-day re-enrichment trigger. If new signals emerge → escalate to active pursuit.",
  };
}

export default function DecisionEngine({ caseData }: { caseData: Case }) {
  const result = decide(caseData);

  return (
    <div className={`border rounded-md p-4 ${result.color}`}>
      <h4 className="text-[10px] font-mono tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
        <Crosshair className="w-3.5 h-3.5 text-primary" /> COLLECTOR DECISION ENGINE
      </h4>

      <div className="text-lg font-mono font-bold text-foreground mb-3">
        {result.label}
      </div>

      <div className="space-y-1 mb-3">
        <span className="text-[9px] font-mono text-muted-foreground">WHY:</span>
        {result.why.map((w, i) => (
          <div key={i} className="text-[11px] text-foreground flex items-start gap-1.5">
            <span className="text-primary mt-0.5">•</span> {w}
          </div>
        ))}
      </div>

      <div className="border-t border-border pt-2 flex items-start gap-1.5">
        <ArrowRight className="w-3.5 h-3.5 text-amber mt-0.5 flex-shrink-0" />
        <div>
          <span className="text-[9px] font-mono text-muted-foreground block mb-0.5">ALTERNATIVE PATH:</span>
          <span className="text-[11px] text-muted-foreground">{result.alternative}</span>
        </div>
      </div>
    </div>
  );
}
