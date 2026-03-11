// LexAgent - Legal Text Splitter
// Optimized for Korean legal documents

import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

// Korean legal text separators, ordered by priority
const LEGAL_SEPARATORS = [
  '\n\n',        // paragraph breaks
  '\n',          // line breaks
  '.\n',         // sentence end + newline
  '. ',          // sentence end
  ';\n',         // clause separator
  '; ',          // clause separator
  ' ',           // word break
];

const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 200;

// ─── Chunking Strategy ──────────────────────────────────────────────────────

export type ChunkingStrategy = 'default' | 'article' | 'sentence' | 'paragraph' | 'custom';

export interface ChunkingStrategyMeta {
  label: string;
  description: string;
  chunkSize: number;
  chunkOverlap: number;
}

export const CHUNKING_STRATEGIES: Record<ChunkingStrategy, ChunkingStrategyMeta> = {
  default: {
    label: '기본',
    description: '기본 (1000자/200 겹침)',
    chunkSize: 1000,
    chunkOverlap: 200,
  },
  article: {
    label: '조항별',
    description: '조항별 (조문 단위)',
    chunkSize: 1500,
    chunkOverlap: 0,
  },
  sentence: {
    label: '문장별',
    description: '문장별 (의미 단위)',
    chunkSize: 400,
    chunkOverlap: 50,
  },
  paragraph: {
    label: '단락별',
    description: '단락별 (문맥 보존)',
    chunkSize: 2000,
    chunkOverlap: 400,
  },
  custom: {
    label: '직접 설정',
    description: '직접 설정',
    chunkSize: DEFAULT_CHUNK_SIZE,
    chunkOverlap: DEFAULT_CHUNK_OVERLAP,
  },
};

// ─── Options & Splitter ──────────────────────────────────────────────────────

export interface SplitterOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  strategy?: ChunkingStrategy;
}

export function createLegalSplitter(options: SplitterOptions = {}): RecursiveCharacterTextSplitter {
  const { strategy } = options;

  let chunkSize: number;
  let chunkOverlap: number;
  let separators = LEGAL_SEPARATORS;

  if (strategy && strategy !== 'custom') {
    // Strategy presets take precedence
    const preset = CHUNKING_STRATEGIES[strategy];
    chunkSize = preset.chunkSize;
    chunkOverlap = preset.chunkOverlap;

    // Article strategy: split on article boundaries first
    if (strategy === 'article') {
      separators = ['\n\n제', ...LEGAL_SEPARATORS];
    }
  } else {
    // custom or no strategy: use explicit options with fallbacks
    chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
    chunkOverlap = options.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP;
  }

  return new RecursiveCharacterTextSplitter({
    separators,
    chunkSize,
    chunkOverlap,
    lengthFunction: (text: string) => text.length,
    keepSeparator: true,
  });
}

// ─── Text Preprocessing ──────────────────────────────────────────────────────

/**
 * Pre-process Korean legal text before splitting.
 * Preserves article numbers (제X조), clause markers (1., 가., (1)), etc.
 */
export function preprocessLegalText(text: string): string {
  // Normalize whitespace but keep paragraph breaks
  let processed = text.replace(/\r\n/g, '\n');
  processed = processed.replace(/\n{3,}/g, '\n\n');
  // Ensure article headers have paragraph breaks
  processed = processed.replace(/(?<!\n)(제\d+조(?:의\d+)?)/g, '\n\n$1');
  // Trim excessive spaces
  processed = processed.replace(/[ \t]+/g, ' ');
  return processed.trim();
}

// ─── Main Split Function ─────────────────────────────────────────────────────

export async function splitLegalText(
  text: string,
  options: SplitterOptions = {}
): Promise<string[]> {
  const preprocessed = preprocessLegalText(text);
  const splitter = createLegalSplitter(options);
  const docs = await splitter.createDocuments([preprocessed]);
  return docs.map((doc: { pageContent: string }) => doc.pageContent);
}
