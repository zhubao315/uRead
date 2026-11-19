export interface PublishPolicy {
  version: number;
  mode: 'allowlist' | 'allow_all_legacy' | string;
  allow?: string[];
  deny?: string[];
  category_allow?: string[];
  tag_deny?: string[];
  sensitive_patterns?: Array<{ name: string; pattern: string }>;
  require_approval?: boolean;
}
export interface PublishNote {
  slug: string;
  title: string;
  body: string;
  tags?: string[];
  category?: string;
}
export function isNoteAllowed(note: PublishNote, policy: PublishPolicy): boolean;
export function scanSensitive(note: PublishNote, policy: PublishPolicy): Array<{ rule: string; slug: string; offset: number }>;
export function evaluate(notes: PublishNote[], policy: PublishPolicy): {
  mode: string;
  total: number;
  allowed: string[];
  blocked: Array<{ slug: string; reason: string }>;
  sensitive: Array<{ rule: string; slug: string; offset: number }>;
};
export function audioOrphans(audioFiles: string[], allowedSlugs: string[], hashToSlug: Record<string, string>): string[];
