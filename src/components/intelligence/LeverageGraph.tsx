import { Case, COUNTRY_NAMES } from "@/data/cases";
import { Building2, User, Globe, Mail, ChevronRight, Network } from "lucide-react";

interface Node {
  id: string;
  label: string;
  type: "person" | "company" | "employer" | "domain" | "contact" | "associate";
  detail?: string;
}

interface Edge {
  from: string;
  to: string;
  relation: string;
}

function generateGraph(c: Case, name: string): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const personId = "debtor";

  nodes.push({ id: personId, label: name || "Debtor", type: "person", detail: `${COUNTRY_NAMES[c.country]} · ${c.debt_origin.replace(/_/g, " ")}` });

  // Employer
  if (c.legal_asset_finding === "employment_income" || c.debt_origin === "sme_loan") {
    const empId = "employer";
    const empName = c.debt_origin === "sme_loan" ? "SME Business (Registered)" : "Employer (Detected via payroll)";
    nodes.push({ id: empId, label: empName, type: "employer", detail: "Active income source" });
    edges.push({ from: personId, to: empId, relation: "employed at" });
  }

  // Business connections
  if (c.debt_origin === "sme_loan" || c.debt_eur > 20000) {
    const bizId = "company";
    nodes.push({ id: bizId, label: `${name || "Debtor"} Consulting SL`, type: "company", detail: "Business registry match" });
    edges.push({ from: personId, to: bizId, relation: "director of" });

    const coDir = "co_director";
    nodes.push({ id: coDir, label: "Co-Director (Registry Match)", type: "associate", detail: "Shared directorship since 2019" });
    edges.push({ from: bizId, to: coDir, relation: "co-director" });
  }

  // Domain
  if (c.debt_origin === "sme_loan" || c.call_outcome === "denies_identity") {
    const domId = "domain";
    nodes.push({ id: domId, label: `${(name || "debtor").toLowerCase().replace(/\s/g, "")}consulting.eu`, type: "domain", detail: "WHOIS registration match" });
    edges.push({ from: personId, to: domId, relation: "domain owner" });

    const emailId = "email";
    nodes.push({ id: emailId, label: `info@${(name || "debtor").toLowerCase().replace(/\s/g, "")}consulting.eu`, type: "contact", detail: "Contact discovered via domain" });
    edges.push({ from: domId, to: emailId, relation: "contact email" });
  }

  // Bank account
  if (c.legal_asset_finding === "bank_account") {
    const bankId = "bank";
    nodes.push({ id: bankId, label: "Bank Account (Confirmed)", type: "company", detail: "Seizable via court order" });
    edges.push({ from: personId, to: bankId, relation: "account holder" });
  }

  // Vehicle
  if (c.legal_asset_finding === "vehicle") {
    const vehId = "vehicle";
    nodes.push({ id: vehId, label: "Registered Vehicle", type: "company", detail: "Motor registry match" });
    edges.push({ from: personId, to: vehId, relation: "registered owner" });
  }

  // Relative contact
  if (c.call_outcome === "relative") {
    const relId = "relative";
    nodes.push({ id: relId, label: "Family Contact (Via Call)", type: "associate", detail: "Responded to collection call" });
    edges.push({ from: personId, to: relId, relation: "relative" });
  }

  return { nodes, edges };
}

const iconMap: Record<string, any> = {
  person: User,
  company: Building2,
  employer: Building2,
  domain: Globe,
  contact: Mail,
  associate: User,
};

const colorMap: Record<string, string> = {
  person: "text-primary border-primary/30 bg-primary/10",
  company: "text-amber border-amber-dim bg-amber/5",
  employer: "text-green border-green-dim bg-green/5",
  domain: "text-blue border-blue-dim bg-blue/5",
  contact: "text-foreground border-border bg-surface-3",
  associate: "text-muted-foreground border-border bg-surface-3",
};

export default function LeverageGraph({ caseData, name }: { caseData: Case; name: string }) {
  const { nodes, edges } = generateGraph(caseData, name);

  if (nodes.length <= 1) return null;

  const person = nodes[0];
  const connected = nodes.slice(1);

  return (
    <div className="bg-surface-2 border border-border rounded-md p-4">
      <h4 className="text-[10px] font-mono tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
        <Network className="w-3.5 h-3.5 text-primary" /> LEVERAGE NETWORK GRAPH
      </h4>

      {/* Root node */}
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${colorMap[person.type]}`}>
          <User className="w-4 h-4" />
        </div>
        <div>
          <div className="text-sm font-mono font-medium text-foreground">{person.label}</div>
          <div className="text-[10px] text-muted-foreground">{person.detail}</div>
        </div>
      </div>

      {/* Tree */}
      <div className="ml-4 border-l border-border pl-4 space-y-2">
        {edges.filter(e => e.from === "debtor").map((edge, i) => {
          const target = connected.find(n => n.id === edge.to);
          if (!target) return null;
          const Icon = iconMap[target.type] || Building2;

          // Find children of this node
          const childEdges = edges.filter(e2 => e2.from === target.id);

          return (
            <div key={i}>
              <div className="flex items-start gap-2">
                <div className="mt-0.5 flex items-center gap-1">
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  <div className={`w-6 h-6 rounded flex items-center justify-center border ${colorMap[target.type]}`}>
                    <Icon className="w-3 h-3" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono text-foreground">{target.label}</div>
                  <div className="text-[9px] text-muted-foreground">{edge.relation} · {target.detail}</div>
                </div>
              </div>

              {/* Sub-nodes */}
              {childEdges.length > 0 && (
                <div className="ml-8 border-l border-border/50 pl-3 mt-1 space-y-1.5">
                  {childEdges.map((ce, j) => {
                    const child = nodes.find(n => n.id === ce.to);
                    if (!child) return null;
                    const CIcon = iconMap[child.type] || Building2;
                    return (
                      <div key={j} className="flex items-start gap-2">
                        <ChevronRight className="w-2.5 h-2.5 text-muted-foreground mt-0.5" />
                        <div className={`w-5 h-5 rounded flex items-center justify-center border ${colorMap[child.type]}`}>
                          <CIcon className="w-2.5 h-2.5" />
                        </div>
                        <div>
                          <div className="text-[11px] font-mono text-foreground">{child.label}</div>
                          <div className="text-[9px] text-muted-foreground">{ce.relation} · {child.detail}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
