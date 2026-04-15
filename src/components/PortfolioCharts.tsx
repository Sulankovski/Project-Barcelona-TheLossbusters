import { useMemo } from "react";
import { CASES, COUNTRY_FLAGS } from "@/data/cases";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ["hsl(45,100%,55%)", "hsl(160,80%,45%)", "hsl(210,90%,55%)", "hsl(0,72%,55%)", "hsl(185,80%,50%)", "hsl(280,60%,55%)", "hsl(30,90%,55%)", "hsl(120,50%,45%)", "hsl(330,70%,55%)"];

export default function PortfolioCharts() {
  const countryData = useMemo(() => {
    const map: Record<string, number> = {};
    CASES.forEach(c => { map[c.country] = (map[c.country] || 0) + c.debt_eur; });
    return Object.entries(map)
      .map(([country, value]) => ({ name: `${COUNTRY_FLAGS[country] || ""} ${country}`, value }))
      .sort((a, b) => b.value - a.value);
  }, []);

  const outcomeData = useMemo(() => {
    const map: Record<string, number> = {};
    CASES.forEach(c => { map[c.call_outcome] = (map[c.call_outcome] || 0) + 1; });
    return Object.entries(map)
      .map(([name, value]) => ({ name: name.replace(/_/g, " "), value }))
      .sort((a, b) => b.value - a.value);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="bg-surface-1 border border-border rounded-md p-4">
        <h3 className="text-[10px] font-mono tracking-wider text-muted-foreground mb-3">EXPOSURE BY COUNTRY</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={countryData} layout="vertical" margin={{ left: 40, right: 10 }}>
            <XAxis type="number" tick={{ fontSize: 9, fontFamily: "JetBrains Mono", fill: "hsl(215,15%,45%)" }} tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fontFamily: "JetBrains Mono", fill: "hsl(210,20%,75%)" }} width={50} />
            <Tooltip
              contentStyle={{ background: "hsl(220,18%,7%)", border: "1px solid hsl(220,15%,15%)", borderRadius: 4, fontFamily: "JetBrains Mono", fontSize: 11 }}
              formatter={(v: number) => [`€${v.toLocaleString()}`, "Exposure"]}
            />
            <Bar dataKey="value" radius={[0, 3, 3, 0]}>
              {countryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-surface-1 border border-border rounded-md p-4">
        <h3 className="text-[10px] font-mono tracking-wider text-muted-foreground mb-3">CALL OUTCOMES</h3>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={outcomeData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
              {outcomeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip
              contentStyle={{ background: "hsl(220,18%,7%)", border: "1px solid hsl(220,15%,15%)", borderRadius: 4, fontFamily: "JetBrains Mono", fontSize: 11 }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
          {outcomeData.map((d, i) => (
            <span key={d.name} className="flex items-center gap-1 text-[9px] font-mono text-muted-foreground">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: COLORS[i % COLORS.length] }} />
              {d.name} ({d.value})
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
