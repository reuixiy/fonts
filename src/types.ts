// Global type definitions

export interface UpdatedFont {
  id: string;
  name: string;
  oldVersion: string;
  newVersion: string;
  publishedAt: string | null | undefined;
}

export interface VersionCheckResult {
  hasUpdates: boolean;
  updatedFonts: UpdatedFont[];
  currentVersions: Record<string, string>;
}

export interface FontConfig {
  name: string;
  displayName: string;
  source: {
    type: string;
    owner: string;
    repo: string;
    filePattern?: string;
    url: string;
    files?: Array<{
      path: string;
      style: string;
    }>;
  };
  license: {
    type: string;
    url: string;
  };
  weight?: number;
  style?: string;
  type?: string;
  styles?: string[];
  subset: {
    type: string;
    strategy: string;
    chunkSizes: number[];
    maxChunks: number;
    ensureCompleteCoverage: boolean;
    priorityData: string;
  };
  output: {
    formats: string[];
    filenamePattern: string;
  };
  css?: {
    fontStretch?: string;
    srcFormat?: string;
  };
  variableAxes?: string[];
}

export interface FontsConfig {
  fonts: Record<string, FontConfig>;
  build: {
    outputDir: string;
    fontsDir: string;
    cssDir: string;
  };
  subsetting: {
    formats: string[];
    compression: string;
    hinting: boolean;
    desubroutinize: boolean;
  };
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

export interface VersionCache {
  [fontId: string]: {
    version: string;
    publishedAt?: string | null;
  };
}

export interface GitHubReleaseInfo {
  version: string;
  publishedAt: string | null;
  downloadUrl: string | null;
}

export interface GitHubCommitInfo {
  version: string;
  publishedAt: string | null;
  message: string;
}
