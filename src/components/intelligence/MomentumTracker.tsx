import { Case } from "@/data/cases";
import { Activity, ArrowUp, ArrowDown, Minus } from "lucide-react";

interface MomentumResult {
  before: string[];
  after: string[];
  momentum: "HIGH" | "MEDIUM" | "LOW" | "NONE";
  delta: number;
}

function track(c: Case): MomentumResult {
  const before: string[] = [];
  const after: string[] = [];

  // Before (what we started with — typically very little)
  if (["rings_out", "invalid_number", "voicemail"].includes(c.call_outcome)) {
    before.push("Unreachable — no confirmed contact");
  } else {
    before.push(`Contact outcome: ${c.call_outcome.replace(/_/g, " ")}`);
  }

  if (c.legal_asset_finding === "no_assets_found") before.push("No assets found");
  else if (c.legal_asset_finding === "not_initiated") before.push("Legal search not initiated");
  else before.push(`Legal finding: ${c.legal_asset_finding.replace(/_/g, " ")}`);

  before.push("No enrichment data");

  // After (simulated enrichment results)
  after.push("Employment signals detected");
  if (c.debt_origin === "sme_loan" || c.debt_eur > 20000) {
    after.push("Business connection identified");
  }
  if (!["invalid_number"].includes(c.call_outcome)) {
    after.push("Alternative contact channels found");
  }
  if (c.legal_asset_finding !== "no_assets_found" && c.legal_asset_finding !== "not_initiated") {
    after.push("Asset confirmation strengthened");
  }
  after.push("Social presence mapped");
  after.push("Negotiation strategy generated");

  const delta = after.length - 1; // Minus the baseline "social presence" which is always there

  let momentum: MomentumResult["momentum"];
  if (delta >= 4) momentum = "HIGH";
  else if (delta >= 2) momentum = "MEDIUM";
  else if (delta >= 1) momentum = "LOW";
  else momentum = "NONE";

  return { before, after, momentum, delta };
}

const momentumConfig = {
  HIGH: { color: "text-green", icon: ArrowUp, barWidth: 90 },
  MEDIUM: { color: "text-amber", icon: ArrowUp, barWidth: 60 },
  LOW: { color: "text-muted-foreground", icon: Minus, barWidth: 30 },
  NONE: { color: "text-red", icon: ArrowDown, barWidth: 5 },
};

export default function MomentumTracker({ caseData }: { caseData: Case }) {
  const { before, after, momentum, delta } = track(caseData);
  const cfg = momentumConfig[momentum];
  const MIcon = cfg.icon;

  return (
    <div className="bg-surface-2 border border-border rounded-md p-4">
      <h4 className="text-[10px] font-mono tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
        <Activity className="w-3.5 h-3.5 text-primary" /> CASE MOMENTUM TRACKER
      </h4>

      <div className="flex items-center gap-2 mb-3">
        <MIcon className={`w-5 h-5 ${cfg.color}`} />
        <span className={`text-lg font-mono font-bold ${cfg.color}`}>{momentum}</span>
        <span className="text-[10px] text-muted-foreground font-mono">+{delta} new intelligence signals</span>
      </div>

      <div className="w-full h-1.5 bg-surface-3 rounded-full overflow-hidden mb-4">
        <div className={`h-full rounded-full transition-all ${momentum === "HIGH" ? "bg-green" : momentum === "MEDIUM" ? "bg-amber" : "bg-red"}`} style={{ width: `${cfg.barWidth}%` }} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="text-[9px] font-mono text-red block mb-1.5">BEFORE ENRICHMENT</span>
          {before.map((b, i) => (
            <div key={i} className="text-[10px] text-muted-foreground py-0.5 flex items-start gap-1">
              <span className="text-red">—</span> {b}
            </div>
          ))}
        </div>
        <div>
          <span className="text-[9px] font-mono text-green block mb-1.5">AFTER ENRICHMENT</span>
          {after.map((a, i) => (
            <div key={i} className="text-[10px] text-foreground py-0.5 flex items-start gap-1">
              <span className="text-green">+</span> {a}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
