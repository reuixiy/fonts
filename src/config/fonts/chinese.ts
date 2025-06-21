// Chinese fonts configuration
import type { FontConfig } from '@/types/config.js';

export const chineseFonts: Record<string, FontConfig> = {
  imingcp: {
    name: 'I.MingCP',
    displayName: 'I.MingCP',
    source: {
      type: 'github-release',
      owner: 'ichitenfont',
      repo: 'I.Ming',
      filePattern: 'I.MingCP-{version}.ttf',
      url: 'https://github.com/ichitenfont/I.Ming',
    },
    license: {
      type: 'IPA Font License Agreement v1.0',
      url: 'https://github.com/ichitenfont/I.Ming/blob/master/LICENSE.md',
    },
    weight: 400,
    style: 'normal',
    subset: {
      type: 'size-based-chunks',
    },
    css: {
      srcFormat: "url('../fonts/{fontId}/{filename}') format('woff2')",
    },
  },
  lxgwwenkaitc: {
    name: 'LXGWWenKaiTC',
    displayName: 'LXGW WenKai TC',
    source: {
      type: 'github-release',
      owner: 'lxgw',
      repo: 'LxgwWenkaiTC',
      filePattern: 'LXGWWenKaiTC-Light.ttf',
      url: 'https://github.com/lxgw/LxgwWenkaiTC',
    },
    license: {
      type: 'SIL Open Font License 1.1',
      url: 'https://github.com/lxgw/LxgwWenkaiTC/blob/main/OFL.txt',
    },
    weight: 300,
    style: 'normal',
    subset: {
      type: 'size-based-chunks',
    },
    css: {
      srcFormat: "url('../fonts/{fontId}/{filename}') format('woff2')",
    },
  },
};
