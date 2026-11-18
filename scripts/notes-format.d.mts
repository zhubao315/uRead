/** notes-format.mjs 的 TypeScript 声明：测试与脚本用同一份实现，不另写一套类型。 */

export interface FrontmatterMeta {
  [key: string]: string | string[];
}

export interface ParsedFrontmatter {
  meta: FrontmatterMeta;
  body: string;
  hasFrontmatter: boolean;
}

export interface NoteRecord {
  text: string;
  sha: string;
}

export interface PublicNoteRecord {
  slug: string;
  title: string;
  author: string;
  category: string;
  created: string;
  updated: string;
  source: string;
  status: string;
  tags: string[];
  aliases: string[];
  body: string;
  source_ref: { path: string; sha: string; url: string };
  content_hash: string;
  audio: boolean;
}

export function parseFrontmatter(text: string): ParsedFrontmatter;
export function slugFor(relativePath: string): string;
export function publicNote(record: NoteRecord, relativePath: string): PublicNoteRecord;
export function narrationText(markdown: string): string;
export function splitForTts(text: string, maxChars?: number): string[];
export function concatWav(buffers: Buffer[]): Buffer;
export function contentsUrl(repo: string, notePath: string, branch: string, relative: string): string;
export function audioName(contentHash: string): string;
