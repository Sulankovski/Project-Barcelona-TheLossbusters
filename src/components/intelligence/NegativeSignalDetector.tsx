import { Case } from "@/data/cases";
import { EyeOff, AlertCircle, ArrowDownRight } from "lucide-react";

interface NegativeProfile {
  isNoSignal: boolean;
  findings: string[];
  interpretation: string;
  action: string;
}

function detect(c: Case): NegativeProfile {
  const noContact = ["invalid_number", "rings_out", "voicemail"].includes(c.call_outcome);
  const noAssets = ["no_assets_found", "not_initiated"].includes(c.legal_asset_finding);
  const noEngagement = !["payment_plan", "needs_proof", "wont_pay"].includes(c.call_outcome);

  const findings: string[] = [];
  if (noAssets) findings.push("No assets or income detected via legal channels");
  if (noContact) findings.push("No confirmed contact channel");
  if (c.call_outcome === "invalid_number") findings.push("Phone number invalid — no alternative found");
  if (c.call_attempts >= 5 && noContact) findings.push(`${c.call_attempts} contact attempts — all failed`);
  if (noEngagement) findings.push("No debtor engagement in any interaction");
  if (c.debt_age_months > 24 && noAssets) findings.push("Aged debt with zero recovery signals");

  const isNoSignal = noContact && noAssets && noEngagement;

  return {
    isNoSignal,
    findings,
    interpretation: isNoSignal
      ? "Complete signal void. Either low-income individual with no seizable assets, or highly private individual who has deliberately minimized their digital/financial footprint."
      : "Partial signal gaps detected. Some avenues may still yield results with targeted enrichment.",
    action: isNoSignal
      ? "Deprioritize expensive recovery actions. Avoid legal escalation (cost exceeds probable recovery). Move to passive monitoring queue."
      : "Targeted OSINT enrichment recommended for remaining gaps. Focus resources on confirmed signal channels.",
  };
}

export default function NegativeSignalDetector({ caseData }: { caseData: Case }) {
  const profile = detect(caseData);

  if (!profile.isNoSignal && profile.findings.length < 2) return null;

  return (
    <div className={`border rounded-md p-4 ${profile.isNoSignal ? "bg-surface-2 border-red-dim" : "bg-surface-2 border-amber-dim"}`}>
      <h4 className={`text-[10px] font-mono tracking-wider mb-3 flex items-center gap-1.5 ${profile.isNoSignal ? "text-red" : "text-amber"}`}>
        <EyeOff className="w-3.5 h-3.5" />
        {profile.isNoSignal ? "NO SIGNAL PROFILE" : "NEGATIVE SIGNAL DETECTION"}
      </h4>

      <div className="space-y-1 mb-3">
        {profile.findings.map((f, i) => (
          <div key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground">
            <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0 text-red" />
            {f}
          </div>
        ))}
      </div>

      <div className="text-[11px] text-foreground leading-relaxed mb-2 border-t border-border pt-2">
        <span className="text-[9px] font-mono text-muted-foreground block mb-1">INTERPRETATION</span>
        {profile.interpretation}
      </div>

      <div className="text-[11px] text-green leading-relaxed flex items-start gap-1.5">
        <ArrowDownRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        {profile.action}
      </div>
    </div>
  );
}
