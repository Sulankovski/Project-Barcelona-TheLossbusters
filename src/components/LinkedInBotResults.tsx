import { MapPin, Briefcase, GraduationCap, Star, ExternalLink, User } from "lucide-react";

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

interface LinkedInData {
  name?: string;
  headline?: string;
  location?: string;
  current_company?: string;
  profile_url?: string;
  about?: string;
  experience?: Experience[];
  education?: Education[];
  skills?: string[];
  connections?: string;
  notes?: string;
}

interface Props {
  data: LinkedInData;
}

export default function LinkedInBotResults({ data }: Props) {
  return (
    <div className="bg-surface-2 border border-blue-500/30 rounded-md p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <ExternalLink className="w-4 h-4 text-blue-400" />
        <span className="text-[10px] font-mono tracking-wider text-blue-400">LINKEDIN BOT RESULTS</span>
        {data.profile_url && (
          <a
            href={data.profile_url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-blue-400 transition-colors"
          >
            View Profile <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Identity */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
          <User className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          {data.name && (
            <h2 className="text-sm font-mono font-bold text-foreground">{data.name}</h2>
          )}
          {data.headline && (
            <p className="text-xs font-mono text-muted-foreground mt-0.5">{data.headline}</p>
          )}
          <div className="flex flex-wrap gap-3 mt-1.5">
            {data.location && (
              <span className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                <MapPin className="w-3 h-3" /> {data.location}
              </span>
            )}
            {data.current_company && (
              <span className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                <Briefcase className="w-3 h-3" /> {data.current_company}
              </span>
            )}
            {data.connections && (
              <span className="text-[11px] font-mono text-blue-400">{data.connections} connections</span>
            )}
          </div>
        </div>
      </div>

      {/* About */}
      {data.about && (
        <div>
          <p className="text-[10px] font-mono text-muted-foreground mb-1.5 uppercase tracking-wider">About</p>
          <p className="text-xs font-mono text-foreground/80 leading-relaxed">{data.about}</p>
        </div>
      )}

      {/* Experience */}
      {data.experience && data.experience.length > 0 && (
        <div>
          <p className="text-[10px] font-mono text-muted-foreground mb-2 uppercase tracking-wider flex items-center gap-1">
            <Briefcase className="w-3 h-3" /> Experience
          </p>
          <div className="space-y-2">
            {data.experience.map((exp, i) => (
              <div key={i} className="border-l-2 border-blue-500/30 pl-3">
                <p className="text-xs font-mono font-medium text-foreground">{exp.title}</p>
                {exp.company && (
                  <p className="text-[11px] font-mono text-muted-foreground">{exp.company}</p>
                )}
                {exp.duration && (
                  <p className="text-[10px] font-mono text-muted-foreground/60">{exp.duration}</p>
                )}
                {exp.description && (
                  <p className="text-[11px] font-mono text-foreground/60 mt-1">{exp.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {data.education && data.education.length > 0 && (
        <div>
          <p className="text-[10px] font-mono text-muted-foreground mb-2 uppercase tracking-wider flex items-center gap-1">
            <GraduationCap className="w-3 h-3" /> Education
          </p>
          <div className="space-y-2">
            {data.education.map((edu, i) => (
              <div key={i} className="border-l-2 border-blue-500/30 pl-3">
                <p className="text-xs font-mono font-medium text-foreground">{edu.school}</p>
                {edu.degree && (
                  <p className="text-[11px] font-mono text-muted-foreground">{edu.degree}</p>
                )}
                {edu.years && (
                  <p className="text-[10px] font-mono text-muted-foreground/60">{edu.years}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills */}
      {data.skills && data.skills.length > 0 && (
        <div>
          <p className="text-[10px] font-mono text-muted-foreground mb-2 uppercase tracking-wider flex items-center gap-1">
            <Star className="w-3 h-3" /> Skills
          </p>
          <div className="flex flex-wrap gap-1.5">
            {data.skills.map((skill, i) => (
              <span
                key={i}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-300"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {data.notes && (
        <div className="bg-surface-3 border border-border rounded p-3">
          <p className="text-[10px] font-mono text-muted-foreground mb-1 uppercase tracking-wider">Agent Notes</p>
          <p className="text-xs font-mono text-foreground/70">{data.notes}</p>
        </div>
      )}
    </div>
  );
}
