import { useState } from "react";
import { Case, COUNTRY_NAMES } from "@/data/cases";
import { FileSearch, ChevronDown, ChevronRight, Shield } from "lucide-react";

interface EvidenceNode {
  claim: string;
  evidence: string;
  source: string;
  confidenceReason: string;
  confidence: number;
}

function buildTree(c: Case, name: string): EvidenceNode[] {
  const nodes: EvidenceNode[] = [];

  if (c.legal_asset_finding === "employment_income" || c.debt_origin === "sme_loan") {
    nodes.push({
      claim: "Employment detected",
      evidence: c.debt_origin === "sme_loan" ? "Business registration match in company registry" : "Payroll income confirmed via legal asset search",
      source: `${COUNTRY_NAMES[c.country]} National Business Registry / Legal Asset Report`,
      confidenceReason: `Name match + jurisdiction match (${COUNTRY_NAMES[c.country]})`,
      confidence: 0.85,
    });
  }

  if (c.legal_asset_finding === "bank_account") {
    nodes.push({
      claim: "Bank account identified",
      evidence: "Active bank account found via legal asset search",
      source: "Court-ordered asset report — banking registry",
      confidenceReason: "Legal confirmation — high reliability",
      confidence: 0.95,
    });
  }

  if (c.legal_asset_finding === "vehicle") {
    nodes.push({
      claim: "Vehicle registered",
      evidence: "Motor vehicle registration linked to debtor name",
      source: "National vehicle registry cross-check",
      confidenceReason: "Registry match — name + address correlation",
      confidence: 0.88,
    });
  }

  if (c.debt_origin === "sme_loan" || c.debt_eur > 20000) {
    nodes.push({
      claim: "Business connection found",
      evidence: `Company registration matching "${name || "debtor"}" as director`,
      source: `${COUNTRY_NAMES[c.country]} Business Registry — public company filings`,
      confidenceReason: "Name + country match in public filings",
      confidence: 0.72,
    });
  }

  // Always add a social presence node
  nodes.push({
    claim: "Social media presence",
    evidence: "LinkedIn profile found with partial name match",
    source: "LinkedIn public profile — Google search index",
    confidenceReason: "Name match — location unconfirmed (weak signal)",
    confidence: 0.45,
  });

  if (c.call_outcome === "denies_identity") {
    nodes.push({
      claim: "Identity evasion pattern",
      evidence: `Debtor denied identity on ${c.call_attempts} contact attempt(s) — phone remains active`,
      source: "Internal call records + phone number validation API",
      confidenceReason: "Active number + repeated denial = awareness pattern",
      confidence: 0.78,
    });
  }

  return nodes;
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = value * 100;
  const color = pct > 70 ? "bg-green" : pct > 40 ? "bg-amber" : "bg-red";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1 bg-surface-3 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[9px] font-mono text-muted-foreground">{pct.toFixed(0)}%</span>
    </div>
  );
}

export default function EvidenceTree({ caseData, name }: { caseData: Case; name: string }) {
  const nodes = buildTree(caseData, name);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggle = (i: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  return (
    <div className="bg-surface-2 border border-border rounded-md p-4">
      <h4 className="text-[10px] font-mono tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
        <FileSearch className="w-3.5 h-3.5 text-primary" /> EXPLAINABLE EVIDENCE TREE
      </h4>
      <p className="text-[9px] text-muted-foreground mb-3">
        Click any claim to expand: claim → evidence → source → confidence reasoning
      </p>

      <div className="space-y-1.5">
        {nodes.map((n, i) => {
          const isOpen = expanded.has(i);
          return (
            <div key={i} className="border border-border rounded bg-surface-3">
              <button
                onClick={() => toggle(i)}
                className="w-full flex items-center gap-2 p-2.5 text-left hover:bg-surface-2 transition-colors rounded"
              >
                {isOpen ? <ChevronDown className="w-3 h-3 text-primary" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                <Shield className="w-3 h-3 text-primary" />
                <span className="text-xs font-mono text-foreground flex-1">{n.claim}</span>
                <ConfidenceBar value={n.confidence} />
              </button>

              {isOpen && (
                <div className="px-3 pb-3 pt-0 ml-5 border-l border-primary/20 space-y-2 animate-fade-in">
                  <div>
                    <span className="text-[9px] font-mono text-amber block mb-0.5">EVIDENCE</span>
                    <span className="text-[11px] text-foreground">{n.evidence}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-blue block mb-0.5">SOURCE</span>
                    <span className="text-[11px] text-muted-foreground">{n.source}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-green block mb-0.5">CONFIDENCE REASONING</span>
                    <span className="text-[11px] text-muted-foreground">{n.confidenceReason}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
