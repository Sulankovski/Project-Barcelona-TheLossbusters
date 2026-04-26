import { useState } from "react";
import { ExternalLink, Zap, Phone, Mail, MapPin, Search, Loader2, Home, Car, Briefcase, Globe, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

const BOT_URL = "http://localhost:3001";

function toAbsoluteUrl(url: string): string {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

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

interface DeepSearchResult {
  phone_numbers?: string[];
  email_addresses?: string[];
  physical_addresses?: string[];
  properties?: string[];
  vehicles?: string[];
  employers?: string[];
  social_profiles?: string[];
  other_findings?: string[];
  sources?: string[];
  confidence?: string;
}

interface Props { data: SummaryData }

const confStyle: Record<string, { badge: string; border: string; glow: string }> = {
  HIGH:   { badge: 'bg-green-500/20 text-green-400 border-green-500/40',  border: 'border-green-500/30',  glow: 'shadow-green-500/10'  },
  MEDIUM: { badge: 'bg-amber-500/20 text-amber-400 border-amber-500/40',  border: 'border-amber-500/30',  glow: 'shadow-amber-500/10'  },
  LOW:    { badge: 'bg-red-500/20   text-red-400   border-red-500/40',    border: 'border-red-500/30',    glow: 'shadow-red-500/10'    },
};

const rankLabel = ['#1', '#2', '#3'];

function DeepSearchSection({ match }: { match: TopMatch }) {
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<DeepSearchResult | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  const run = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${BOT_URL}/api/deep-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:             match.name,
          location:         match.location ?? match.physical_address,
          phone:            match.phone,
          email:            match.email,
          physical_address: match.physical_address,
          linkedin_url:     match.linkedin_url,
          facebook_url:     match.facebook_url,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Deep search failed');
      setResult(json.data);
    } catch (err: any) {
      setError(err.message ?? 'Deep search failed');
    } finally {
      setLoading(false);
    }
  };

  const confClass = result?.confidence
    ? confStyle[result.confidence.toUpperCase()] ?? confStyle.LOW
    : null;

  return (
    <div className="border-t border-border/50 pt-3 space-y-2">
      {!result && !loading && (
        <button
          onClick={run}
          className="flex items-center gap-2 text-[11px] font-mono px-3 py-1.5 rounded border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
        >
          <Search className="w-3 h-3" />
          Make in-depth search for this user
        </button>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin text-primary" />
          Running Firecrawl deep search (up to 15 queries)…
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-[11px] font-mono text-red-400">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          {error}
          <button onClick={run} className="underline hover:no-underline ml-1">retry</button>
        </div>
      )}

      {result && (
        <div className="space-y-2">
          {/* Header row */}
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-full flex items-center justify-between text-[10px] font-mono text-primary/80 hover:text-primary transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Search className="w-3 h-3" />
              FIRECRAWL DEEP SEARCH RESULTS
              {confClass && (
                <span className={`px-1.5 py-0.5 rounded border text-[9px] ${confClass.badge} ml-1`}>
                  {result.confidence}
                </span>
              )}
            </span>
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {expanded && (
            <div className="space-y-2 pl-1">
              <DataGroup icon={<Phone className="w-3 h-3 text-primary/60" />}   label="Phone numbers"    items={result.phone_numbers} />
              <DataGroup icon={<Mail className="w-3 h-3 text-primary/60" />}    label="Email addresses"  items={result.email_addresses} />
              <DataGroup icon={<MapPin className="w-3 h-3 text-primary/60" />}  label="Addresses"        items={result.physical_addresses} />
              <DataGroup icon={<Home className="w-3 h-3 text-primary/60" />}    label="Properties"       items={result.properties} />
              <DataGroup icon={<Car className="w-3 h-3 text-primary/60" />}     label="Vehicles"         items={result.vehicles} />
              <DataGroup icon={<Briefcase className="w-3 h-3 text-primary/60" />} label="Employers"      items={result.employers} />
              <DataGroup icon={<Globe className="w-3 h-3 text-primary/60" />}   label="Social profiles"  items={result.social_profiles} />
              <DataGroup icon={<Search className="w-3 h-3 text-primary/60" />}  label="Other findings"   items={result.other_findings} />

              {result.sources && result.sources.length > 0 && (
                <div className="pt-1 border-t border-border/30">
                  <p className="text-[9px] font-mono text-muted-foreground/50 mb-1">Sources</p>
                  <div className="space-y-0.5">
                    {result.sources.map((s, i) => (
                      <a key={i} href={toAbsoluteUrl(s)} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground/60 hover:text-blue-400 transition-colors truncate">
                        <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                        {s}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={run}
                className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground/50 hover:text-primary transition-colors pt-1"
              >
                <Search className="w-2.5 h-2.5" /> Re-run search
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DataGroup({ icon, label, items }: { icon: React.ReactNode; label: string; items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="flex items-center gap-1 text-[9px] font-mono text-muted-foreground/60 uppercase tracking-wider mb-0.5">
        {icon} {label}
      </p>
      <ul className="space-y-0.5 pl-4">
        {items.map((item, i) => (
          <li key={i} className="text-[11px] font-mono text-foreground/80 flex gap-1.5">
            <span className="text-primary/40 flex-shrink-0">▸</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

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
                        <a href={toAbsoluteUrl(match.linkedin_url)} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] font-mono text-blue-400 hover:text-blue-300 transition-colors">
                          LinkedIn <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                      {match.facebook_url && (
                        <a href={toAbsoluteUrl(match.facebook_url)} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] font-mono text-blue-500 hover:text-blue-400 transition-colors">
                          Facebook <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contact details from master analysis */}
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

                {/* Deep search */}
                <DeepSearchSection match={match} />
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
