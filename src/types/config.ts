// Configuration related types

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
  weight?: number | string;
  style?: string;
  type?: string;
  styles?: string[];
  subset: {
    type: 'size-based-chunks';
  };
  css?: {
    srcFormat?: string;
    fontStretch?: string;
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

export interface BuildConfig {
  outputDir: string;
  fontsDir: string;
  cssDir: string;
  tempDir: string;
  cacheDir: string;
  parallel: {
    enabled: boolean;
    maxWorkers: number;
  };
  cleanup: {
    tempFiles: boolean;
    oldBuilds: boolean;
  };
  validation: {
    strictMode: boolean;
    validateDownloads: boolean;
    validateChunks: boolean;
  };
}

export interface EnvironmentConfig {
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    colorize: boolean;
    timestamps: boolean;
  };
  cache: {
    enabled: boolean;
    ttl: number;
  };
  download: {
    retries: number;
    timeout: number;
  };
  processing: {
    skipExisting: boolean;
    validateOutput: boolean;
  };
}
