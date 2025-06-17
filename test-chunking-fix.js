#!/usr/bin/env node

import chalk from 'chalk';
import FontSubset from './src/fontSubset.js';
import fs from 'fs-extra';

async function testChunkingLogic() {
  console.log(chalk.bold.blue('🧪 Testing chunking logic fix...\n'));

  const fontSubset = new FontSubset();
  await fontSubset.init();

  // Load config
  const config = await fontSubset.loadConfig();
  const imingcpConfig = config.fonts.imingcp;

  // Create mock characters (simulate a font with many characters)
  const mockCharacters = [];

  // Add Latin characters
  for (let i = 32; i <= 126; i++) {
    mockCharacters.push(String.fromCharCode(i));
  }

  // Add some Chinese characters
  const chineseChars = [
    '一',
    '的',
    '是',
    '在',
    '人',
    '有',
    '我',
    '他',
    '這',
    '個',
    '們',
    '來',
    '到',
    '時',
    '大',
    '地',
    '為',
    '子',
    '中',
    '你',
    '說',
    '生',
    '國',
    '年',
    '著',
    '就',
    '那',
    '和',
    '要',
    '她',
    '看',
    '天',
    '時',
    '過',
    '出',
    '小',
    '麼',
    '起',
    '你',
    '都',
    '把',
    '好',
    '還',
    '多',
    '沒',
    '為',
    '又',
    '可',
    '家',
    '學',
    '只',
    '以',
    '主',
    '會',
    '樣',
    '年',
    '想',
    '生',
    '同',
    '老',
    '中',
    '十',
    '從',
    '自',
    '面',
    '前',
    '頭',
    '道',
    '它',
    '後',
    '然',
    '走',
    '很',
    '像',
    '見',
    '兩',
    '用',
    '她',
    '國',
    '動',
    '進',
    '成',
    '回',
    '什',
    '邊',
    '作',
    '對',
    '開',
    '而',
    '己',
    '些',
    '現',
    '山',
    '民',
    '候',
    '經',
    '發',
    '工',
    '向',
    '事',
    '命',
    '給',
    '長',
    '水',
    '幾',
    '義',
    '三',
    '聲',
    '於',
    '高',
    '手',
    '知',
    '理',
    '眼',
    '志',
    '點',
    '心',
    '戰',
    '二',
    '問',
    '但',
    '身',
    '方',
    '實',
    '吃',
    '做',
    '叫',
    '當',
    '住',
    '聽',
    '革',
    '打',
    '呢',
    '真',
    '全',
    '才',
    '四',
    '已',
    '所',
    '敵',
    '之',
    '最',
    '光',
    '產',
    '情',
    '路',
    '分',
    '總',
    '條',
    '白',
    '話',
    '東',
    '席',
    '次',
    '親',
    '如',
    '被',
    '花',
    '口',
    '放',
    '兒',
    '常',
    '氣',
    '五',
    '第',
    '使',
    '寫',
    '軍',
    '吧',
    '文',
    '運',
    '再',
    '果',
    '怎',
    '定',
    '許',
    '快',
    '明',
    '行',
    '因',
    '別',
    '飛',
    '外',
    '樹',
    '物',
    '活',
    '部',
    '門',
    '無',
    '往',
    '船',
    '望',
    '新',
    '帶',
    '隊',
    '先',
    '力',
    '完',
    '卻',
    '站',
    '代',
    '員',
    '機',
    '更',
    '九',
    '您',
    '每',
    '風',
    '級',
    '跟',
    '笑',
    '啊',
    '孩',
    '萬',
    '少',
    '直',
    '意',
    '夜',
    '比',
    '階',
    '連',
    '車',
    '重',
    '便',
    '鬥',
    '馬',
    '哪',
    '化',
    '太',
    '指',
    '變',
    '社',
    '似',
    '士',
    '者',
    '干',
    '石',
    '滿',
    '日',
    '決',
    '百',
    '原',
    '拿',
    '群',
    '究',
    '各',
    '六',
    '本',
    '思',
    '解',
    '立',
    '河',
    '村',
    '八',
    '難',
    '早',
    '論',
    '嗎',
    '根',
    '共',
    '讓',
    '相',
    '研',
    '今',
    '其',
    '書',
    '坐',
    '接',
    '應',
    '關',
    '信',
    '覺',
    '步',
    '反',
    '處',
    '記',
    '將',
    '千',
    '找',
    '爭',
    '領',
    '或',
    '師',
    '結',
    '塊',
    '跑',
    '誰',
    '草',
    '越',
    '字',
    '加',
    '腳',
    '緊',
    '愛',
    '等',
    '習',
    '陣',
    '怕',
    '月',
    '青',
    '半',
    '火',
    '法',
    '題',
    '建',
    '趕',
    '位',
    '唱',
    '海',
    '七',
    '女',
    '任',
    '件',
    '感',
    '準',
    '張',
    '團',
    '屋',
    '離',
    '色',
    '臉',
    '片',
    '科',
    '倒',
    '睛',
    '利',
    '世',
    '剛',
    '且',
    '由',
    '送',
    '切',
    '星',
    '導',
    '晚',
    '表',
    '夠',
    '整',
    '認',
    '響',
    '雪',
    '流',
    '未',
    '場',
    '該',
    '並',
    '底',
    '深',
  ];

  mockCharacters.push(...chineseChars);

  console.log(
    chalk.yellow(`📊 Mock characters: ${mockCharacters.length} total`)
  );
  console.log(chalk.gray(`   Latin: 95, Chinese: ${chineseChars.length}`));

  // Mock the estimateChunkSize method to return predictable values
  const originalEstimate = fontSubset.estimateChunkSize;
  fontSubset.estimateChunkSize = async function (fontPath, characters) {
    // Simulate: Chinese chars = 2KB each, Latin = 0.5KB each
    let size = 0;
    for (const char of characters) {
      if (char.charCodeAt(0) > 127) {
        size += 2; // Chinese character
      } else {
        size += 0.5; // Latin character
      }
    }
    return Math.round(size);
  };

  // Test priority list creation
  const prioritized = await fontSubset.createCharacterPriorityList(
    mockCharacters,
    imingcpConfig.subset.strategy,
    imingcpConfig.subset.priorityData
  );

  console.log(chalk.cyan(`\n📋 Prioritized characters: ${prioritized.length}`));

  // Test chunking with mock font path
  const mockFontPath = '/mock/font.ttf';

  // Simulate chunking logic
  console.log(chalk.blue('\n🔄 Testing chunking logic...'));
  const chunks = [];
  const chunkSizes = imingcpConfig.subset.chunkSizes;
  let currentChunk = [];
  let chunkIndex = 0;
  const maxCharactersPerChunk = Math.ceil(
    prioritized.length /
      Math.min(imingcpConfig.subset.maxChunks, chunkSizes.length)
  );

  console.log(
    chalk.gray(
      `    📊 Total characters: ${prioritized.length}, max per chunk: ${maxCharactersPerChunk}`
    )
  );

  for (const char of prioritized.slice(0, 200)) {
    // Test with first 200 chars
    currentChunk.push(char);

    const currentSize = await fontSubset.estimateChunkSize(
      mockFontPath,
      currentChunk
    );
    const targetSize =
      chunkSizes[chunkIndex] || chunkSizes[chunkSizes.length - 1];

    const shouldFinalizeBySize = currentSize >= targetSize;
    const shouldFinalizeByCount = currentChunk.length >= maxCharactersPerChunk;
    const isLastChunk = chunkIndex >= imingcpConfig.subset.maxChunks - 1;

    const shouldFinalize =
      (shouldFinalizeBySize || shouldFinalizeByCount || isLastChunk) &&
      (currentChunk.length >= 10 || isLastChunk);

    if (shouldFinalize) {
      const unicodeRanges = fontSubset.calculateUnicodeRanges(currentChunk);
      chunks.push({
        index: chunkIndex,
        characters: [...currentChunk],
        unicodeRanges,
        targetSize: targetSize,
      });

      console.log(
        chalk.green(
          `    ✅ Chunk ${chunkIndex}: ${currentChunk.length} characters, ` +
            `estimated ${currentSize}KB, target ${targetSize}KB ` +
            `(${
              shouldFinalizeBySize
                ? 'size'
                : shouldFinalizeByCount
                ? 'count'
                : 'forced'
            })`
        )
      );

      currentChunk = [];
      chunkIndex++;

      if (chunkIndex >= imingcpConfig.subset.maxChunks || chunks.length >= 5) {
        break; // Limit test output
      }
    }
  }

  // Add remaining characters to final chunk if any
  if (currentChunk.length > 0) {
    const currentSize = await fontSubset.estimateChunkSize(
      mockFontPath,
      currentChunk
    );
    const targetSize =
      chunkSizes[chunkIndex] || chunkSizes[chunkSizes.length - 1];
    chunks.push({
      index: chunkIndex,
      characters: currentChunk,
      unicodeRanges: fontSubset.calculateUnicodeRanges(currentChunk),
      targetSize: targetSize,
    });
    console.log(
      chalk.green(
        `    ✅ Final chunk ${chunkIndex}: ${currentChunk.length} characters, estimated ${currentSize}KB`
      )
    );
  }

  console.log(
    chalk.bold.green(`\n🎉 Result: Generated ${chunks.length} chunks!`)
  );

  if (chunks.length > 1) {
    console.log(chalk.green('✅ Chunking logic is working correctly!'));
  } else {
    console.log(
      chalk.red(
        '❌ Still only generating one chunk - more investigation needed'
      )
    );
  }
}

testChunkingLogic().catch(console.error);
