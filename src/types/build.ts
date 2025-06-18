// Build and output related types
import type { ChunkResult, CSSResult } from './common.js';

export type { ChunkResult, CSSResult };

export interface BuildMetadata {
  timestamp: string;
  version: string;
  processedFonts: string[];
  totalFiles: number;
  totalSize: number;
  compressionRatio: number;
}

export interface ProcessingMetadata {
  fontId: string;
  originalSize: number;
  processedSize: number;
  chunkCount: number;
  compressionRatio: number;
  processingTime: number;
}

export interface OutputStructure {
  fonts: Record<string, string[]>; // fontId -> chunk filenames
  css: Record<string, { original: string; minified: string }>;
  metadata: BuildMetadata;
}
