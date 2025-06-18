// Combined font configurations
import type { FontsConfig } from '@/types/config.js';
import { chineseFonts } from './chinese.js';
import { englishFonts } from './english.js';
import { variableFonts } from './variable.js';

// Combine all font configurations
export const allFonts = {
  ...chineseFonts,
  ...englishFonts,
  ...variableFonts,
};

// Export individual font collections
export { chineseFonts, englishFonts, variableFonts };

// Default fonts configuration
export const fontsConfig: FontsConfig = {
  fonts: allFonts,
  build: {
    outputDir: 'build',
    fontsDir: 'fonts',
    cssDir: 'css',
  },
  subsetting: {
    formats: ['woff2'],
    compression: 'brotli',
    hinting: true,
    desubroutinize: true,
  },
};
