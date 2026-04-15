import { Case, COUNTRY_NAMES, COUNTRY_FLAGS, formatEur, getCallOutcomeColor, getAssetColor, getPriorityLabel } from "@/data/cases";
import { X, MapPin, CreditCard, Phone, Scale, Calendar, Hash, Target, Zap, User, Globe, Search } from "lucide-react";
import EnrichmentPanel from "./EnrichmentPanel";

interface Props {
  caseData: Case;
  onClose: () => void;
}

export default function CaseDetail({ caseData: c, onClose }: Props) {
  const pri = getPriorityLabel(c.priority_score ?? 0);

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-2xl bg-surface-1 border-l border-border h-full overflow-y-auto animate-slide-in">
        {/* Header */}
        <div className="sticky top-0 bg-surface-1 border-b border-border p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-surface-3 flex items-center justify-center">
              <span className="text-lg">{COUNTRY_FLAGS[c.country]}</span>
            </div>
            <div>
              <h2 className="font-mono font-bold text-foreground text-lg">{c.case_id}</h2>
              <span className="text-xs font-mono text-muted-foreground">{COUNTRY_NAMES[c.country]} · {c.debt_origin.replace(/_/g, " ")}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${pri.color} bg-surface-3`}>
              {pri.label} PRIORITY
            </span>
            <button onClick={onClose} className="p-1 rounded hover:bg-surface-3 transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Case Facts */}
          <div className="grid grid-cols-2 gap-3">
            <InfoCard icon={CreditCard} label="DEBT AMOUNT" value={formatEur(c.debt_eur)} accent="text-amber" />
            <InfoCard icon={Calendar} label="DEBT AGE" value={`${c.debt_age_months} months`} accent="text-blue" />
            <InfoCard icon={Phone} label="CALL OUTCOME" value={c.call_outcome.replace(/_/g, " ")} accent={getCallOutcomeColor(c.call_outcome)} sub={`${c.call_attempts} attempt${c.call_attempts > 1 ? "s" : ""}`} />
            <InfoCard icon={Scale} label="ASSET FINDING" value={c.legal_asset_finding.replace(/_/g, " ")} accent={getAssetColor(c.legal_asset_finding)} />
            <InfoCard icon={MapPin} label="JURISDICTION" value={`${COUNTRY_FLAGS[c.country]} ${COUNTRY_NAMES[c.country]}`} accent="text-foreground" />
            <InfoCard icon={Target} label="PRIORITY SCORE" value={`${((c.priority_score ?? 0) * 100).toFixed(0)}%`} accent={pri.color} />
          </div>

          {/* Case Assessment */}
          <div className="bg-surface-2 border border-border rounded-md p-3">
            <h3 className="text-[10px] font-mono tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-amber" /> CASE ASSESSMENT
            </h3>
            <p className="text-xs text-secondary-foreground leading-relaxed">
              {generateAssessment(c)}
            </p>
          </div>

          {/* Enrichment Panel */}
          <EnrichmentPanel caseData={c} />
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value, accent, sub }: { icon: any; label: string; value: string; accent: string; sub?: string }) {
  return (
    <div className="bg-surface-2 border border-border rounded-md p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`w-3 h-3 ${accent}`} />
        <span className="text-[9px] font-mono tracking-wider text-muted-foreground">{label}</span>
      </div>
      <div className={`text-sm font-mono font-medium ${accent}`}>{value}</div>
      {sub && <div className="text-[10px] font-mono text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function generateAssessment(c: Case): string {
  const parts: string[] = [];

  if (c.debt_eur > 50000) parts.push(`High-value case at ${formatEur(c.debt_eur)} — warrants significant resource allocation.`);
  else if (c.debt_eur > 15000) parts.push(`Mid-range exposure at ${formatEur(c.debt_eur)}.`);
  else parts.push(`Lower-value case at ${formatEur(c.debt_eur)}.`);

  if (["rings_out", "invalid_number"].includes(c.call_outcome)) {
    parts.push("Contact has been unreachable — alternative contact discovery is critical.");
  } else if (c.call_outcome === "denies_identity") {
    parts.push("Debtor denies identity — verification and leverage are needed before next contact.");
  } else if (c.call_outcome === "wont_pay") {
    parts.push("Debtor refuses to pay — financial intelligence could shift negotiation dynamics.");
  } else if (c.call_outcome === "payment_plan") {
    parts.push("Payment plan discussed — monitor compliance and maintain contact.");
  }

  if (["employment_income", "bank_account", "vehicle", "multiple"].includes(c.legal_asset_finding)) {
    parts.push("Legal asset search found seizable assets — enforcement is viable.");
  } else if (c.legal_asset_finding === "no_assets_found") {
    parts.push("No assets found through legal channels — OSINT enrichment could reveal undisclosed assets.");
  }

  if (c.debt_age_months > 24) parts.push("Case is aging — urgency to resolve before statute limitations.");

  return parts.join(" ");
}
