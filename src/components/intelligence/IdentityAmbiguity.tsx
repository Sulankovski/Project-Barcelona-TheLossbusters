import { Case, COUNTRY_NAMES, COUNTRY_FLAGS } from "@/data/cases";
import { Users, CheckCircle2, XCircle, HelpCircle } from "lucide-react";

interface IdentityMatch {
  name: string;
  location: string;
  detail: string;
  likelihood: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  reasons: string[];
  selected?: boolean;
}

function generateMatches(c: Case, name: string): IdentityMatch[] {
  const country = COUNTRY_NAMES[c.country] || c.country;
  const matches: IdentityMatch[] = [];

  // Primary match
  const primaryReasons: string[] = ["Location match with case jurisdiction"];
  if (c.legal_asset_finding !== "no_assets_found" && c.legal_asset_finding !== "not_initiated") {
    primaryReasons.push("Asset registry confirmation");
  }
  if (!["invalid_number", "rings_out"].includes(c.call_outcome)) {
    primaryReasons.push("Phone contact established");
  }
  primaryReasons.push("Name + country cross-reference");

  matches.push({
    name: name || "Primary Match",
    location: country,
    detail: c.debt_origin === "sme_loan" ? "Business owner / Director" : "Individual debtor profile",
    likelihood: c.call_outcome === "denies_identity" ? "MEDIUM" : "HIGH",
    reasons: primaryReasons,
    selected: true,
  });

  // Secondary match (different city)
  const cities: Record<string, string[]> = {
    PT: ["Lisbon", "Porto", "Faro"],
    ES: ["Barcelona", "Madrid", "Valencia"],
    DE: ["Berlin", "Munich", "Hamburg"],
    FR: ["Paris", "Lyon", "Marseille"],
    IT: ["Rome", "Milan", "Naples"],
    PL: ["Warsaw", "Krakow", "Gdansk"],
    NL: ["Amsterdam", "Rotterdam"],
    BE: ["Brussels", "Antwerp"],
    DK: ["Copenhagen", "Aarhus"],
  };
  const citiesList = cities[c.country] || ["Unknown City"];

  matches.push({
    name: name || "Secondary Match",
    location: `${citiesList[1] || citiesList[0]}, ${country}`,
    detail: "Different profession — possible namesake",
    likelihood: "LOW",
    reasons: ["Name match only", "Different city signal", "No overlapping data points"],
  });

  // Third if identity denial
  if (c.call_outcome === "denies_identity") {
    matches.push({
      name: name || "Tertiary Match",
      location: `${citiesList[2] || citiesList[0]}, ${country}`,
      detail: "No digital signals found",
      likelihood: "UNKNOWN",
      reasons: ["Weak name match", "No confirming signals", "Identity denial adds ambiguity"],
    });
  }

  return matches;
}

const likelihoodConfig: Record<string, { color: string; icon: any; bg: string }> = {
  HIGH: { color: "text-green", icon: CheckCircle2, bg: "bg-green/10 border-green-dim" },
  MEDIUM: { color: "text-amber", icon: HelpCircle, bg: "bg-amber/5 border-amber-dim" },
  LOW: { color: "text-muted-foreground", icon: XCircle, bg: "bg-surface-3 border-border" },
  UNKNOWN: { color: "text-muted-foreground", icon: HelpCircle, bg: "bg-surface-3 border-border" },
};

export default function IdentityAmbiguity({ caseData, name }: { caseData: Case; name: string }) {
  const matches = generateMatches(caseData, name);

  return (
    <div className="bg-surface-2 border border-border rounded-md p-4">
      <h4 className="text-[10px] font-mono tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
        <Users className="w-3.5 h-3.5 text-primary" /> IDENTITY AMBIGUITY ENGINE
      </h4>
      <p className="text-[10px] text-muted-foreground mb-3">
        {matches.length} potential matches found. Ranked by signal convergence.
      </p>

      <div className="space-y-2">
        {matches.map((m, i) => {
          const cfg = likelihoodConfig[m.likelihood];
          const Icon = cfg.icon;
          return (
            <div key={i} className={`border rounded-md p-3 ${m.selected ? cfg.bg : "bg-surface-3 border-border opacity-70"}`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-foreground">#{i + 1}</span>
                  <span className="text-xs font-mono text-foreground">{m.name}</span>
                  {m.selected && <span className="text-[8px] font-mono bg-primary text-primary-foreground px-1.5 py-0.5 rounded">SELECTED</span>}
                </div>
                <div className="flex items-center gap-1">
                  <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                  <span className={`text-[10px] font-mono font-bold ${cfg.color}`}>{m.likelihood}</span>
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground mb-1">{m.location} · {m.detail}</div>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {m.reasons.map((r, j) => (
                  <span key={j} className="text-[9px] font-mono bg-surface-2 text-muted-foreground px-1.5 py-0.5 rounded border border-border">
                    {r}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
