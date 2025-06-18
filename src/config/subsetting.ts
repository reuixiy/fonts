// Subsetting configuration
export const subsettingConfig = {
  formats: ['woff2'] as const,
  compression: 'brotli' as const,
  hinting: true,
  desubroutinize: true,

  // Advanced subsetting options
  options: {
    unicodeRange: true,
    nameTableEntries: ['1', '2', '16', '17', '18'],
    dropHints: false,
    retainGIDs: false,

    // Size-based chunking defaults
    defaultChunkSize: 60, // KB
    minChunkSize: 20, // KB
    maxChunkSize: 200, // KB

    // Character priority settings
    priorityChars: {
      latin: 'U+0020-007F',
      punctuation: 'U+3000-303F,U+FF00-FFEF',
      numbers: 'U+0030-0039',
      spaces: 'U+0020,U+00A0,U+3000',
    },
  },
};
