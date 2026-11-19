/** lists-format.mjs 的 TypeScript 声明。 */
export interface ListBook {
  name: string;
  author: string;
  note: string;
  note_slug: string;
  note_title: string;
  detail: string;
}
export interface ParsedListRecord {
  id: string;
  kind: 'theme' | 'booklist';
  slug: string;
  title: string;
  description: string;
  tags: string[];
  updated: string;
  body: string;
  books: ListBook[];
  book_count: number;
  linked_notes: number;
  source_ref: { path: string; sha: string };
  content_hash: string;
}
export function listKind(filename: string): 'theme' | 'booklist' | null;
export function parseBookRows(body: string): ListBook[];
export function resolveBookLinks(books: ListBook[], notes: Array<{ slug: string; title: string; aliases: string[] }>): ListBook[];
export function buildListRecord(record: { text: string; sha: string }, relativePath: string, notes: Array<{ slug: string; title: string; aliases: string[] }>): ParsedListRecord | null;
