export interface BaselineCounts {
  [key: string]: number;
}
export interface HashItem {
  id?: string;
  file?: string;
  hash: string;
}
export interface ContentSnapshot {
  counts: BaselineCounts;
  hashes: { notes?: HashItem[]; lists?: HashItem[]; audio?: HashItem[] };
}
export function compareBaseline(current: ContentSnapshot, baseline: ContentSnapshot): string[];
