// Build configuration
import type { BuildConfig } from '@/types/config.js';

export const buildConfig: BuildConfig = {
  outputDir: 'build',
  fontsDir: 'fonts',
  cssDir: 'css',
  tempDir: 'temp',
  cacheDir: '.cache',

  parallel: {
    enabled: true,
    maxWorkers: 4,
  },

  cleanup: {
    tempFiles: true,
    oldBuilds: false,
  },

  validation: {
    strictMode: true,
    validateDownloads: true,
    validateChunks: true,
  },
};
