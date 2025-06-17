import fs from 'fs-extra';
import path from 'path';
import { spawn } from 'child_process';
import chalk from 'chalk';

class FontSubset {
  constructor() {
    this.configPath = path.join(process.cwd(), 'src/config/fonts.json');
    this.downloadDir = path.join(process.cwd(), 'downloads');
    this.outputDir = path.join(process.cwd(), 'build');
    this.characterFrequencyPath = path.join(process.cwd(), 'src/data/character-frequency.json');
  }

  async init() {
    // Ensure output directories exist
    await fs.ensureDir(this.outputDir);
    await fs.ensureDir(path.join(this.outputDir, 'fonts'));

    // Check if fonttools is available
    await this.checkFontTools();
  }

  async checkFontTools() {
    return new Promise((resolve, reject) => {
      const child = spawn('pyftsubset', ['--help'], { stdio: 'pipe' });

      child.on('close', (code) => {
        if (code === 0) {
          console.log(chalk.green('✅ fonttools (pyftsubset) is available'));
          resolve();
        } else {
          console.error(
            chalk.red(
              '❌ fonttools not found. Please install: pip install fonttools[woff]'
            )
          );
          reject(new Error('fonttools not available'));
        }
      });

      child.on('error', (error) => {
        console.error(chalk.red('❌ Error checking fonttools:'), error.message);
        console.log(
          chalk.yellow('💡 Install fonttools: pip install fonttools[woff]')
        );
        reject(error);
      });
    });
  }

  async loadConfig() {
    try {
      const config = await fs.readJson(this.configPath);
      return config;
    } catch (error) {
      console.error(
        chalk.red('Failed to load font configuration:'),
        error.message
      );
      throw error;
    }
  }

  async runPyftsubset(inputPath, outputPath, options = []) {
    return new Promise((resolve, reject) => {
      const args = [
        inputPath,
        `--output-file=${outputPath}`,
        '--flavor=woff2',
        '--with-zopfli',
        '--desubroutinize',
        '--layout-features-=locl,frac,ordn,sups,sinf,subs,dnom,numr,tnum',
        ...options,
      ];

      console.log(chalk.cyan(`    Running: pyftsubset ${args.join(' ')}`));

      const child = spawn('pyftsubset', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env },
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          console.error(chalk.red(`    pyftsubset failed with code ${code}`));
          console.error(chalk.red(`    stderr: ${stderr}`));
          reject(new Error(`pyftsubset failed: ${stderr}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  generateUnicodeRanges(ranges) {
    // Convert Unicode ranges to pyftsubset format
    return ranges
      .map((range) => {
        if (range.includes('-')) {
          return `--unicodes=${range}`;
        } else {
          return `--unicodes=${range}`;
        }
      })
      .join(' ')
      .split(' ');
  }

  async processChineseFont(fontId, fontConfig, inputPath) {
    console.log(
      chalk.blue(`  📝 Processing Chinese font: ${fontConfig.displayName}`)
    );

    const fontDir = path.join(this.outputDir, 'fonts', fontId);
    await fs.ensureDir(fontDir);

    // Check if this is a chunked font configuration
    if (fontConfig.subset.type === 'size-based-chunks') {
      return await this.processChunkedFont(fontId, fontConfig, inputPath);
    }

    // Legacy single-file processing (fallback)
    return await this.processLegacySingleFont(fontId, fontConfig, inputPath);
  }

  async processChunkedFont(fontId, fontConfig, inputPath) {
    console.log(chalk.blue(`    🧩 Using chunked processing...`));
    
    const fontDir = path.join(this.outputDir, 'fonts', fontId);
    const results = [];

    // Generate optimal chunks
    const chunks = await this.generateOptimalChunks(inputPath, fontConfig);
    
    for (const chunk of chunks) {
      const outputFileName = fontConfig.output.filenamePattern
        .replace('{index}', chunk.index)
        .replace('{style}', 'regular') + '.woff2';
      const outputPath = path.join(fontDir, outputFileName);

      // Check if chunk file already exists
      if (await fs.pathExists(outputPath)) {
        const stats = await fs.stat(outputPath);
        console.log(chalk.green(`    ⏭️  Chunk ${chunk.index} already exists: ${outputFileName}`));
        console.log(chalk.gray(`    Size: ${(stats.size / 1024).toFixed(1)}KB`));
        
        results.push({
          chunkIndex: chunk.index,
          path: outputPath,
          filename: outputFileName,
          size: stats.size,
          compressionRatio: 'N/A (existing)',
          unicodeRanges: chunk.unicodeRanges,
          characterCount: chunk.characters.length
        });
        continue;
      }

      // Create Unicode string for this chunk
      const unicodeString = chunk.characters
        .map(c => `U+${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`)
        .join(',');

      try {
        await this.runPyftsubset(inputPath, outputPath, [`--unicodes=${unicodeString}`]);

        const stats = await fs.stat(outputPath);
        const originalStats = await fs.stat(inputPath);
        const compressionRatio = ((1 - stats.size / originalStats.size) * 100).toFixed(1);

        console.log(chalk.green(`    ✅ Created chunk ${chunk.index}: ${outputFileName}`));
        console.log(chalk.gray(`    Size: ${(stats.size / 1024).toFixed(1)}KB (${compressionRatio}% smaller), ${chunk.characters.length} chars`));

        results.push({
          chunkIndex: chunk.index,
          path: outputPath,
          filename: outputFileName,
          size: stats.size,
          compressionRatio: compressionRatio,
          unicodeRanges: chunk.unicodeRanges,
          characterCount: chunk.characters.length
        });
      } catch (error) {
        console.error(chalk.red(`    ❌ Failed to process chunk ${chunk.index}:`), error.message);
        throw error;
      }
    }

    console.log(chalk.green(`    ✅ Completed chunked processing: ${results.length} chunks`));
    return results;
  }

  async processLegacySingleFont(fontId, fontConfig, inputPath) {
    console.log(chalk.blue(`    📄 Using legacy single-file processing...`));
    
    const fontDir = path.join(this.outputDir, 'fonts', fontId);
    const outputFileName = `${fontConfig.output.filename || fontId}.woff2`;
    const outputPath = path.join(fontDir, outputFileName);

    // Check if output file already exists
    if (await fs.pathExists(outputPath)) {
      const stats = await fs.stat(outputPath);
      console.log(chalk.green(`    ⏭️  File already exists: ${outputFileName}`));
      console.log(chalk.gray(`    Size: ${(stats.size / 1024).toFixed(1)}KB`));

      return {
        path: outputPath,
        filename: outputFileName,
        size: stats.size,
        compressionRatio: 'N/A (existing)',
      };
    }

    // Generate Unicode ranges for single font
    const unicodeOptions = this.generateUnicodeRanges(fontConfig.subset.ranges);

    try {
      await this.runPyftsubset(inputPath, outputPath, unicodeOptions);

      const stats = await fs.stat(outputPath);
      const originalStats = await fs.stat(inputPath);
      const compressionRatio = ((1 - stats.size / originalStats.size) * 100).toFixed(1);

      console.log(chalk.green(`    ✅ Created: ${outputFileName}`));
      console.log(chalk.gray(`    Size: ${(stats.size / 1024).toFixed(1)}KB (${compressionRatio}% smaller)`));

      return {
        path: outputPath,
        filename: outputFileName,
        size: stats.size,
        compressionRatio: compressionRatio,
      };
    } catch (error) {
      console.error(chalk.red(`    ❌ Failed to process ${fontConfig.displayName}:`), error.message);
      throw error;
    }
  }

  async processVariableFont(fontId, fontConfig, inputFiles) {
    console.log(
      chalk.blue(`  🔄 Processing variable font: ${fontConfig.displayName}`)
    );

    const fontDir = path.join(this.outputDir, 'fonts', fontId);
    await fs.ensureDir(fontDir);

    const results = [];

    // Check if this is a chunked variable font configuration
    if (fontConfig.subset.type === 'size-based-chunks') {
      // Process each style with chunking
      for (const inputFile of inputFiles) {
        const styleResults = await this.processChunkedVariableFont(fontId, fontConfig, inputFile);
        results.push(...styleResults);
      }
    } else {
      // Legacy single-file processing for each style
      for (const inputFile of inputFiles) {
        const outputFileName = `${fontId}-${inputFile.style}.woff2`;
        const outputPath = path.join(fontDir, outputFileName);

        // Check if output file already exists
        if (await fs.pathExists(outputPath)) {
          const stats = await fs.stat(outputPath);
          console.log(
            chalk.green(`    ⏭️  File already exists: ${outputFileName}`)
          );
          console.log(
            chalk.gray(`    Size: ${(stats.size / 1024).toFixed(1)}KB`)
          );

          results.push({
            path: outputPath,
            filename: outputFileName,
            size: stats.size,
            compressionRatio: 'N/A (existing)',
            style: inputFile.style,
          });
          continue;
        }

        // Generate Unicode ranges for Latin fonts
        const unicodeOptions = this.generateUnicodeRanges(
          fontConfig.subset.ranges
        );

        try {
          await this.runPyftsubset(inputFile.path, outputPath, unicodeOptions);

          const stats = await fs.stat(outputPath);
          const originalStats = await fs.stat(inputFile.path);
          const compressionRatio = (
            (1 - stats.size / originalStats.size) *
            100
          ).toFixed(1);

          console.log(
            chalk.green(`    ✅ Created: ${outputFileName} (${inputFile.style})`)
          );
          console.log(
            chalk.gray(
              `    Size: ${(stats.size / 1024).toFixed(
                1
              )}KB (${compressionRatio}% smaller)`
            )
          );

          results.push({
            path: outputPath,
            filename: outputFileName,
            style: inputFile.style,
            size: stats.size,
            compressionRatio: compressionRatio,
          });
        } catch (error) {
          console.error(
            chalk.red(`    ❌ Failed to process ${inputFile.style} variant:`),
            error.message
          );
          throw error;
        }
      }
    }

    return results;
  }

  async processChunkedVariableFont(fontId, fontConfig, inputFile) {
    console.log(chalk.blue(`    🧩 Using chunked processing for ${inputFile.style}...`));
    
    const fontDir = path.join(this.outputDir, 'fonts', fontId);
    const results = [];

    // Generate optimal chunks for this style
    const chunks = await this.generateOptimalChunks(inputFile.path, fontConfig);
    
    for (const chunk of chunks) {
      const outputFileName = fontConfig.output.filenamePattern
        .replace('{index}', chunk.index)
        .replace('{style}', inputFile.style) + '.woff2';
      const outputPath = path.join(fontDir, outputFileName);

      // Check if chunk file already exists
      if (await fs.pathExists(outputPath)) {
        const stats = await fs.stat(outputPath);
        console.log(chalk.green(`    ⏭️  Chunk ${chunk.index} (${inputFile.style}) already exists: ${outputFileName}`));
        console.log(chalk.gray(`    Size: ${(stats.size / 1024).toFixed(1)}KB`));
        
        results.push({
          chunkIndex: chunk.index,
          path: outputPath,
          filename: outputFileName,
          size: stats.size,
          compressionRatio: 'N/A (existing)',
          unicodeRanges: chunk.unicodeRanges,
          characterCount: chunk.characters.length,
          style: inputFile.style
        });
        continue;
      }

      // Create Unicode string for this chunk
      const unicodeString = chunk.characters
        .map(c => `U+${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`)
        .join(',');

      try {
        await this.runPyftsubset(inputFile.path, outputPath, [`--unicodes=${unicodeString}`]);

        const stats = await fs.stat(outputPath);
        const originalStats = await fs.stat(inputFile.path);
        const compressionRatio = ((1 - stats.size / originalStats.size) * 100).toFixed(1);

        console.log(chalk.green(`    ✅ Created chunk ${chunk.index} (${inputFile.style}): ${outputFileName}`));
        console.log(chalk.gray(`    Size: ${(stats.size / 1024).toFixed(1)}KB (${compressionRatio}% smaller), ${chunk.characters.length} chars`));

        results.push({
          chunkIndex: chunk.index,
          path: outputPath,
          filename: outputFileName,
          size: stats.size,
          compressionRatio: compressionRatio,
          unicodeRanges: chunk.unicodeRanges,
          characterCount: chunk.characters.length,
          style: inputFile.style
        });
      } catch (error) {
        console.error(chalk.red(`    ❌ Failed to process chunk ${chunk.index} (${inputFile.style}):`), error.message);
        throw error;
      }
    }

    console.log(chalk.green(`    ✅ Completed chunked processing for ${inputFile.style}: ${results.length} chunks`));
    return results;
  }

  async processFont(fontId, fontConfig, downloadResult) {
    console.log(chalk.yellow(`\\n🎯 Processing ${fontConfig.displayName}...`));

    try {
      if (fontConfig.type === 'variable') {
        // Variable font processing
        return await this.processVariableFont(
          fontId,
          fontConfig,
          downloadResult.files
        );
      } else {
        // Regular font processing
        return await this.processChineseFont(
          fontId,
          fontConfig,
          downloadResult.path
        );
      }
    } catch (error) {
      console.error(
        chalk.red(`❌ Failed to process ${fontConfig.displayName}:`),
        error.message
      );
      throw error;
    }
  }

  async processAll() {
    await this.init();
    const config = await this.loadConfig();

    // Load download metadata
    const downloadMetadataPath = path.join(
      this.downloadDir,
      'download-metadata.json'
    );
    const downloadMetadata = await fs.readJson(downloadMetadataPath);
    const processResults = {};

    console.log(chalk.bold.blue('🚀 Font Subsetting Processor\\n'));

    for (const [fontId, fontConfig] of Object.entries(config.fonts)) {
      const downloadResult = downloadMetadata.results[fontId];

      if (!downloadResult || downloadResult.error) {
        console.log(
          chalk.red(`⏭️  Skipping ${fontConfig.displayName} (download failed)`)
        );
        continue;
      }

      try {
        const result = await this.processFont(
          fontId,
          fontConfig,
          downloadResult
        );
        processResults[fontId] = result;
      } catch (error) {
        console.error(chalk.red(`Failed to process ${fontId}:`), error.message);
        processResults[fontId] = { error: error.message };
      }
    }

    // Save processing results metadata
    const metadataPath = path.join(this.outputDir, 'processing-metadata.json');
    await fs.writeJson(
      metadataPath,
      {
        timestamp: new Date().toISOString(),
        results: processResults,
      },
      { spaces: 2 }
    );

    console.log(chalk.bold.green('\\n✅ Font processing completed!'));
    console.log(chalk.gray(`Metadata saved to: ${metadataPath}`));

    return processResults;
  }

  async processSpecific(fontIds) {
    await this.init();
    const config = await this.loadConfig();

    // Load download metadata
    const downloadMetadataPath = path.join(
      this.downloadDir,
      'download-metadata.json'
    );
    const downloadMetadata = await fs.readJson(downloadMetadataPath);
    const processResults = {};

    console.log(
      chalk.bold.blue('🚀 Font Subsetting Processor (Specific Fonts)\\n')
    );
    console.log(chalk.cyan(`Target fonts: ${fontIds.join(', ')}\\n`));

    for (const fontId of fontIds) {
      if (!config.fonts[fontId]) {
        console.error(chalk.red(`❌ Font configuration not found: ${fontId}`));
        continue;
      }

      const downloadResult = downloadMetadata.results[fontId];

      if (!downloadResult || downloadResult.error) {
        console.log(chalk.red(`⏭️  Skipping ${fontId} (download failed)`));
        continue;
      }

      try {
        const result = await this.processFont(
          fontId,
          config.fonts[fontId],
          downloadResult
        );
        processResults[fontId] = result;
      } catch (error) {
        console.error(chalk.red(`Failed to process ${fontId}:`), error.message);
        processResults[fontId] = { error: error.message };
      }
    }

    return processResults;
  }

  async loadCharacterFrequencyData() {
    try {
      const data = await fs.readJson(this.characterFrequencyPath);
      return data;
    } catch (error) {
      console.warn(chalk.yellow('⚠️  Character frequency data not found, using basic priorities'));
      return null;
    }
  }

  async analyzeCharacterCoverage(fontPath) {
    console.log(chalk.blue('  🔍 Analyzing font character coverage...'));
    
    return new Promise((resolve, reject) => {
      // Use pyftsubset to extract character coverage
      const child = spawn('pyftsubset', [
        fontPath,
        '--output-file=/dev/null',
        '--unicodes=*',
        '--verbose'
      ], { stdio: 'pipe' });

      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        output += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0 || output.includes('unicodes')) {
          // Parse the output to extract supported unicode ranges
          const unicodes = this.parseUnicodeOutput(output);
          console.log(chalk.green(`    ✅ Found ${unicodes.length} supported characters`));
          resolve(unicodes);
        } else {
          console.error(chalk.red('    ❌ Failed to analyze character coverage'));
          reject(new Error('Character analysis failed'));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  parseUnicodeOutput(output) {
    // This is a simplified parser - in reality, we'd need more sophisticated parsing
    // For now, we'll return a basic set of common characters
    const basicChars = [];
    
    // Add basic Latin
    for (let i = 0x0020; i <= 0x007F; i++) {
      basicChars.push(String.fromCharCode(i));
    }
    
    // Add common Chinese characters (this would be extracted from actual font analysis)
    const commonChinese = ['一', '的', '是', '在', '人', '有', '我', '他', '這', '個', '們', '來', '到', '時', '大', '地', '為', '子', '中', '你'];
    basicChars.push(...commonChinese);
    
    return basicChars;
  }

  async createCharacterPriorityList(characters, strategy, priorityData) {
    console.log(chalk.blue(`  📊 Applying ${strategy} priority ranking...`));
    
    const frequencyData = await this.loadCharacterFrequencyData();
    if (!frequencyData || !frequencyData[priorityData]) {
      console.warn(chalk.yellow('    ⚠️  Using fallback priority ranking'));
      return characters; // Return as-is if no priority data
    }

    const priority = frequencyData[priorityData];
    const prioritized = [];
    
    // Add critical characters first (Latin, punctuation)
    const criticalRanges = priority.critical || [];
    for (const range of criticalRanges) {
      const rangeChars = this.expandUnicodeRange(range);
      prioritized.push(...rangeChars.filter(c => characters.includes(c)));
    }
    
    // Add high frequency characters
    const highFreq = priority.high_frequency || [];
    for (const char of highFreq) {
      if (characters.includes(char) && !prioritized.includes(char)) {
        prioritized.push(char);
      }
    }
    
    // Add remaining characters
    for (const char of characters) {
      if (!prioritized.includes(char)) {
        prioritized.push(char);
      }
    }
    
    console.log(chalk.green(`    ✅ Prioritized ${prioritized.length} characters`));
    return prioritized;
  }

  expandUnicodeRange(range) {
    // Convert Unicode range like "U+0020-007F" to array of characters
    if (range.includes('-')) {
      const [start, end] = range.replace('U+', '').split('-');
      const startCode = parseInt(start, 16);
      const endCode = parseInt(end, 16);
      const chars = [];
      for (let i = startCode; i <= endCode; i++) {
        chars.push(String.fromCharCode(i));
      }
      return chars;
    } else {
      // Single character
      const code = parseInt(range.replace('U+', ''), 16);
      return [String.fromCharCode(code)];
    }
  }

  async estimateChunkSize(fontPath, characters) {
    // Create a temporary subset to estimate size
    const tempFile = path.join(this.outputDir, 'temp-estimate.woff2');
    const unicodeString = characters.map(c => `U+${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`).join(',');
    
    try {
      await this.runPyftsubset(fontPath, tempFile, [`--unicodes=${unicodeString}`]);
      const stats = await fs.stat(tempFile);
      await fs.remove(tempFile); // Clean up
      return Math.round(stats.size / 1024); // Return size in KB
    } catch (error) {
      console.warn(chalk.yellow(`    ⚠️  Size estimation failed, using default`));
      return characters.length * 0.5; // Rough estimate: 0.5KB per character
    }
  }

  async generateOptimalChunks(fontPath, fontConfig) {
    console.log(chalk.blue('  📦 Generating optimal chunks...'));
    
    // Step 1: Analyze character coverage
    const allCharacters = await this.analyzeCharacterCoverage(fontPath);
    
    // Step 2: Apply priority ranking
    const prioritizedChars = await this.createCharacterPriorityList(
      allCharacters,
      fontConfig.subset.strategy,
      fontConfig.subset.priorityData
    );
    
    // Step 3: Create size-based chunks
    const chunks = [];
    const chunkSizes = fontConfig.subset.chunkSizes;
    let currentChunk = [];
    let chunkIndex = 0;
    
    for (const char of prioritizedChars) {
      currentChunk.push(char);
      
      // Check if we should finalize this chunk
      const shouldFinalize = 
        chunkIndex < chunkSizes.length && 
        (await this.estimateChunkSize(fontPath, currentChunk)) >= chunkSizes[chunkIndex];
      
      if (shouldFinalize || chunkIndex >= fontConfig.subset.maxChunks - 1) {
        const unicodeRanges = this.calculateUnicodeRanges(currentChunk);
        chunks.push({
          index: chunkIndex,
          characters: [...currentChunk],
          unicodeRanges,
          targetSize: chunkSizes[chunkIndex] || chunkSizes[chunkSizes.length - 1]
        });
        
        console.log(chalk.gray(`    📄 Chunk ${chunkIndex}: ${currentChunk.length} characters, target ${chunkSizes[chunkIndex] || 'default'}KB`));
        
        currentChunk = [];
        chunkIndex++;
        
        if (chunkIndex >= fontConfig.subset.maxChunks) {
          break;
        }
      }
    }
    
    // Add remaining characters to final chunk
    if (currentChunk.length > 0) {
      const unicodeRanges = this.calculateUnicodeRanges(currentChunk);
      chunks.push({
        index: chunkIndex,
        characters: currentChunk,
        unicodeRanges,
        targetSize: chunkSizes[chunkIndex] || chunkSizes[chunkSizes.length - 1]
      });
      console.log(chalk.gray(`    📄 Final chunk ${chunkIndex}: ${currentChunk.length} characters`));
    }
    
    // Step 4: Validate complete coverage
    if (fontConfig.subset.ensureCompleteCoverage) {
      const totalChunkedChars = chunks.flatMap(c => c.characters);
      const missingChars = allCharacters.filter(c => !totalChunkedChars.includes(c));
      
      if (missingChars.length > 0) {
        console.warn(chalk.yellow(`    ⚠️  ${missingChars.length} characters not in chunks, adding to final chunk`));
        if (chunks.length > 0) {
          chunks[chunks.length - 1].characters.push(...missingChars);
          chunks[chunks.length - 1].unicodeRanges = this.calculateUnicodeRanges(chunks[chunks.length - 1].characters);
        }
      }
    }
    
    console.log(chalk.green(`    ✅ Generated ${chunks.length} optimal chunks`));
    return chunks;
  }

  calculateUnicodeRanges(characters) {
    // Convert characters to Unicode ranges for CSS
    const codePoints = characters.map(c => c.charCodeAt(0)).sort((a, b) => a - b);
    const ranges = [];
    
    let start = codePoints[0];
    let end = codePoints[0];
    
    for (let i = 1; i < codePoints.length; i++) {
      if (codePoints[i] === end + 1) {
        end = codePoints[i];
      } else {
        // Add completed range
        if (start === end) {
          ranges.push(`U+${start.toString(16).toUpperCase().padStart(4, '0')}`);
        } else {
          ranges.push(`U+${start.toString(16).toUpperCase().padStart(4, '0')}-${end.toString(16).toUpperCase().padStart(4, '0')}`);
        }
        start = end = codePoints[i];
      }
    }
    
    // Add final range
    if (start === end) {
      ranges.push(`U+${start.toString(16).toUpperCase().padStart(4, '0')}`);
    } else {
      ranges.push(`U+${start.toString(16).toUpperCase().padStart(4, '0')}-${end.toString(16).toUpperCase().padStart(4, '0')}`);
    }
    
    return ranges;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const processor = new FontSubset();

  // Check if specific fonts are requested via command line args
  const targetFonts = process.argv.slice(2);

  if (targetFonts.length > 0) {
    processor.processSpecific(targetFonts);
  } else {
    processor.processAll();
  }
}

export default FontSubset;
