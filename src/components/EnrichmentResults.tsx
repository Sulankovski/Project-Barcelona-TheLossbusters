import { Case } from "@/data/cases";
import { Globe, User, Briefcase, MapPin, Phone, Shield, AlertTriangle, ExternalLink, Sparkles, MessageSquare, Target, TrendingUp, Eye, Brain, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

interface Props {
  result: any;
  caseData: Case;
  name: string;
}

export default function EnrichmentResults({ result, caseData, name }: Props) {
  const hasStructuredSections = Boolean(
    result?.summary ||
    result?.recovery_outlook ||
    typeof result?.overall_confidence === "number" ||
    result?.identity_matches?.length > 0 ||
    result?.negotiation_strategy ||
    result?.employment ||
    result?.business_connections?.length > 0 ||
    result?.social_presence?.length > 0 ||
    result?.possible_assets?.length > 0 ||
    result?.contact_alternatives?.length > 0 ||
    result?.location_signals?.length > 0 ||
    result?.leverage_points?.length > 0 ||
    result?.risk_indicators?.length > 0 ||
    (result?.lifestyle_signals && (result?.lifestyle_signals?.observed?.length > 0 || result?.lifestyle_signals?.inconsistencies?.length > 0)) ||
    result?.evidence_chain?.length > 0 ||
    result?.negative_signals?.length > 0 ||
    result?.intelligence_gaps?.length > 0
  );

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Fallback / parse error output */}
      {!hasStructuredSections && (
        <div className="bg-surface-2 border border-amber-dim rounded-md p-4">
          <h4 className="text-[10px] font-mono tracking-wider text-amber mb-2">RAW INTELLIGENCE OUTPUT</h4>
          {result?.parse_error && result?.raw_text ? (
            <p className="text-[11px] text-foreground whitespace-pre-wrap break-words">{result.raw_text}</p>
          ) : (
            <pre className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap break-words">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Executive Summary */}
      {result.summary && (
        <div className="bg-surface-2 border border-primary/30 rounded-md p-4 glow-amber">
          <h4 className="text-[10px] font-mono tracking-wider text-amber mb-2 flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5" /> EXECUTIVE SUMMARY
          </h4>
          <p className="text-sm text-foreground leading-relaxed">{result.summary}</p>
        </div>
      )}

      {/* Decision / Recovery Outlook */}
      {result.recovery_outlook && (
        <div className={`bg-surface-2 border rounded-md p-4 ${
          result.recovery_outlook.rating === 'HIGH' ? 'border-green-dim glow-green' :
          result.recovery_outlook.rating === 'MEDIUM' ? 'border-amber-dim glow-amber' :
          'border-red-dim'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[10px] font-mono tracking-wider text-muted-foreground flex items-center gap-1">
              <Target className="w-3 h-3" /> RECOVERY OUTLOOK
            </h4>
            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
              result.recovery_outlook.rating === 'HIGH' ? 'bg-green/20 text-green' :
              result.recovery_outlook.rating === 'MEDIUM' ? 'bg-amber/20 text-amber' :
              'bg-red/20 text-red'
            }`}>{result.recovery_outlook.rating}</span>
          </div>
          <p className="text-[11px] text-foreground mb-2">{result.recovery_outlook.reasoning}</p>
          {result.recovery_outlook.recommended_action && (
            <p className="text-[11px] text-amber">→ {result.recovery_outlook.recommended_action}</p>
          )}
        </div>
      )}

      {/* Overall Confidence */}
      {typeof result.overall_confidence === 'number' && (
        <div className="bg-surface-2 border border-border rounded-md p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono tracking-wider text-muted-foreground">OVERALL CONFIDENCE</span>
            <span className="text-xs font-mono text-amber font-bold">{(result.overall_confidence * 100).toFixed(0)}%</span>
          </div>
          <div className="w-full h-1.5 bg-surface-3 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${result.overall_confidence * 100}%` }} />
          </div>
        </div>
      )}

      {/* Identity Matches */}
      {result.identity_matches?.length > 0 && (
        <div className="bg-surface-2 border border-border rounded-md p-3">
          <h4 className="text-[10px] font-mono tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
            <User className="w-3 h-3" /> IDENTITY MATCHES ({result.identity_matches.length})
          </h4>
          {result.identity_matches.map((match: any, i: number) => (
            <div key={i} className="py-2 border-t border-border first:border-0">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-foreground font-medium">{match.description}</span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                  match.likelihood === 'HIGH' ? 'bg-green/20 text-green' :
                  match.likelihood === 'MEDIUM' ? 'bg-amber/20 text-amber' :
                  'bg-red/20 text-red'
                }`}>{match.likelihood}</span>
              </div>
              {match.location && <span className="text-[10px] text-muted-foreground">📍 {match.location}</span>}
              {match.reasoning && <p className="text-[10px] text-muted-foreground mt-1">{match.reasoning}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Negotiation Strategy */}
      {result.negotiation_strategy && (
        <div className="bg-surface-2 border border-green-dim rounded-md p-4 glow-green">
          <h4 className="text-[10px] font-mono tracking-wider text-green mb-3 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" /> NEGOTIATION STRATEGY
          </h4>
          <div className="space-y-2">
            {result.negotiation_strategy.primary_angle && (
              <div>
                <span className="text-[9px] font-mono text-amber">PRIMARY ANGLE</span>
                <p className="text-[11px] text-foreground">{result.negotiation_strategy.primary_angle}</p>
              </div>
            )}
            {result.negotiation_strategy.secondary_angle && (
              <div>
                <span className="text-[9px] font-mono text-muted-foreground">SECONDARY ANGLE</span>
                <p className="text-[11px] text-foreground">{result.negotiation_strategy.secondary_angle}</p>
              </div>
            )}
            {result.negotiation_strategy.tone && (
              <div>
                <span className="text-[9px] font-mono text-muted-foreground">TONE</span>
                <p className="text-[11px] text-foreground">{result.negotiation_strategy.tone}</p>
              </div>
            )}
            {result.negotiation_strategy.opening_line && (
              <div className="bg-surface-3 rounded p-2 mt-2">
                <span className="text-[9px] font-mono text-green">OPENING LINE</span>
                <p className="text-xs text-foreground italic">"{result.negotiation_strategy.opening_line}"</p>
              </div>
            )}
            {result.negotiation_strategy.risks?.length > 0 && (
              <div className="mt-1">
                <span className="text-[9px] font-mono text-red">RISKS</span>
                {result.negotiation_strategy.risks.map((r: string, i: number) => (
                  <p key={i} className="text-[10px] text-muted-foreground">⚠ {r}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Employment */}
      {result.employment && (
        <ProfileSection
          icon={Briefcase}
          title="EMPLOYMENT"
          items={[
            result.employment.details,
            result.employment.employer_name && `Employer: ${result.employment.employer_name}`,
          ].filter(Boolean)}
          badge={result.employment.confidence}
          badgeLabel={result.employment.status?.toUpperCase()}
        />
      )}

      {/* Business Connections */}
      {result.business_connections?.length > 0 && (
        <div className="bg-surface-2 border border-border rounded-md p-3">
          <h4 className="text-[10px] font-mono tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
            <User className="w-3 h-3" /> BUSINESS NETWORK
          </h4>
          {result.business_connections.map((conn: any, i: number) => (
            <div key={i} className="flex items-center gap-2 py-1.5 border-t border-border first:border-0">
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                conn.confidence === 'HIGH' ? 'bg-green/20 text-green' :
                conn.confidence === 'MEDIUM' ? 'bg-amber/20 text-amber' :
                'bg-muted text-muted-foreground'
              }`}>{conn.relationship}</span>
              <span className="text-[11px] text-foreground flex-1">{conn.entity}</span>
              <span className="text-[9px] text-muted-foreground">{conn.source_type}</span>
            </div>
          ))}
        </div>
      )}

      {/* Social Presence */}
      {result.social_presence?.length > 0 && (
        <div className="bg-surface-2 border border-border rounded-md p-3">
          <h4 className="text-[10px] font-mono tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
            <Globe className="w-3 h-3" /> SOCIAL PRESENCE
          </h4>
          {result.social_presence.map((s: any, i: number) => (
            <div key={i} className="py-1.5 border-t border-border first:border-0">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-amber bg-surface-3 px-1.5 py-0.5 rounded">{s.platform}</span>
                <span className="text-[10px] text-muted-foreground">{s.visibility}</span>
              </div>
              {s.notable_signals && <p className="text-[11px] text-foreground mt-0.5">{s.notable_signals}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Possible Assets */}
      {result.possible_assets?.length > 0 && (
        <div className="bg-surface-2 border border-border rounded-md p-3">
          <h4 className="text-[10px] font-mono tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
            <Shield className="w-3 h-3" /> POSSIBLE ASSETS
          </h4>
          {result.possible_assets.map((a: any, i: number) => (
            <div key={i} className="flex items-start gap-2 py-1.5 border-t border-border first:border-0">
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded mt-0.5 ${
                a.confidence === 'HIGH' ? 'bg-green/20 text-green' :
                a.confidence === 'MEDIUM' ? 'bg-amber/20 text-amber' :
                'bg-muted text-muted-foreground'
              }`}>{a.type}</span>
              <span className="text-[11px] text-foreground flex-1">{a.description}</span>
            </div>
          ))}
        </div>
      )}

      {/* Contact Alternatives */}
      {result.contact_alternatives?.length > 0 && (
        <ProfileSection
          icon={Phone}
          title="ALTERNATIVE CONTACTS"
          items={result.contact_alternatives.map((c: any) => `[${c.type}] ${c.value}`)}
        />
      )}

      {/* Location Signals */}
      {result.location_signals?.length > 0 && (
        <ProfileSection
          icon={MapPin}
          title="LOCATION SIGNALS"
          items={result.location_signals.map((l: any) => `${l.location} (${l.confidence})`)}
        />
      )}

      {/* Leverage Points */}
      {result.leverage_points?.length > 0 && (
        <ProfileSection icon={Sparkles} title="LEVERAGE POINTS" items={result.leverage_points} color="text-green" />
      )}

      {/* Risk Indicators */}
      {result.risk_indicators?.length > 0 && (
        <ProfileSection icon={AlertTriangle} title="RISK INDICATORS" items={result.risk_indicators} color="text-red" />
      )}

      {/* Lifestyle Signals */}
      {result.lifestyle_signals && (result.lifestyle_signals.observed?.length > 0 || result.lifestyle_signals.inconsistencies?.length > 0) && (
        <div className="bg-surface-2 border border-border rounded-md p-3">
          <h4 className="text-[10px] font-mono tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
            <Eye className="w-3 h-3" /> LIFESTYLE vs DECLARED REALITY
          </h4>
          {result.lifestyle_signals.observed?.map((o: string, i: number) => (
            <div key={i} className="text-[11px] text-foreground py-0.5">• {o}</div>
          ))}
          {result.lifestyle_signals.inconsistencies?.length > 0 && (
            <div className="mt-2 border-t border-border pt-2">
              <span className="text-[9px] font-mono text-red">INCONSISTENCIES</span>
              {result.lifestyle_signals.inconsistencies.map((inc: string, i: number) => (
                <div key={i} className="text-[11px] text-red py-0.5">⚠ {inc}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Evidence Chain */}
      {result.evidence_chain?.length > 0 && (
        <EvidenceChainSection chain={result.evidence_chain} />
      )}

      {/* Negative Signals */}
      {result.negative_signals?.length > 0 && (
        <div className="bg-surface-2 border border-border rounded-md p-3">
          <h4 className="text-[10px] font-mono tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> NEGATIVE SIGNALS (NOT FOUND)
          </h4>
          {result.negative_signals.map((s: string, i: number) => (
            <div key={i} className="text-[11px] text-muted-foreground py-0.5">∅ {s}</div>
          ))}
        </div>
      )}

      {/* Intelligence Gaps */}
      {result.intelligence_gaps?.length > 0 && (
        <div className="bg-surface-2 border border-red-dim rounded-md p-3">
          <h4 className="text-[10px] font-mono tracking-wider text-red mb-2">⚠ INTELLIGENCE GAPS</h4>
          {result.intelligence_gaps.map((g: string, i: number) => (
            <div key={i} className="text-[11px] text-muted-foreground py-0.5">• {g}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileSection({ icon: Icon, title, items, color = "text-foreground", badge, badgeLabel }: {
  icon: any; title: string; items: string[]; color?: string; badge?: string; badgeLabel?: string;
}) {
  if (!items.length) return null;
  return (
    <div className="bg-surface-2 border border-border rounded-md p-3">
      <div className="flex items-center justify-between mb-1.5">
        <h4 className="text-[10px] font-mono tracking-wider text-muted-foreground flex items-center gap-1">
          <Icon className="w-3 h-3" /> {title}
        </h4>
        {badge && (
          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
            badge === 'HIGH' ? 'bg-green/20 text-green' :
            badge === 'MEDIUM' ? 'bg-amber/20 text-amber' :
            'bg-muted text-muted-foreground'
          }`}>{badgeLabel || badge}</span>
        )}
      </div>
      {items.map((item, i) => (
        <div key={i} className={`text-[11px] ${color} py-0.5`}>• {item}</div>
      ))}
    </div>
  );
}

function EvidenceChainSection({ chain }: { chain: any[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-surface-2 border border-border rounded-md p-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <h4 className="text-[10px] font-mono tracking-wider text-muted-foreground flex items-center gap-1">
          <TrendingUp className="w-3 h-3" /> EVIDENCE CHAIN ({chain.length} claims)
        </h4>
        {expanded ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
      </button>
      {expanded && (
        <div className="mt-2 space-y-2">
          {chain.map((item: any, i: number) => (
            <div key={i} className="border-t border-border pt-2 first:border-0 first:pt-0">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-foreground font-medium">{item.claim}</span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                  item.confidence === 'HIGH' ? 'bg-green/20 text-green' :
                  item.confidence === 'MEDIUM' ? 'bg-amber/20 text-amber' :
                  'bg-muted text-muted-foreground'
                }`}>{item.confidence}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Evidence: {item.evidence}</p>
              <p className="text-[10px] text-muted-foreground">Source: {item.source_type}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
