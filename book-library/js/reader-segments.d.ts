export interface BookBlock { range: Range; text: string }
export interface BookSegment { text: string; range: Range }

export function cleanText(value: string): string;
export function getBlockRanges(doc: Document): BookBlock[];
export function findBlockIndex(blocks: BookBlock[], anchorRange: Range | null): number;
export function segmentBlock(
  doc: Document,
  blockRange: Range,
  lang?: string,
  options?: { min?: number; max?: number },
): BookSegment[];
