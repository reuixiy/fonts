// Common shared types

export interface UpdatedFont {
  id: string;
  name: string;
  oldVersion: string;
  newVersion: string;
  publishedAt: string | null | undefined;
}

export interface ChunkResult {
  chunkIndex: number;
  path: string;
  filename: string;
  size: number;
  compressionRatio: string | number;
  unicodeRanges: string[];
  characterCount: number;
  style?: string;
}

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
