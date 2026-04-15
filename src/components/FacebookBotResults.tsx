import { MapPin, Briefcase, GraduationCap, Users, ExternalLink, User, Heart, Image } from "lucide-react";

interface WorkEntry    { employer?: string; title?: string; duration?: string }
interface EducationEntry { school?: string; degree?: string; years?: string }
interface ContactEntry  { type: string; value: string }

export interface FacebookProfile {
  name?: string;
  profile_url?: string;
  match_confidence?: string;
  location?: string;
  hometown?: string;
  relationship_status?: string;
  about?: string;
  friends_count?: string;
  photos_visible?: boolean;
  work?: WorkEntry[];
  education?: EducationEntry[];
  interests?: string[];
  recent_activity?: string[];
  contact_info?: ContactEntry[];
  notes?: string;
}

interface FacebookData {
  profiles: FacebookProfile[];
  search_notes?: string;
}

interface Props { data: FacebookData }

const confidenceColor: Record<string, string> = {
  HIGH:   'text-green-400 border-green-500/30 bg-green-500/10',
  MEDIUM: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  LOW:    'text-red-400  border-red-500/30  bg-red-500/10',
};

function ProfileCard({ profile, index }: { profile: FacebookProfile; index: number }) {
  const conf = (profile.match_confidence ?? '').toUpperCase();
  const confClass = confidenceColor[conf] ?? 'text-muted-foreground border-border bg-surface-3';

  return (
    <div className="border border-blue-700/30 rounded-md p-4 space-y-3 bg-surface-3">
      {/* Profile header */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-blue-700/20 flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-mono font-bold text-foreground">{profile.name ?? '—'}</span>
            {conf && (
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${confClass}`}>
                {conf}
              </span>
            )}
            <span className="text-[10px] font-mono text-muted-foreground/50">#{index + 1}</span>
          </div>
          <div className="flex flex-wrap gap-3 mt-1">
            {profile.location && (
              <span className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                <MapPin className="w-3 h-3" /> {profile.location}
              </span>
            )}
            {profile.hometown && profile.hometown !== profile.location && (
              <span className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                <MapPin className="w-3 h-3 opacity-40" /> From: {profile.hometown}
              </span>
            )}
            {profile.friends_count && (
              <span className="flex items-center gap-1 text-[11px] font-mono text-blue-400">
                <Users className="w-3 h-3" /> {profile.friends_count}
              </span>
            )}
            {profile.relationship_status && (
              <span className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                <Heart className="w-3 h-3" /> {profile.relationship_status}
              </span>
            )}
            {profile.photos_visible !== undefined && (
              <span className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                <Image className="w-3 h-3" /> Photos: {profile.photos_visible ? 'visible' : 'private'}
              </span>
            )}
          </div>
        </div>
        {profile.profile_url && (
          <a href={profile.profile_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-blue-400 transition-colors flex-shrink-0">
            View <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* About */}
      {profile.about && (
        <p className="text-[11px] font-mono text-foreground/70 leading-relaxed border-l-2 border-blue-700/30 pl-2">
          {profile.about}
        </p>
      )}

      {/* Work */}
      {profile.work && profile.work.length > 0 && (
        <div>
          <p className="text-[10px] font-mono text-muted-foreground mb-1.5 flex items-center gap-1">
            <Briefcase className="w-3 h-3" /> WORK
          </p>
          <div className="space-y-1">
            {profile.work.map((w, i) => (
              <div key={i} className="text-[11px] font-mono">
                <span className="text-foreground">{w.title}</span>
                {w.employer && <span className="text-muted-foreground"> · {w.employer}</span>}
                {w.duration && <span className="text-muted-foreground/50"> · {w.duration}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {profile.education && profile.education.length > 0 && (
        <div>
          <p className="text-[10px] font-mono text-muted-foreground mb-1.5 flex items-center gap-1">
            <GraduationCap className="w-3 h-3" /> EDUCATION
          </p>
          <div className="space-y-1">
            {profile.education.map((e, i) => (
              <div key={i} className="text-[11px] font-mono">
                <span className="text-foreground">{e.school}</span>
                {e.degree && <span className="text-muted-foreground"> · {e.degree}</span>}
                {e.years  && <span className="text-muted-foreground/50"> · {e.years}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interests */}
      {profile.interests && profile.interests.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {profile.interests.map((item, i) => (
            <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-700/10 border border-blue-700/20 text-blue-300">
              {item}
            </span>
          ))}
        </div>
      )}

      {/* Contact info */}
      {profile.contact_info && profile.contact_info.length > 0 && (
        <div className="space-y-0.5">
          {profile.contact_info.map((c, i) => (
            <div key={i} className="flex gap-2 text-[11px] font-mono">
              <span className="text-muted-foreground capitalize">{c.type}:</span>
              <span className="text-foreground/80">{c.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Notes */}
      {profile.notes && (
        <p className="text-[10px] font-mono text-muted-foreground/60 italic">{profile.notes}</p>
      )}
    </div>
  );
}

export default function FacebookBotResults({ data }: Props) {
  const { profiles, search_notes } = data;

  return (
    <div className="bg-surface-2 border border-blue-700/40 rounded-md p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <div className="w-4 h-4 rounded bg-blue-700 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-[10px] font-bold">f</span>
        </div>
        <span className="text-[10px] font-mono tracking-wider text-blue-400">FACEBOOK BOT RESULTS</span>
        <span className="ml-auto text-[10px] font-mono text-muted-foreground">
          {profiles.length} profile{profiles.length !== 1 ? 's' : ''} found
        </span>
      </div>

      {/* Profile cards */}
      <div className="space-y-3">
        {profiles.map((p, i) => (
          <ProfileCard key={i} profile={p} index={i} />
        ))}
      </div>

      {/* Search notes */}
      {search_notes && (
        <div className="bg-surface-3 border border-border rounded p-3">
          <p className="text-[10px] font-mono text-muted-foreground mb-1 uppercase tracking-wider">Search Notes</p>
          <p className="text-xs font-mono text-foreground/70">{search_notes}</p>
        </div>
      )}
    </div>
  );
}
