// Variable fonts configuration
import type { FontConfig } from '@/types/config.js';

export const variableFonts: Record<string, FontConfig> = {
  amstelvar: {
    name: 'Amstelvar',
    displayName: 'Amstelvar',
    source: {
      type: 'github-repo',
      owner: 'googlefonts',
      repo: 'amstelvar',
      url: 'https://github.com/googlefonts/amstelvar',
      files: [
        {
          path: 'fonts/Amstelvar-Roman[GRAD,XOPQ,XTRA,YOPQ,YTAS,YTDE,YTFI,YTLC,YTUC,wdth,wght,opsz].ttf',
          style: 'roman',
        },
        {
          path: 'fonts/Amstelvar-Italic[GRAD,YOPQ,YTAS,YTDE,YTFI,YTLC,YTUC,wdth,wght,opsz].ttf',
          style: 'italic',
        },
      ],
    },
    license: {
      type: 'SIL Open Font License 1.1',
      url: 'https://github.com/googlefonts/amstelvar/blob/main/OFL.txt',
    },
    type: 'variable',
    styles: ['roman', 'italic'],
    subset: {
      type: 'size-based-chunks',
      maxChunkSizeKB: 60,
    },
    output: {
      formats: ['woff2'],
      filenamePattern: 'amstelvar-{style}-chunk-{index}',
    },
    css: {
      fontStretch: '50% 125%',
      srcFormat:
        "url('../fonts/{fontId}/{filename}') format('woff2-variations'), url('../fonts/{fontId}/{filename}') format('woff2')",
    },
    variableAxes: [
      'GRAD',
      'XOPQ',
      'XTRA',
      'YOPQ',
      'YTAS',
      'YTDE',
      'YTFI',
      'YTLC',
      'YTUC',
      'wdth',
      'wght',
      'opsz',
    ],
  },
};
