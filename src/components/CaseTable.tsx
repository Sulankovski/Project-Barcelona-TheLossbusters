import { useState, useMemo } from "react";
import { Case, CASES, COUNTRY_FLAGS, formatEur, getCallOutcomeColor, getAssetColor, getPriorityLabel } from "@/data/cases";
import { ArrowUpDown, Search, Filter, ChevronRight } from "lucide-react";

type SortKey = "priority_score" | "debt_eur" | "debt_age_months" | "case_id";

interface Props {
  onSelectCase: (c: Case) => void;
  selectedId?: string;
}

export default function CaseTable({ onSelectCase, selectedId }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("priority_score");
  const [sortDesc, setSortDesc] = useState(true);
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState<string>("ALL");
  const [outcomeFilter, setOutcomeFilter] = useState<string>("ALL");

  const countries = useMemo(() => [...new Set(CASES.map(c => c.country))].sort(), []);
  const outcomes = useMemo(() => [...new Set(CASES.map(c => c.call_outcome))].sort(), []);

  const filtered = useMemo(() => {
    let list = [...CASES];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => c.case_id.toLowerCase().includes(q) || c.debt_origin.includes(q) || c.country.toLowerCase().includes(q));
    }
    if (countryFilter !== "ALL") list = list.filter(c => c.country === countryFilter);
    if (outcomeFilter !== "ALL") list = list.filter(c => c.call_outcome === outcomeFilter);
    list.sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      return sortDesc ? (bv as number) - (av as number) : (av as number) - (bv as number);
    });
    return list;
  }, [search, countryFilter, outcomeFilter, sortKey, sortDesc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDesc(!sortDesc);
    else { setSortKey(key); setSortDesc(true); }
  };

  return (
    <div className="bg-surface-1 border border-border rounded-md overflow-hidden animate-fade-in">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 border-b border-border">
        <div className="flex items-center gap-2 bg-surface-2 rounded px-2 py-1 flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-muted-foreground" />
          <input
            className="bg-transparent text-sm font-mono text-foreground placeholder:text-muted-foreground outline-none w-full"
            placeholder="Search cases..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1">
          <Filter className="w-3 h-3 text-muted-foreground" />
          <select className="bg-surface-2 text-xs font-mono text-foreground border-none rounded px-2 py-1 outline-none"
            value={countryFilter} onChange={e => setCountryFilter(e.target.value)}>
            <option value="ALL">All Countries</option>
            {countries.map(c => <option key={c} value={c}>{COUNTRY_FLAGS[c]} {c}</option>)}
          </select>
          <select className="bg-surface-2 text-xs font-mono text-foreground border-none rounded px-2 py-1 outline-none"
            value={outcomeFilter} onChange={e => setOutcomeFilter(e.target.value)}>
            <option value="ALL">All Outcomes</option>
            {outcomes.map(o => <option key={o} value={o}>{o.replace(/_/g, " ")}</option>)}
          </select>
        </div>
        <span className="text-xs font-mono text-muted-foreground ml-auto">{filtered.length} cases</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
        <table className="w-full text-xs font-mono">
          <thead className="sticky top-0 bg-surface-2 z-10">
            <tr className="text-muted-foreground text-left">
              <th className="px-3 py-2 cursor-pointer select-none" onClick={() => toggleSort("priority_score")}>
                <span className="flex items-center gap-1">PRI <ArrowUpDown className="w-2.5 h-2.5" /></span>
              </th>
              <th className="px-3 py-2 cursor-pointer select-none" onClick={() => toggleSort("case_id")}>CASE</th>
              <th className="px-3 py-2">CTY</th>
              <th className="px-3 py-2 cursor-pointer select-none text-right" onClick={() => toggleSort("debt_eur")}>
                <span className="flex items-center justify-end gap-1">DEBT <ArrowUpDown className="w-2.5 h-2.5" /></span>
              </th>
              <th className="px-3 py-2">ORIGIN</th>
              <th className="px-3 py-2 cursor-pointer select-none text-right" onClick={() => toggleSort("debt_age_months")}>
                <span className="flex items-center justify-end gap-1">AGE <ArrowUpDown className="w-2.5 h-2.5" /></span>
              </th>
              <th className="px-3 py-2 text-center">CALLS</th>
              <th className="px-3 py-2">OUTCOME</th>
              <th className="px-3 py-2">ASSETS</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const pri = getPriorityLabel(c.priority_score ?? 0);
              const isSelected = c.case_id === selectedId;
              return (
                <tr
                  key={c.case_id}
                  onClick={() => onSelectCase(c)}
                  className={`border-t border-border cursor-pointer transition-colors hover:bg-surface-2 ${isSelected ? "bg-surface-2 border-l-2 border-l-primary" : ""}`}
                >
                  <td className="px-3 py-2">
                    <span className={`font-bold text-[10px] ${pri.color}`}>{pri.label}</span>
                  </td>
                  <td className="px-3 py-2 text-foreground font-medium">{c.case_id}</td>
                  <td className="px-3 py-2">{COUNTRY_FLAGS[c.country]} {c.country}</td>
                  <td className="px-3 py-2 text-right text-amber font-medium">{formatEur(c.debt_eur)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{c.debt_origin.replace(/_/g, " ")}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{c.debt_age_months}mo</td>
                  <td className="px-3 py-2 text-center">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-surface-3 text-foreground text-[10px]">
                      {c.call_attempts}
                    </span>
                  </td>
                  <td className={`px-3 py-2 ${getCallOutcomeColor(c.call_outcome)}`}>
                    {c.call_outcome.replace(/_/g, " ")}
                  </td>
                  <td className={`px-3 py-2 ${getAssetColor(c.legal_asset_finding)}`}>
                    {c.legal_asset_finding.replace(/_/g, " ")}
                  </td>
                  <td className="px-3 py-2">
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
