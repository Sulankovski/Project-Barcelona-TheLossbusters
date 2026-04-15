import { useState } from "react";
import { Case } from "@/data/cases";
import PortfolioStats from "@/components/PortfolioStats";
import PortfolioCharts from "@/components/PortfolioCharts";
import CaseTable from "@/components/CaseTable";
import CaseDetail from "@/components/CaseDetail";
import { Shield, Radar, Zap } from "lucide-react";

export default function Index() {
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-surface-1">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
              <Radar className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-mono font-bold text-foreground text-sm tracking-tight flex items-center gap-2">
                VEXOR <span className="text-primary">INTELLIGENCE</span>
              </h1>
              <p className="text-[9px] font-mono text-muted-foreground tracking-widest">PROJECT EUROPE · BCN HACKATHON</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span className="text-[10px] font-mono text-accent">SYSTEM ONLINE</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[10px] font-mono text-muted-foreground">OSINT AGENT READY</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-[1600px] mx-auto px-4 py-4 space-y-4">
        {/* Portfolio Overview */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-3.5 h-3.5 text-amber" />
            <h2 className="text-[10px] font-mono tracking-widest text-muted-foreground">PORTFOLIO COMMAND CENTER</h2>
            <span className="text-[9px] font-mono text-amber bg-surface-2 px-2 py-0.5 rounded">LIVE</span>
          </div>
          <PortfolioStats />
        </section>

        {/* Charts */}
        <PortfolioCharts />

        {/* Case Queue */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Radar className="w-3.5 h-3.5 text-blue" />
            <h2 className="text-[10px] font-mono tracking-widest text-muted-foreground">CASE QUEUE — PRIORITY RANKED</h2>
          </div>
          <CaseTable onSelectCase={setSelectedCase} selectedId={selectedCase?.case_id} />
        </section>
      </main>

      {/* Case Detail Slide-over */}
      {selectedCase && (
        <CaseDetail caseData={selectedCase} onClose={() => setSelectedCase(null)} />
      )}
    </div>
  );
}
