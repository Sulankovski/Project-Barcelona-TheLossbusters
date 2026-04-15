import { Case, formatEur } from "@/data/cases";
import { Eye, AlertTriangle } from "lucide-react";

interface GapSignal {
  declared: string;
  observed: string;
  interpretation: string;
  confidence: "LOW" | "MEDIUM";
}

function detectGaps(c: Case): GapSignal[] {
  const gaps: GapSignal[] = [];

  if (c.legal_asset_finding === "no_assets_found" && c.debt_eur > 15000) {
    gaps.push({
      declared: "No assets found in legal registry",
      observed: `High original debt (${formatEur(c.debt_eur)}) suggests prior creditworthiness`,
      interpretation: "Credit was extended based on financial capacity — current 'no assets' may indicate asset transfer or concealment",
      confidence: "LOW",
    });
  }

  if (c.call_outcome === "wont_pay" && c.legal_asset_finding !== "no_assets_found" && c.legal_asset_finding !== "not_initiated") {
    gaps.push({
      declared: "Refuses to pay — claims inability",
      observed: `Assets detected: ${c.legal_asset_finding.replace(/_/g, " ")}`,
      interpretation: "Stated inability contradicted by confirmed assets — possible strategic default",
      confidence: "MEDIUM",
    });
  }

  if (c.call_outcome === "denies_identity" && c.call_attempts >= 2) {
    gaps.push({
      declared: "Denies being the named debtor",
      observed: "Multiple calls to same number — debtor awareness likely",
      interpretation: "Repeated identity denial with contact maintenance suggests active evasion",
      confidence: "MEDIUM",
    });
  }

  if (c.debt_origin === "sme_loan" && c.legal_asset_finding === "no_assets_found") {
    gaps.push({
      declared: "No personal assets found",
      observed: "SME loan implies business ownership / directorship",
      interpretation: "Business assets may exist separately from personal registry — cross-check company records",
      confidence: "LOW",
    });
  }

  if (c.legal_asset_finding === "assets_not_seizable" && c.debt_eur > 10000) {
    gaps.push({
      declared: "Assets exist but classified as not seizable",
      observed: `Significant debt exposure (${formatEur(c.debt_eur)})`,
      interpretation: "Protected assets may indicate financial sophistication — settlement negotiation may be more effective than enforcement",
      confidence: "LOW",
    });
  }

  return gaps;
}

export default function LifestyleGap({ caseData }: { caseData: Case }) {
  const gaps = detectGaps(caseData);

  if (gaps.length === 0) return null;

  return (
    <div className="bg-surface-2 border border-amber-dim rounded-md p-4">
      <h4 className="text-[10px] font-mono tracking-wider text-amber mb-3 flex items-center gap-1.5">
        <Eye className="w-3.5 h-3.5" /> LIFESTYLE vs DECLARED REALITY GAP
      </h4>
      <p className="text-[9px] text-muted-foreground mb-3">
        ⚠ These are weak inferences requiring verification. Not actionable without additional evidence.
      </p>

      <div className="space-y-3">
        {gaps.map((g, i) => (
          <div key={i} className="border border-border rounded p-3 bg-surface-3">
            <div className="flex items-center gap-1 mb-2">
              <AlertTriangle className="w-3 h-3 text-amber" />
              <span className={`text-[9px] font-mono font-bold ${g.confidence === "MEDIUM" ? "text-amber" : "text-muted-foreground"}`}>
                CONFIDENCE: {g.confidence}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <span className="text-[9px] font-mono text-red block mb-0.5">DECLARED</span>
                <span className="text-[10px] text-muted-foreground">{g.declared}</span>
              </div>
              <div>
                <span className="text-[9px] font-mono text-green block mb-0.5">OBSERVED</span>
                <span className="text-[10px] text-muted-foreground">{g.observed}</span>
              </div>
            </div>
            <div className="text-[10px] text-foreground border-t border-border pt-1.5">{g.interpretation}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
