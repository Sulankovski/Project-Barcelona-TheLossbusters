import { Case, formatEur } from "@/data/cases";
import { TrendingUp, Plus, Minus } from "lucide-react";

type Outlook = "HIGH" | "MEDIUM" | "LOW" | "MINIMAL";

interface RecoverySignal {
  label: string;
  positive: boolean;
}

function analyze(c: Case): { outlook: Outlook; signals: RecoverySignal[]; tier: string; estRecovery: string } {
  const signals: RecoverySignal[] = [];
  let score = 0;

  // Positive signals
  if (["employment_income", "multiple"].includes(c.legal_asset_finding)) {
    signals.push({ label: "Employment / income detected", positive: true });
    score += 3;
  }
  if (["bank_account", "vehicle", "pension"].includes(c.legal_asset_finding)) {
    signals.push({ label: `Asset confirmed: ${c.legal_asset_finding.replace(/_/g, " ")}`, positive: true });
    score += 2;
  }
  if (c.debt_origin === "sme_loan") {
    signals.push({ label: "Business loan — company reputation leverage", positive: true });
    score += 2;
  }
  if (c.call_outcome === "payment_plan") {
    signals.push({ label: "Payment plan discussed — willingness signal", positive: true });
    score += 3;
  }
  if (c.call_outcome === "needs_proof") {
    signals.push({ label: "Requested proof — engaged debtor", positive: true });
    score += 2;
  }
  if (c.debt_age_months < 12) {
    signals.push({ label: "Fresh debt (<12 months)", positive: true });
    score += 1;
  }

  // Negative signals
  if (c.legal_asset_finding === "no_assets_found") {
    signals.push({ label: "No assets found via legal channels", positive: false });
    score -= 2;
  }
  if (["invalid_number", "rings_out"].includes(c.call_outcome)) {
    signals.push({ label: "No confirmed contact channel", positive: false });
    score -= 2;
  }
  if (c.call_outcome === "denies_identity") {
    signals.push({ label: "Identity denial — evasion risk", positive: false });
    score -= 1;
  }
  if (c.call_attempts >= 5) {
    signals.push({ label: `${c.call_attempts} failed contact attempts`, positive: false });
    score -= 1;
  }
  if (c.debt_age_months > 24) {
    signals.push({ label: "Aging debt (>24 months)", positive: false });
    score -= 1;
  }
  if (c.legal_asset_finding === "assets_not_seizable") {
    signals.push({ label: "Assets exist but not seizable", positive: false });
    score -= 1;
  }

  let outlook: Outlook;
  let tier: string;
  let recoveryPct: number;

  if (score >= 4) { outlook = "HIGH"; tier = "Tier 1 — Active pursuit"; recoveryPct = 0.6; }
  else if (score >= 1) { outlook = "MEDIUM"; tier = "Tier 2 — Standard queue"; recoveryPct = 0.35; }
  else if (score >= -2) { outlook = "LOW"; tier = "Tier 3 — Passive monitoring"; recoveryPct = 0.15; }
  else { outlook = "MINIMAL"; tier = "Tier 4 — Deprioritize"; recoveryPct = 0.05; }

  return {
    outlook,
    signals,
    tier,
    estRecovery: formatEur(c.debt_eur * recoveryPct),
  };
}

const outlookColors: Record<Outlook, string> = {
  HIGH: "text-green",
  MEDIUM: "text-amber",
  LOW: "text-red",
  MINIMAL: "text-muted-foreground",
};

const outlookBars: Record<Outlook, number> = { HIGH: 90, MEDIUM: 55, LOW: 25, MINIMAL: 8 };

export default function RecoveryEstimator({ caseData }: { caseData: Case }) {
  const { outlook, signals, tier, estRecovery } = analyze(caseData);

  return (
    <div className="bg-surface-2 border border-border rounded-md p-4">
      <h4 className="text-[10px] font-mono tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
        <TrendingUp className="w-3.5 h-3.5 text-primary" /> TIME-TO-RECOVERY ESTIMATOR
      </h4>

      <div className="flex items-center justify-between mb-2">
        <span className={`text-lg font-mono font-bold ${outlookColors[outlook]}`}>
          {outlook}
        </span>
        <span className="text-xs font-mono text-muted-foreground">{tier}</span>
      </div>

      <div className="w-full h-2 bg-surface-3 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all ${outlook === "HIGH" ? "bg-green" : outlook === "MEDIUM" ? "bg-amber" : "bg-red"}`}
          style={{ width: `${outlookBars[outlook]}%` }}
        />
      </div>

      <div className="flex items-center justify-between mb-3 text-[10px] font-mono text-muted-foreground">
        <span>Est. recovery: <span className="text-foreground font-bold">{estRecovery}</span></span>
        <span>of {formatEur(caseData.debt_eur)}</span>
      </div>

      <div className="space-y-1">
        {signals.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-[11px]">
            {s.positive ? (
              <Plus className="w-3 h-3 text-green flex-shrink-0" />
            ) : (
              <Minus className="w-3 h-3 text-red flex-shrink-0" />
            )}
            <span className={s.positive ? "text-foreground" : "text-muted-foreground"}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
