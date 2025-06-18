import { spawn, type ChildProcess } from 'child_process';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';

import type { ChunkResult, FontConfig, FontsConfig } from '@/types.js';

interface PyftsubsetResult {
  stdout: string;
  stderr: string;
}

interface ChunkData {
  index: number;
  characters: string[];
  unicodeRanges: string[];
  size?: number;
}

interface DownloadResult {
  files: Array<{
    path: string;
    style?: string;
  }>;
}

class FontSubset {
  private configPath: string;
  private downloadDir: string;
  private outputDir: string;
  private characterFrequencyPath: string;

  constructor() {
    this.configPath = path.join(process.cwd(), 'src/config/fonts.json');
    this.downloadDir = path.join(process.cwd(), 'downloads');
    this.outputDir = path.join(process.cwd(), 'build');
    this.characterFrequencyPath = path.join(
      process.cwd(),
      'src/data/character-frequency.json'
    );
  }

  async init(): Promise<void> {
    // Ensure output directories exist
    await fs.ensureDir(this.outputDir);
    await fs.ensureDir(path.join(this.outputDir, 'fonts'));

    // Check if fonttools is available
    await this.checkFontTools();
  }

  async checkFontTools(): Promise<void> {
    return new Promise((resolve, reject) => {
      const child: ChildProcess = spawn('pyftsubset', ['--help'], {
        stdio: 'pipe',
      });

      child.on('close', (code: number | null) => {
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

      child.on('error', (error: Error) => {
        console.error(chalk.red('❌ Error checking fonttools:'), error.message);
        console.log(
          chalk.yellow('💡 Install fonttools: pip install fonttools[woff]')
        );
        reject(error);
      });
    });
  }

  async loadConfig(): Promise<FontsConfig> {
    try {
      const config = await fs.readJson(this.configPath);
      return config as FontsConfig;
    } catch (error) {
      console.error(
        chalk.red('Failed to load font configuration:'),
        (error as Error).message
      );
      throw error;
    }
  }

  async runPyftsubset(
    inputPath: string,
    outputPath: string,
    options: string[] = []
  ): Promise<PyftsubsetResult> {
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

      const child: ChildProcess = spawn('pyftsubset', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env },
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      child.on('close', (code: number | null) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          console.error(chalk.red(`    pyftsubset failed with code ${code}`));
          console.error(chalk.red(`    stderr: ${stderr}`));
          reject(new Error(`pyftsubset failed: ${stderr}`));
        }
      });

      child.on('error', (error: Error) => {
        reject(error);
      });
    });
  }

  generateUnicodeRanges(ranges: string[]): string[] {
    // Convert Unicode ranges to pyftsubset format
    return ranges
      .map((range: string) => {
        if (range.includes('-')) {
          return `--unicodes=${range}`;
        } else {
          return `--unicodes=${range}`;
        }
      })
      .join(' ')
      .split(' ');
  }

  async processChineseFont(
    fontId: string,
    fontConfig: FontConfig,
    inputPath: string
  ): Promise<ChunkResult[]> {
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

  async processChunkedFont(
    fontId: string,
    fontConfig: FontConfig,
    inputPath: string,
    styleOverride?: string
  ): Promise<ChunkResult[]> {
    console.log(chalk.blue(`    🧩 Using chunked processing...`));

    const fontDir = path.join(this.outputDir, 'fonts', fontId);
    const results: ChunkResult[] = [];

    // Generate optimal chunks
    const chunks = await this.generateOptimalChunks(inputPath, fontConfig);

    // Determine the style to use for output filename
    const style = styleOverride ?? fontConfig.style ?? 'regular';

    for (const chunk of chunks) {
      const outputFileName =
        fontConfig.output.filenamePattern
          .replace('{index}', chunk.index.toString())
          .replace('{style}', style) + '.woff2';
      const outputPath = path.join(fontDir, outputFileName);

      // Check if chunk file already exists
      if (await fs.pathExists(outputPath)) {
        const stats = await fs.stat(outputPath);
        console.log(
          chalk.green(
            `    ⏭️  Chunk ${chunk.index} already exists: ${outputFileName}`
          )
        );
        console.log(
          chalk.gray(`    Size: ${(stats.size / 1024).toFixed(1)}KB`)
        );

        results.push({
          chunkIndex: chunk.index,
          path: outputPath,
          filename: outputFileName,
          size: stats.size,
          compressionRatio: 'N/A (existing)',
          unicodeRanges: chunk.unicodeRanges,
          characterCount: chunk.characters.length,
        });
        continue;
      }

      // Create Unicode string for this chunk
      const unicodeString = chunk.characters
        .map(
          (c: string) =>
            `U+${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`
        )
        .join(',');

      try {
        await this.runPyftsubset(inputPath, outputPath, [
          `--unicodes=${unicodeString}`,
        ]);

        const stats = await fs.stat(outputPath);
        const originalStats = await fs.stat(inputPath);
        const compressionRatio = (
          (1 - stats.size / originalStats.size) *
          100
        ).toFixed(1);

        console.log(
          chalk.green(`    ✅ Created chunk ${chunk.index}: ${outputFileName}`)
        );
        console.log(
          chalk.gray(
            `    Size: ${(stats.size / 1024).toFixed(
              1
            )}KB (${compressionRatio}% smaller), ${
              chunk.characters.length
            } chars`
          )
        );

        results.push({
          chunkIndex: chunk.index,
          path: outputPath,
          filename: outputFileName,
          size: stats.size,
          compressionRatio: parseFloat(compressionRatio),
          unicodeRanges: chunk.unicodeRanges,
          characterCount: chunk.characters.length,
        });
      } catch (error) {
        console.error(
          chalk.red(`    ❌ Failed to process chunk ${chunk.index}:`),
          (error as Error).message
        );
        throw error;
      }
    }

    console.log(
      chalk.green(
        `    ✅ Completed chunked processing: ${results.length} chunks`
      )
    );
    return results;
  }

  async processLegacySingleFont(
    fontId: string,
    fontConfig: FontConfig,
    inputPath: string
  ): Promise<ChunkResult[]> {
    console.log(chalk.blue(`    📄 Using legacy single-file processing...`));

    const fontDir = path.join(this.outputDir, 'fonts', fontId);
    const outputFileName = `${
      (fontConfig.output as { filename?: string }).filename ?? fontId
    }.woff2`;
    const outputPath = path.join(fontDir, outputFileName);

    // Check if output file already exists
    if (await fs.pathExists(outputPath)) {
      const stats = await fs.stat(outputPath);
      console.log(
        chalk.green(`    ⏭️  Font already exists: ${outputFileName}`)
      );
      console.log(chalk.gray(`    Size: ${(stats.size / 1024).toFixed(1)}KB`));

      return [
        {
          chunkIndex: 0,
          path: outputPath,
          filename: outputFileName,
          size: stats.size,
          compressionRatio: 'N/A (existing)',
          unicodeRanges: ['U+4E00-9FFF'],
          characterCount: 0,
        },
      ];
    }

    try {
      await this.runPyftsubset(inputPath, outputPath, [
        '--unicodes=U+4E00-9FFF,U+3000-303F,U+FF00-FFEF',
      ]);

      const stats = await fs.stat(outputPath);
      const originalStats = await fs.stat(inputPath);
      const compressionRatio = (
        (1 - stats.size / originalStats.size) *
        100
      ).toFixed(1);

      console.log(chalk.green(`    ✅ Created font: ${outputFileName}`));
      console.log(
        chalk.gray(
          `    Size: ${(stats.size / 1024).toFixed(
            1
          )}KB (${compressionRatio}% smaller)`
        )
      );

      return [
        {
          chunkIndex: 0,
          path: outputPath,
          filename: outputFileName,
          size: stats.size,
          compressionRatio: parseFloat(compressionRatio),
          unicodeRanges: ['U+4E00-9FFF'],
          characterCount: 0,
        },
      ];
    } catch (error) {
      console.error(
        chalk.red(`    ❌ Failed to process font:`),
        (error as Error).message
      );
      throw error;
    }
  }

  async processVariableFont(
    fontId: string,
    fontConfig: FontConfig,
    inputFiles: DownloadResult
  ): Promise<ChunkResult[]> {
    console.log(
      chalk.blue(`  📝 Processing variable font: ${fontConfig.displayName}`)
    );

    const fontDir = path.join(this.outputDir, 'fonts', fontId);
    await fs.ensureDir(fontDir);

    const allResults: ChunkResult[] = [];

    // Process each style separately
    for (const inputFile of inputFiles.files) {
      console.log(
        chalk.blue(`    🎨 Processing style: ${inputFile.style ?? 'default'}`)
      );

      // Check if this is a chunked font configuration
      if (fontConfig.subset.type === 'size-based-chunks') {
        const styleResults = await this.processChunkedVariableFont(
          fontId,
          fontConfig,
          inputFile
        );
        allResults.push(...styleResults);
      } else {
        // Single variable font file
        const style = inputFile.style ?? 'variable';
        const outputFileName =
          fontConfig.output.filenamePattern.replace('{style}', style) +
          '.woff2';
        const outputPath = path.join(fontDir, outputFileName);

        // Check if output file already exists
        if (await fs.pathExists(outputPath)) {
          const stats = await fs.stat(outputPath);
          console.log(
            chalk.green(
              `    ⏭️  Variable font already exists: ${outputFileName}`
            )
          );
          console.log(
            chalk.gray(`    Size: ${(stats.size / 1024).toFixed(1)}KB`)
          );

          allResults.push({
            chunkIndex: 0,
            path: outputPath,
            filename: outputFileName,
            size: stats.size,
            compressionRatio: 'N/A (existing)',
            unicodeRanges: ['U+0000-FFFF'],
            characterCount: 0,
          });
          continue;
        }

        try {
          // Variable fonts often need different subsetting
          const subsetOptions = [
            '--unicodes=*', // Keep all characters for variable fonts
          ];

          await this.runPyftsubset(inputFile.path, outputPath, subsetOptions);

          const stats = await fs.stat(outputPath);
          const originalStats = await fs.stat(inputFile.path);
          const compressionRatio = (
            (1 - stats.size / originalStats.size) *
            100
          ).toFixed(1);

          console.log(
            chalk.green(`    ✅ Created variable font: ${outputFileName}`)
          );
          console.log(
            chalk.gray(
              `    Size: ${(stats.size / 1024).toFixed(
                1
              )}KB (${compressionRatio}% smaller)`
            )
          );

          allResults.push({
            chunkIndex: 0,
            path: outputPath,
            filename: outputFileName,
            size: stats.size,
            compressionRatio: parseFloat(compressionRatio),
            unicodeRanges: ['U+0000-FFFF'],
            characterCount: 0,
          });
        } catch (error) {
          console.error(
            chalk.red(`    ❌ Failed to process variable font ${style}:`),
            (error as Error).message
          );
          throw error;
        }
      }
    }

    return allResults;
  }

  async processChunkedVariableFont(
    fontId: string,
    fontConfig: FontConfig,
    inputFile: { path: string; style?: string }
  ): Promise<ChunkResult[]> {
    const style = inputFile.style ?? 'variable';
    console.log(
      chalk.blue(
        `    🧩 Using chunked variable font processing for ${style}...`
      )
    );

    const fontDir = path.join(this.outputDir, 'fonts', fontId);
    const results: ChunkResult[] = [];

    // Generate optimal chunks for variable font
    const chunks = await this.generateOptimalChunks(inputFile.path, fontConfig);

    for (const chunk of chunks) {
      const outputFileName =
        fontConfig.output.filenamePattern
          .replace('{index}', chunk.index.toString())
          .replace('{style}', style) + '.woff2';
      const outputPath = path.join(fontDir, outputFileName);

      // Check if chunk file already exists
      if (await fs.pathExists(outputPath)) {
        const stats = await fs.stat(outputPath);
        console.log(
          chalk.green(
            `    ⏭️  ${style} chunk ${chunk.index} already exists: ${outputFileName}`
          )
        );
        console.log(
          chalk.gray(`    Size: ${(stats.size / 1024).toFixed(1)}KB`)
        );

        results.push({
          chunkIndex: chunk.index,
          path: outputPath,
          filename: outputFileName,
          size: stats.size,
          compressionRatio: 'N/A (existing)',
          unicodeRanges: chunk.unicodeRanges,
          characterCount: chunk.characters.length,
          style,
        });
        continue;
      }

      // Create Unicode string for this chunk
      const unicodeString = chunk.characters
        .map(
          (c: string) =>
            `U+${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`
        )
        .join(',');

      try {
        await this.runPyftsubset(inputFile.path, outputPath, [
          `--unicodes=${unicodeString}`,
        ]);

        const stats = await fs.stat(outputPath);
        const originalStats = await fs.stat(inputFile.path);
        const compressionRatio = (
          (1 - stats.size / originalStats.size) *
          100
        ).toFixed(1);

        console.log(
          chalk.green(
            `    ✅ Created ${style} chunk ${chunk.index}: ${outputFileName}`
          )
        );
        console.log(
          chalk.gray(
            `    Size: ${(stats.size / 1024).toFixed(
              1
            )}KB (${compressionRatio}% smaller), ${
              chunk.characters.length
            } chars`
          )
        );

        results.push({
          chunkIndex: chunk.index,
          path: outputPath,
          filename: outputFileName,
          size: stats.size,
          compressionRatio: parseFloat(compressionRatio),
          unicodeRanges: chunk.unicodeRanges,
          characterCount: chunk.characters.length,
          style,
        });
      } catch (error) {
        console.error(
          chalk.red(`    ❌ Failed to process ${style} chunk ${chunk.index}:`),
          (error as Error).message
        );
        throw error;
      }
    }

    console.log(
      chalk.green(
        `    ✅ Completed ${style} chunked processing: ${results.length} chunks`
      )
    );

    return results;
  }

  async processFont(
    fontId: string,
    fontConfig: FontConfig,
    downloadResult: DownloadResult
  ): Promise<ChunkResult[]> {
    console.log(chalk.blue(`📦 Processing font: ${fontConfig.displayName}`));

    try {
      // Check font type
      if (fontConfig.type === 'variable') {
        return await this.processVariableFont(
          fontId,
          fontConfig,
          downloadResult
        );
      } else {
        // Standard static font processing
        const inputFile = downloadResult.files[0];
        if (!inputFile) {
          throw new Error(`No input file found for font ${fontId}`);
        }
        return await this.processChineseFont(
          fontId,
          fontConfig,
          inputFile.path
        );
      }
    } catch (error) {
      console.error(
        chalk.red(`❌ Failed to process font ${fontId}:`),
        (error as Error).message
      );
      throw error;
    }
  }

  async processAll(): Promise<void> {
    console.log(
      chalk.bold.blue('🚀 Starting font processing for all fonts\\n')
    );

    try {
      await this.init();
      const config = await this.loadConfig();

      // Check for downloaded files
      const downloadedFonts = await this.getDownloadedFonts();

      if (downloadedFonts.length === 0) {
        console.log(
          chalk.yellow(
            '⚠️  No downloaded fonts found. Please run font download first.'
          )
        );
        return;
      }

      console.log(
        chalk.blue(
          `📝 Found ${downloadedFonts.length} downloaded fonts to process\\n`
        )
      );

      for (const fontId of downloadedFonts) {
        const fontConfig = config.fonts[fontId];
        if (!fontConfig) {
          console.log(chalk.yellow(`⚠️  No config found for font: ${fontId}`));
          continue;
        }

        try {
          // Get download result
          const downloadResult = await this.getDownloadResult(fontId);
          if (!downloadResult) {
            console.log(chalk.yellow(`⚠️  No download result for: ${fontId}`));
            continue;
          }

          const results = await this.processFont(
            fontId,
            fontConfig,
            downloadResult
          );
          await this.saveChunkMetadata(fontId, results);
          console.log(chalk.green(`✅ Completed processing: ${fontId}\\n`));
        } catch (error) {
          console.error(
            chalk.red(`❌ Failed to process font ${fontId}:`),
            (error as Error).message
          );
          continue;
        }
      }

      console.log(chalk.bold.green('🎉 Font processing completed!'));
    } catch (error) {
      console.error(
        chalk.red('❌ Font processing failed:'),
        (error as Error).message
      );
      throw error;
    }
  }

  async processSpecific(fontIds: string[]): Promise<void> {
    console.log(
      chalk.bold.blue(
        `🚀 Starting font processing for specific fonts: ${fontIds.join(
          ', '
        )}\\n`
      )
    );

    try {
      await this.init();
      const config = await this.loadConfig();

      for (const fontId of fontIds) {
        const fontConfig = config.fonts[fontId];
        if (!fontConfig) {
          console.log(chalk.yellow(`⚠️  No config found for font: ${fontId}`));
          continue;
        }

        try {
          // Get download result
          const downloadResult = await this.getDownloadResult(fontId);
          if (!downloadResult) {
            console.log(chalk.yellow(`⚠️  No download result for: ${fontId}`));
            continue;
          }

          const results = await this.processFont(
            fontId,
            fontConfig,
            downloadResult
          );
          await this.saveChunkMetadata(fontId, results);
          console.log(chalk.green(`✅ Completed processing: ${fontId}\\n`));
        } catch (error) {
          console.error(
            chalk.red(`❌ Failed to process font ${fontId}:`),
            (error as Error).message
          );
          continue;
        }
      }

      console.log(chalk.bold.green('🎉 Specific font processing completed!'));
    } catch (error) {
      console.error(
        chalk.red('❌ Specific font processing failed:'),
        (error as Error).message
      );
      throw error;
    }
  }

  async getDownloadedFonts(): Promise<string[]> {
    try {
      const downloadedDir = path.join(this.downloadDir);
      if (!(await fs.pathExists(downloadedDir))) {
        return [];
      }

      const items = await fs.readdir(downloadedDir);
      const fontDirs = [];

      for (const item of items) {
        const itemPath = path.join(downloadedDir, item);
        const stat = await fs.stat(itemPath);
        if (stat.isDirectory()) {
          fontDirs.push(item);
        }
      }

      return fontDirs;
    } catch (error) {
      console.error(
        chalk.red('Failed to get downloaded fonts:'),
        (error as Error).message
      );
      return [];
    }
  }

  async getDownloadResult(fontId: string): Promise<DownloadResult | null> {
    try {
      const fontDir = path.join(this.downloadDir, fontId);
      if (!(await fs.pathExists(fontDir))) {
        return null;
      }

      const files = await fs.readdir(fontDir);
      const fontFiles = files
        .filter(
          (file) =>
            file.endsWith('.ttf') ||
            file.endsWith('.otf') ||
            file.endsWith('.woff2')
        )
        .map((file) => {
          // Extract style from filename
          let style = 'regular';
          const lowerFile = file.toLowerCase();

          if (lowerFile.includes('italic')) {
            style = 'italic';
          } else if (lowerFile.includes('roman')) {
            style = 'roman';
          } else if (lowerFile.includes('bold')) {
            style = 'bold';
          } else if (lowerFile.includes('light')) {
            style = 'light';
          }

          return {
            path: path.join(fontDir, file),
            style,
          };
        });

      return {
        files: fontFiles,
      };
    } catch (error) {
      console.error(
        chalk.red(`Failed to get download result for ${fontId}:`),
        (error as Error).message
      );
      return null;
    }
  }

  async generateOptimalChunks(
    _inputPath: string,
    fontConfig: FontConfig
  ): Promise<ChunkData[]> {
    console.log(chalk.blue(`    🎯 Generating optimal chunks...`));

    // Load character frequency data
    const characterFrequency = await this.loadCharacterFrequency();

    // Get all available characters from the font (simplified approach)
    const availableChars = Object.keys(characterFrequency);

    console.log(
      chalk.blue(
        `    📊 Found ${availableChars.length} characters in frequency data`
      )
    );

    // Sort by frequency (most frequent first)
    const sortedChars = availableChars.sort(
      (a, b) => (characterFrequency[b] ?? 0) - (characterFrequency[a] ?? 0)
    );

    const chunks: ChunkData[] = [];
    const chunkSizes = fontConfig.subset.chunkSizes ?? [50, 80, 100, 120];
    const maxChunks = fontConfig.subset.maxChunks ?? 10;

    console.log(
      chalk.blue(`    📦 Target chunk sizes (KB): ${chunkSizes.join(', ')}`)
    );
    console.log(chalk.blue(`    🎯 Max chunks: ${maxChunks}`));

    let currentIndex = 0;
    let remainingChars = [...sortedChars];

    while (remainingChars.length > 0 && currentIndex < maxChunks) {
      // Determine target size for current chunk (in KB, convert to bytes)
      const targetSizeKB =
        chunkSizes[Math.min(currentIndex, chunkSizes.length - 1)] ?? 50;
      const targetSizeBytes = targetSizeKB * 1024; // Convert KB to bytes

      // Take characters until we reach target size or run out
      const charsInThisChunk: string[] = [];
      let chunkSizeBytes = 0;

      for (const char of remainingChars) {
        const charSizeBytes = this.estimateCharacterSize(char);

        // If adding this character would exceed target size and we already have some chars, stop
        if (
          chunkSizeBytes + charSizeBytes > targetSizeBytes &&
          charsInThisChunk.length > 0
        ) {
          break;
        }

        charsInThisChunk.push(char);
        chunkSizeBytes += charSizeBytes;

        // If we've reached a reasonable chunk size, stop
        if (chunkSizeBytes >= targetSizeBytes) {
          break;
        }
      }

      if (charsInThisChunk.length === 0) {
        // This shouldn't happen, but if it does, take at least one character
        const firstChar = remainingChars[0];
        if (firstChar) {
          charsInThisChunk.push(firstChar);
        }
      }

      // Remove characters we've used from remaining chars
      remainingChars = remainingChars.filter(
        (char) => !charsInThisChunk.includes(char)
      );

      // Create chunk
      chunks.push({
        index: currentIndex,
        characters: charsInThisChunk,
        unicodeRanges: this.generateUnicodeRangesFromChars(charsInThisChunk),
        size: chunkSizeBytes,
      });

      console.log(
        chalk.gray(
          `    📦 Chunk ${currentIndex}: ${charsInThisChunk.length} chars, ~${(
            chunkSizeBytes / 1024
          ).toFixed(1)}KB`
        )
      );

      currentIndex++;
    }

    // If there are still remaining characters and we haven't reached max chunks, add them to last chunk
    if (
      remainingChars.length > 0 &&
      chunks.length > 0 &&
      chunks.length < maxChunks
    ) {
      const lastChunk = chunks[chunks.length - 1];
      if (lastChunk) {
        lastChunk.characters.push(...remainingChars);
        lastChunk.unicodeRanges = this.generateUnicodeRangesFromChars(
          lastChunk.characters
        );
        console.log(
          chalk.gray(
            `    📦 Added ${remainingChars.length} remaining chars to last chunk`
          )
        );
      }
    }

    console.log(
      chalk.green(`    ✅ Generated ${chunks.length} optimal chunks`)
    );
    return chunks;
  }

  async loadCharacterFrequency(): Promise<Record<string, number>> {
    try {
      if (await fs.pathExists(this.characterFrequencyPath)) {
        const data = await fs.readJson(this.characterFrequencyPath);
        // Convert the nested structure to flat character frequency map
        return this.convertFrequencyData(data);
      }
      // Return default frequency data
      return this.getDefaultCharacterFrequency();
    } catch (_error) {
      console.log(chalk.yellow('⚠️  Using default character frequency data'));
      return this.getDefaultCharacterFrequency();
    }
  }

  convertFrequencyData(data: Record<string, unknown>): Record<string, number> {
    const frequency: Record<string, number> = {};

    // Handle traditional Chinese frequency data
    if (data['traditional-chinese-frequency']) {
      const tcData = data['traditional-chinese-frequency'] as Record<
        string,
        unknown
      >;

      // Add high frequency characters with decreasing weights
      if (tcData.high_frequency && Array.isArray(tcData.high_frequency)) {
        (tcData.high_frequency as string[]).forEach(
          (char: string, index: number) => {
            frequency[char] = 10000 - index;
          }
        );
      }
    }

    // Handle Latin frequency data
    if (data['latin-frequency']) {
      const latinData = data['latin-frequency'] as Record<string, unknown>;

      if (latinData.high_frequency && Array.isArray(latinData.high_frequency)) {
        (latinData.high_frequency as string[]).forEach(
          (char: string, index: number) => {
            frequency[char] = 5000 - index;
          }
        );
      }
    }

    // Add comprehensive Chinese character range if not enough characters
    if (Object.keys(frequency).length < 1000) {
      this.addCJKCharacterRange(frequency);
    }

    return frequency;
  }

  addCJKCharacterRange(frequency: Record<string, number>): void {
    // Add CJK Unified Ideographs (U+4E00-U+9FFF)
    for (let code = 0x4e00; code <= 0x9fff; code++) {
      const char = String.fromCharCode(code);
      frequency[char] ??= 100;
    }

    // Add CJK Extension A (U+3400-U+4DBF) with even lower frequency
    for (let code = 0x3400; code <= 0x4dbf; code++) {
      const char = String.fromCharCode(code);
      frequency[char] ??= 50;
    }

    // Add basic punctuation and symbols
    const punctuation = '，。！？；：「」『』（）【】〈〉《》〔〕．‧…、～－—–';
    punctuation.split('').forEach((char, index) => {
      frequency[char] = 8000 - index;
    });

    // Add Arabic numerals and basic Latin
    for (let code = 0x20; code <= 0x7e; code++) {
      const char = String.fromCharCode(code);
      frequency[char] ??= 7000;
    }
  }

  getDefaultCharacterFrequency(): Record<string, number> {
    console.log(
      chalk.yellow('⚠️  Using comprehensive default character frequency data')
    );

    const frequency: Record<string, number> = {};

    // Start with a comprehensive set of characters
    this.addCJKCharacterRange(frequency);

    // Add some very high frequency characters
    const veryCommonChars =
      '的一是在不了有和人這中大為上個國我以要他時來用你年生會自然後能對立事三之通'.split(
        ''
      );
    veryCommonChars.forEach((char, index) => {
      frequency[char] = 15000 - index;
    });

    return frequency;
  }

  estimateCharacterSize(char: string): number {
    // More realistic character size estimation based on Unicode range
    const code = char.charCodeAt(0);

    // Basic Latin and ASCII - lighter
    if (code <= 0x7f) {
      return 50; // bytes
    }

    // CJK characters are typically heavier in fonts
    if (
      (code >= 0x4e00 && code <= 0x9fff) || // CJK Unified Ideographs
      (code >= 0x3400 && code <= 0x4dbf) || // CJK Extension A
      (code >= 0xf900 && code <= 0xfaff)
    ) {
      // CJK Compatibility Ideographs
      return 200; // bytes per CJK character
    }

    // Other Unicode characters (punctuation, symbols, etc.)
    return 100; // bytes
  }

  generateUnicodeRangesFromChars(chars: string[]): string[] {
    const codePoints = chars
      .map((char) => char.charCodeAt(0))
      .sort((a, b) => a - b);
    const ranges: string[] = [];

    if (codePoints.length === 0) {
      return ranges;
    }

    let start: number = codePoints[0]!;
    let end: number = codePoints[0]!;

    for (let i = 1; i < codePoints.length; i++) {
      const currentPoint = codePoints[i]!;
      if (currentPoint === end + 1) {
        end = currentPoint;
      } else {
        ranges.push(
          start === end
            ? `U+${start.toString(16).toUpperCase().padStart(4, '0')}`
            : `U+${start.toString(16).toUpperCase().padStart(4, '0')}-${end
                .toString(16)
                .toUpperCase()
                .padStart(4, '0')}`
        );
        start = end = currentPoint;
      }
    }

    ranges.push(
      start === end
        ? `U+${start.toString(16).toUpperCase().padStart(4, '0')}`
        : `U+${start.toString(16).toUpperCase().padStart(4, '0')}-${end
            .toString(16)
            .toUpperCase()
            .padStart(4, '0')}`
    );

    return ranges;
  }

  async saveChunkMetadata(
    fontId: string,
    results: ChunkResult[]
  ): Promise<void> {
    try {
      const metadataDir = path.join(this.outputDir, 'fonts', fontId);
      await fs.ensureDir(metadataDir);

      const metadataPath = path.join(metadataDir, 'chunks.json');
      const metadata = {
        fontId,
        chunks: results.map((result) => ({
          chunkIndex: result.chunkIndex,
          filename: result.filename,
          style: result.style ?? 'regular',
          size: result.size,
          unicodeRanges: result.unicodeRanges,
          characterCount: result.characterCount,
        })),
        generatedAt: new Date().toISOString(),
      };

      await fs.writeJson(metadataPath, metadata, { spaces: 2 });
      console.log(chalk.gray(`    💾 Saved chunk metadata: ${metadataPath}`));
    } catch (error) {
      console.error(
        chalk.red(`Failed to save chunk metadata for ${fontId}:`),
        (error as Error).message
      );
    }
  }
}

// Command line interface
if (import.meta.url === new URL(process.argv[1] ?? '', 'file:').href) {
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
