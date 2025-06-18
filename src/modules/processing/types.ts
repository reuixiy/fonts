// Processing module types
import type { FontChunk } from '@/types/font.js';

export interface FontSubsetConfig {
  targetChunkSize: number; // in KB
  outputFormat: 'woff2' | 'woff' | 'truetype';
  estimatedCharsPerKB: number; // Pre-calculated estimate
}

export interface ChunkWithBuffer extends Omit<FontChunk, 'filename'> {
  buffer: Buffer;
  path: string;
  filename: string;
  compressionRatio: string;
}

export interface FontMetrics {
  avgCharSize: number;
  baseSize: number;
}

export interface ProcessingResult {
  fontId: string;
  style: string;
  chunks: ChunkWithBuffer[];
  totalSize: number;
  metadata: ChunkMetadata;
}

export interface ChunkMetadata {
  fontId: string;
  displayName: string;
  generatedAt: string;
  chunks: Array<{
    chunkIndex: number;
    filename: string;
    style: string;
    size: number;
    unicodeRanges: string[];
    characterCount: number;
  }>;
  totalChunks: number;
  totalSize: number;
}

export interface ProcessingOptions {
  maxConcurrentFonts?: number;
  maxConcurrentChunks?: number;
  outputFormat?: 'woff2' | 'woff' | 'truetype';
  targetChunkSize?: number;
}

export interface CharacterExtractionResult {
  characters: string[];
  fontMetrics?: FontMetrics;
}
