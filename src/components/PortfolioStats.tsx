import { CASES, formatEur } from "@/data/cases";
import { TrendingUp, Phone, Scale, AlertTriangle, Target, DollarSign } from "lucide-react";

const stats = (() => {
  const totalDebt = CASES.reduce((s, c) => s + c.debt_eur, 0);
  const avgDebt = totalDebt / CASES.length;
  const unreachable = CASES.filter(c => ["rings_out", "invalid_number", "voicemail"].includes(c.call_outcome)).length;
  const noAssets = CASES.filter(c => c.legal_asset_finding === "no_assets_found").length;
  const highPriority = CASES.filter(c => (c.priority_score ?? 0) >= 0.6).length;
  const withAssets = CASES.filter(c => ["employment_income", "bank_account", "vehicle", "pension", "multiple"].includes(c.legal_asset_finding)).length;
  return { totalDebt, avgDebt, unreachable, noAssets, highPriority, withAssets, total: CASES.length };
})();

const cards = [
  { label: "TOTAL EXPOSURE", value: formatEur(stats.totalDebt), icon: DollarSign, accent: "text-amber" },
  { label: "AVG CASE VALUE", value: formatEur(stats.avgDebt), icon: TrendingUp, accent: "text-blue" },
  { label: "UNREACHABLE", value: `${stats.unreachable}/${stats.total}`, sub: `${Math.round(stats.unreachable / stats.total * 100)}%`, icon: Phone, accent: "text-red" },
  { label: "NO ASSETS FOUND", value: `${stats.noAssets}/${stats.total}`, sub: `${Math.round(stats.noAssets / stats.total * 100)}%`, icon: Scale, accent: "text-red" },
  { label: "HIGH PRIORITY", value: `${stats.highPriority}`, sub: "cases", icon: Target, accent: "text-green" },
  { label: "SEIZABLE ASSETS", value: `${stats.withAssets}`, sub: "confirmed", icon: AlertTriangle, accent: "text-green" },
];

export default function PortfolioStats() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="bg-surface-1 border border-border rounded-md p-3 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <c.icon className={`w-3.5 h-3.5 ${c.accent}`} />
            <span className="text-[10px] font-mono tracking-wider text-muted-foreground">{c.label}</span>
          </div>
          <div className={`text-lg font-mono font-bold ${c.accent}`}>{c.value}</div>
          {c.sub && <div className="text-xs font-mono text-muted-foreground">{c.sub}</div>}
        </div>
      ))}
    </div>
  );
}
