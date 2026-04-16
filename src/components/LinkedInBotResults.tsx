import { MapPin, Briefcase, GraduationCap, Star, ExternalLink, User, Phone, Mail, Home } from "lucide-react";

interface Experience {
  title?: string;
  company?: string;
  duration?: string;
  description?: string;
}

interface Education {
  school?: string;
  degree?: string;
  years?: string;
}

export interface LinkedInProfile {
  name?: string;
  headline?: string;
  location?: string;
  current_company?: string;
  profile_url?: string;
  match_confidence?: string;
  about?: string;
  experience?: Experience[];
  education?: Education[];
  skills?: string[];
  connections?: string;
  phone?: string;
  email?: string;
  physical_address?: string;
  notes?: string;
}

interface LinkedInData {
  profiles: LinkedInProfile[];
  search_notes?: string;
}

interface Props {
  data: LinkedInData;
}

const confidenceColor: Record<string, string> = {
  HIGH:   'text-green-400 border-green-500/30 bg-green-500/10',
  MEDIUM: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  LOW:    'text-red-400  border-red-500/30  bg-red-500/10',
};

function ProfileCard({ profile, index }: { profile: LinkedInProfile; index: number }) {
  const conf = (profile.match_confidence ?? '').toUpperCase();
  const confClass = confidenceColor[conf] ?? 'text-muted-foreground border-border bg-surface-3';

  return (
    <div className="border border-blue-500/20 rounded-md p-4 space-y-3 bg-surface-3">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {profile.name && (
              <span className="text-sm font-mono font-bold text-foreground">{profile.name}</span>
            )}
            {conf && (
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${confClass}`}>
                {conf}
              </span>
            )}
            <span className="text-[10px] font-mono text-muted-foreground/50">#{index + 1}</span>
          </div>
          {profile.headline && (
            <p className="text-[11px] font-mono text-muted-foreground mt-0.5">{profile.headline}</p>
          )}
          <div className="flex flex-wrap gap-3 mt-1">
            {profile.location && (
              <span className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                <MapPin className="w-3 h-3" /> {profile.location}
              </span>
            )}
            {profile.current_company && (
              <span className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                <Briefcase className="w-3 h-3" /> {profile.current_company}
              </span>
            )}
            {profile.connections && (
              <span className="text-[11px] font-mono text-blue-400">{profile.connections}</span>
            )}
          </div>
        </div>
        {profile.profile_url && (
          <a
            href={profile.profile_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-blue-400 transition-colors flex-shrink-0"
          >
            View <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* About */}
      {profile.about && (
        <p className="text-[11px] font-mono text-foreground/70 leading-relaxed border-l-2 border-blue-500/30 pl-2">
          {profile.about}
        </p>
      )}

      {/* Experience */}
      {profile.experience && profile.experience.length > 0 && (
        <div>
          <p className="text-[10px] font-mono text-muted-foreground mb-1.5 flex items-center gap-1">
            <Briefcase className="w-3 h-3" /> EXPERIENCE
          </p>
          <div className="space-y-1">
            {profile.experience.map((exp, i) => (
              <div key={i} className="text-[11px] font-mono">
                <span className="text-foreground">{exp.title}</span>
                {exp.company  && <span className="text-muted-foreground"> · {exp.company}</span>}
                {exp.duration && <span className="text-muted-foreground/50"> · {exp.duration}</span>}
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
            {profile.education.map((edu, i) => (
              <div key={i} className="text-[11px] font-mono">
                <span className="text-foreground">{edu.school}</span>
                {edu.degree && <span className="text-muted-foreground"> · {edu.degree}</span>}
                {edu.years  && <span className="text-muted-foreground/50"> · {edu.years}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills */}
      {profile.skills && profile.skills.length > 0 && (
        <div>
          <p className="text-[10px] font-mono text-muted-foreground mb-1.5 flex items-center gap-1">
            <Star className="w-3 h-3" /> SKILLS
          </p>
          <div className="flex flex-wrap gap-1">
            {profile.skills.map((skill, i) => (
              <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-300">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Contact info */}
      {(profile.phone || profile.email || profile.physical_address) && (
        <div className="space-y-0.5 border-t border-border/50 pt-2">
          {profile.phone && (
            <div className="flex items-center gap-2 text-[11px] font-mono text-foreground/80">
              <Phone className="w-3 h-3 text-blue-400 flex-shrink-0" />
              {profile.phone}
            </div>
          )}
          {profile.email && (
            <div className="flex items-center gap-2 text-[11px] font-mono text-foreground/80">
              <Mail className="w-3 h-3 text-blue-400 flex-shrink-0" />
              {profile.email}
            </div>
          )}
          {profile.physical_address && (
            <div className="flex items-center gap-2 text-[11px] font-mono text-foreground/80">
              <Home className="w-3 h-3 text-blue-400 flex-shrink-0" />
              {profile.physical_address}
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      {profile.notes && (
        <p className="text-[10px] font-mono text-muted-foreground/60 italic">{profile.notes}</p>
      )}
    </div>
  );
}

export default function LinkedInBotResults({ data }: Props) {
  const { profiles, search_notes } = data;

  return (
    <div className="bg-surface-2 border border-blue-500/30 rounded-md p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <ExternalLink className="w-4 h-4 text-blue-400" />
        <span className="text-[10px] font-mono tracking-wider text-blue-400">LINKEDIN BOT RESULTS</span>
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
