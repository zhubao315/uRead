export interface BookNote { slug: string; title: string; category: string; audio: boolean; excerpt: string; source_path: string; }
export interface BookEntry {
  id: string;
  original_title: string;
  author: string;
  aliases: string[];
  source: 'booklist' | 'note';
  cover: string;
  format: string;
  library_book_id: string;
  notes: BookNote[];
  lists: Array<{ id: string; title: string; kind: string; recommendation: string; href: string }>;
}
export interface BookCatalog { books: BookEntry[]; summary: Record<string, number>; }
export function buildBookCatalog(notes: unknown[], lists: unknown[], libraryBooks?: unknown[]): BookCatalog;
export function renderBookIndex(books: BookEntry[], libraryBooks?: Array<{ id: string; title: string; author: string; format: string; cover: string }>): string;
export function renderBookDetail(book: BookEntry): string;
