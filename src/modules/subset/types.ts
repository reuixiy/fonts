// Subset module types
import type { FontChunk } from '@/types/font.js';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Supported font file extensions for subsetting
 */
export const SUPPORTED_FONT_EXTENSIONS = ['.ttf', '.otf'] as const;
export type SupportedFontExtension = (typeof SUPPORTED_FONT_EXTENSIONS)[number];

/**
 * Font style detection patterns
 */
export const STYLE_PATTERNS = {
  italic: /italic/i,
  roman: /roman/i,
  bold: /bold/i,
  light: /light/i,
} as const;
export type FontStylePattern = keyof typeof STYLE_PATTERNS;

/**
 * CSS parsing regex patterns
 */
export const CSS_REGEX = {
  fontFace: /@font-face\s*{[^}]*}/g,
  src: /src:[^;]*url\(["']?\.\/([^"')]+)["']?\)[^;]*/,
  unicodeRange: /unicode-range:\s*([^;]+)/,
} as const;

// ============================================================================
// CORE TYPES
// ============================================================================

/**
 * Font style variants
 */
export type FontStyle = 'regular' | 'italic' | 'bold' | 'light' | string;

/**
 * File reference with optional style information
 */
export interface FontFile {
  path: string;
  style?: FontStyle;
}

/**
 * Download result structure
 */
export interface DownloadResult {
  files: FontFile[];
}

// ============================================================================
// CHUNK INTERFACES
// ============================================================================

/**
 * Extended chunk with file system information
 */
export interface Chunk extends FontChunk {
  /** Absolute file path to the chunk */
  path: string;
}

/**
 * Chunk information extracted from CSS
 */
export interface ChunkInfo {
  /** Chunk index/sequence number */
  index: number;
  /** Filename of the chunk file */
  filename: string;
  /** Unicode ranges covered by this chunk */
  unicodeRanges: string[];
  /** Estimated number of characters in this chunk */
  characterCount: number;
}

/**
 * Metadata entry for a single chunk
 */
export interface ChunkMetadataEntry {
  /** Index of the chunk */
  chunkIndex: number;
  /** Filename of the chunk file */
  filename: string;
  /** Font style (italic, bold, etc.) */
  style: FontStyle;
  /** Size in KB */
  size: number;
  /** Unicode ranges covered */
  unicodeRanges: string[];
  /** Number of characters */
  characterCount: number;
}

/**
 * Complete metadata for all chunks of a font
 */
export interface ChunksMetadata {
  /** Font identifier */
  fontId: string;
  /** Human-readable font name */
  displayName: string;
  /** ISO timestamp when chunks were generated */
  generatedAt: string;
  /** Array of chunk metadata */
  chunks: ChunkMetadataEntry[];
  /** Total number of chunks */
  totalChunks: number;
  /** Total size of all chunks in KB */
  totalSize: number;
}

// ============================================================================
// RESULT INTERFACES
// ============================================================================

/**
 * Result of font subsetting operation
 */
export interface SubsettingResult {
  /** Font identifier */
  fontId: string;
  /** Font style that was processed */
  style: FontStyle;
  /** Generated chunks */
  chunks: Chunk[];
  /** Total size of all chunks in KB */
  totalSize: number;
  /** Complete metadata */
  metadata: ChunksMetadata;
}

/**
 * Processing status for a single font
 */
export interface FontProcessingStatus {
  /** Font identifier */
  fontId: string;
  /** Processing status */
  status: 'pending' | 'processing' | 'completed' | 'failed';
  /** Error message if failed */
  error?: string;
  /** Number of chunks created */
  chunksCreated?: number;
  /** Total size processed in KB */
  totalSize?: number;
}

/**
 * Batch processing result
 */
export interface BatchProcessingResult {
  /** Successfully processed fonts */
  successful: string[];
  /** Failed fonts with error messages */
  failed: Array<{ fontId: string; error: string }>;
  /** Total processing time in milliseconds */
  processingTime: number;
  /** Summary statistics */
  stats: {
    totalFonts: number;
    totalChunks: number;
    totalSize: number;
  };
}
