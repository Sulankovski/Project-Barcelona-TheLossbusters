import { ExternalLink, Zap, Phone, Mail, MapPin } from "lucide-react";

interface TopMatch {
  rank: number;
  name?: string;
  confidence?: string;
  reasoning?: string;
  summary?: string;
  key_facts?: string[];
  linkedin_url?: string | null;
  facebook_url?: string | null;
  cross_platform_match?: boolean;
  phone?: string | null;
  email?: string | null;
  location?: string | null;
  physical_address?: string | null;
}

interface SummaryData {
  top_matches: TopMatch[];
  analysis_notes?: string;
}

interface Props { data: SummaryData }

const confStyle: Record<string, { badge: string; border: string; glow: string }> = {
  HIGH:   { badge: 'bg-green-500/20 text-green-400 border-green-500/40',  border: 'border-green-500/30',  glow: 'shadow-green-500/10'  },
  MEDIUM: { badge: 'bg-amber-500/20 text-amber-400 border-amber-500/40',  border: 'border-amber-500/30',  glow: 'shadow-amber-500/10'  },
  LOW:    { badge: 'bg-red-500/20   text-red-400   border-red-500/40',    border: 'border-red-500/30',    glow: 'shadow-red-500/10'    },
};

const rankLabel = ['#1', '#2', '#3'];

export default function SuperVexorSummary({ data }: Props) {
  const { top_matches, analysis_notes } = data;

  return (
    <div className="bg-surface-2 border border-primary/40 rounded-md p-5 space-y-5 shadow-lg shadow-primary/5">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
          <Zap className="w-3.5 h-3.5 text-primary-foreground" />
        </div>
        <div>
          <span className="text-[11px] font-mono font-bold tracking-widest text-primary">SUPERVEXOR</span>
          <span className="text-[11px] font-mono text-muted-foreground"> — MASTER ANALYSIS</span>
        </div>
        <span className="ml-auto text-[10px] font-mono text-muted-foreground">
          Top {top_matches.length} match{top_matches.length !== 1 ? 'es' : ''}
        </span>
      </div>

      {/* Top matches */}
      {top_matches.length === 0 ? (
        <p className="text-xs font-mono text-muted-foreground">No matches to display.</p>
      ) : (
        <div className="space-y-4">
          {top_matches.slice(0, 3).map((match, i) => {
            const conf = (match.confidence ?? '').toUpperCase();
            const style = confStyle[conf] ?? confStyle.LOW;

            return (
              <div
                key={i}
                className={`rounded-md border ${style.border} bg-surface-3 p-4 space-y-3 shadow-sm ${style.glow}`}
              >
                {/* Match header */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-[11px] font-mono font-bold text-primary">{rankLabel[i]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-mono font-bold text-foreground">{match.name ?? '—'}</span>
                      {conf && (
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${style.badge}`}>
                          {conf}
                        </span>
                      )}
                      {match.cross_platform_match && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-primary/30 bg-primary/10 text-primary">
                          CROSS-PLATFORM
                        </span>
                      )}
                    </div>
                    {/* Platform links */}
                    <div className="flex gap-3 mt-1">
                      {match.linkedin_url && (
                        <a href={match.linkedin_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] font-mono text-blue-400 hover:text-blue-300 transition-colors">
                          LinkedIn <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                      {match.facebook_url && (
                        <a href={match.facebook_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] font-mono text-blue-500 hover:text-blue-400 transition-colors">
                          Facebook <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contact details — shown for all matches that have data, highlighted on #1 */}
                {(match.phone || match.email || match.location || match.physical_address) && (
                  <div className={`flex flex-col gap-1.5 px-3 py-2 rounded border ${i === 0 ? 'border-primary/30 bg-primary/5' : 'border-border/50 bg-surface-3/50'}`}>
                    {match.phone && (
                      <span className="flex items-center gap-1.5 text-[11px] font-mono text-foreground/90">
                        <Phone className="w-3 h-3 text-primary/70 flex-shrink-0" />
                        {match.phone}
                      </span>
                    )}
                    {match.email && (
                      <span className="flex items-center gap-1.5 text-[11px] font-mono text-foreground/90">
                        <Mail className="w-3 h-3 text-primary/70 flex-shrink-0" />
                        {match.email}
                      </span>
                    )}
                    {match.physical_address && (
                      <span className="flex items-center gap-1.5 text-[11px] font-mono text-foreground/90">
                        <MapPin className="w-3 h-3 text-primary/70 flex-shrink-0" />
                        {match.physical_address}
                      </span>
                    )}
                    {match.location && !match.physical_address && (
                      <span className="flex items-center gap-1.5 text-[11px] font-mono text-foreground/90">
                        <MapPin className="w-3 h-3 text-primary/70 flex-shrink-0" />
                        {match.location}
                      </span>
                    )}
                  </div>
                )}

                {/* Summary */}
                {match.summary && (
                  <p className="text-xs font-mono text-foreground/80 leading-relaxed border-l-2 border-primary/30 pl-3">
                    {match.summary}
                  </p>
                )}

                {/* Key facts */}
                {match.key_facts && match.key_facts.length > 0 && (
                  <ul className="space-y-1">
                    {match.key_facts.map((fact, j) => (
                      <li key={j} className="flex gap-2 text-[11px] font-mono text-foreground/70">
                        <span className="text-primary/60 flex-shrink-0">▸</span>
                        {fact}
                      </li>
                    ))}
                  </ul>
                )}

                {/* Reasoning */}
                {match.reasoning && (
                  <p className="text-[10px] font-mono text-muted-foreground/70 italic border-t border-border/50 pt-2">
                    {match.reasoning}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Analysis notes */}
      {analysis_notes && (
        <div className="bg-surface-3 border border-border rounded p-3">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Analysis Notes</p>
          <p className="text-xs font-mono text-foreground/70 leading-relaxed">{analysis_notes}</p>
        </div>
      )}
    </div>
  );
}
