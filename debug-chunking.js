#!/usr/bin/env node

import chalk from 'chalk';
import FontSubset from './src/fontSubset.js';
import fs from 'fs-extra';

async function debugChunking() {
  console.log(chalk.bold.blue('🔍 Debugging chunking issue...\n'));

  const fontSubset = new FontSubset();
  await fontSubset.init();

  // Load config
  const config = await fontSubset.loadConfig();
  const imingcpConfig = config.fonts.imingcp;

  console.log(chalk.yellow('Font config:'));
  console.log('  chunkSizes:', imingcpConfig.subset.chunkSizes);
  console.log('  maxChunks:', imingcpConfig.subset.maxChunks);
  console.log('  strategy:', imingcpConfig.subset.strategy);
  console.log('  priorityData:', imingcpConfig.subset.priorityData);

  // Load character frequency data
  const frequencyData = await fontSubset.loadCharacterFrequencyData();
  console.log(chalk.cyan('\nFrequency data keys:'), Object.keys(frequencyData));

  if (frequencyData['traditional-chinese-frequency']) {
    const tcData = frequencyData['traditional-chinese-frequency'];
    console.log(chalk.green('\nTraditional Chinese data:'));
    console.log('  critical ranges:', tcData.critical);
    console.log('  high_frequency count:', tcData.high_frequency.length);
    console.log(
      '  first 10 high freq chars:',
      tcData.high_frequency.slice(0, 10)
    );
  }

  // Test character expansion
  const testRange = 'U+0020-007F';
  const expanded = fontSubset.expandUnicodeRange(testRange);
  console.log(
    chalk.magenta(
      `\nTest range ${testRange} expands to ${expanded.length} characters`
    )
  );
  console.log(
    'First 10:',
    expanded
      .slice(0, 10)
      .map((c) => `'${c}'`)
      .join(', ')
  );

  // Test priority list creation
  console.log(chalk.yellow('\n📊 Testing priority list creation...'));
  const testChars = ['a', 'b', 'c', '一', '的', '是', '中', '國'];
  const prioritized = await fontSubset.createCharacterPriorityList(
    testChars,
    imingcpConfig.subset.strategy,
    imingcpConfig.subset.priorityData
  );
  console.log('Original:', testChars);
  console.log('Prioritized:', prioritized);

  // Test size estimation with mock font path (just to test logic)
  console.log(
    chalk.red(
      '\n⚠️  Note: Size estimation test skipped - requires actual font file'
    )
  );
  console.log(
    'The issue is likely in the chunk size estimation or loop termination logic.'
  );

  // Let's check the chunking logic manually
  console.log(chalk.blue('\n🔄 Simulating chunking logic...'));
  const chunkSizes = imingcpConfig.subset.chunkSizes;
  console.log('Target chunk sizes (KB):', chunkSizes);
  console.log('First target:', chunkSizes[0], 'KB');
  console.log(
    'Problem: If estimateChunkSize never reaches',
    chunkSizes[0],
    'KB, all chars go to chunk 0'
  );
}

debugChunking().catch(console.error);
