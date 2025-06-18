// CSS module types
import type { FontChunk } from '@/types/font.js';

export interface CSSResult {
  path: string;
  filename: string;
  size: number;
  minified?: {
    path: string;
    filename: string;
    size: number;
  };
}

export interface FontFaceRule {
  fontFamily: string;
  src: string;
  fontDisplay: string;
  fontStyle: string;
  fontWeight: string | number;
  fontStretch?: string;
  unicodeRange: string;
}

export interface ChunkWithUnicodeRanges extends FontChunk {
  unicodeRanges: string[];
  style?: string;
}

export interface FontProcessingResult {
  chunks: ChunkWithUnicodeRanges[];
  style?: string;
}

export interface ProcessingMetadata {
  chunks: Array<{
    chunkIndex: number;
    filename: string;
    size: number;
    unicodeRanges?: string[];
    characterCount?: number;
    style?: string;
  }>;
}

export interface CSSGenerationOptions {
  baseUrl?: string;
  minify?: boolean;
  outputDir?: string;
}

export interface AllResults {
  [fontId: string]: FontProcessingResult[] | { error: string };
}

export type CSSTemplate = 'standard' | 'modern' | 'custom';

export interface CSSGeneratorConfig {
  outputDir: string;
  cssDir: string;
  template: CSSTemplate;
  minify: boolean;
  baseUrl: string;
}
