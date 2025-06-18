// Font related types
import type { FontConfig } from '@/types/config.js';

export type { FontConfig };

export interface FontMetadata {
  id: string;
  name: string;
  displayName: string;
  version: string;
  size: number;
  checksum: string;
  downloadedAt: string;
}

export interface FontChunk {
  index: number;
  filename: string;
  size: number;
  unicodeRanges: string[];
  characterCount: number;
  style?: string;
}
