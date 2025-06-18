import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import * as fontkit from 'fontkit';
import subsetFont from 'subset-font';
import { cpus } from 'os';

import type { ChunkResult, FontConfig, FontsConfig } from '@/types.js';

// Performance optimizations
const MAX_CONCURRENT_FONTS = Math.min(cpus().length, 4);
const MAX_CONCURRENT_CHUNKS = Math.min(cpus().length * 2, 8);

interface FontSubsetConfig {
  targetChunkSize: number; // in KB
  outputFormat: 'woff2' | 'woff' | 'truetype';
  estimatedCharsPerKB: number; // Pre-calculated estimate
}

interface ChunkWithBuffer extends Omit<ChunkResult, 'path' | 'filename'> {
  buffer: Buffer;
  path: string;
  filename: string;
}

class FontSubset {
  private configPath: string;
  private downloadDir: string;
  private outputDir: string;
  private config: FontSubsetConfig;

  // Cache for font metrics
  private fontMetricsCache = new Map<
    string,
    { avgCharSize: number; baseSize: number }
  >();

  constructor(config?: Partial<FontSubsetConfig>) {
    this.configPath = path.join(process.cwd(), 'src/config/fonts.json');
    this.downloadDir = path.join(process.cwd(), 'downloads');
    this.outputDir = path.join(process.cwd(), 'build');

    this.config = {
      targetChunkSize: 64, // 64KB default
      outputFormat: 'woff2',
      estimatedCharsPerKB: 30, // Conservative estimate for Chinese fonts
      ...config,
    };
  }

  async init(): Promise<void> {
    await fs.ensureDir(this.outputDir);
    console.log(chalk.blue('🚀 Font Subset initialized'));
  }

  async loadConfig(): Promise<FontsConfig> {
    try {
      const configContent = await fs.readFile(this.configPath, 'utf-8');
      return JSON.parse(configContent);
    } catch (error) {
      throw new Error(`Failed to load config: ${(error as Error).message}`);
    }
  }

  /**
   * Fast character extraction using fontkit
   */
  async extractFontCharacters(fontPath: string): Promise<string[]> {
    const cacheKey = path.basename(fontPath, path.extname(fontPath));

    try {
      console.log(
        chalk.gray(
          `    📖 Extracting characters from ${path.basename(fontPath)}`
        )
      );

      const fontBuffer = await fs.readFile(fontPath);
      const fontOrCollection = fontkit.create(fontBuffer);

      // Handle font collection vs single font
      const font =
        'fonts' in fontOrCollection
          ? fontOrCollection.fonts[0]
          : fontOrCollection;
      if (!font) {
        throw new Error('No font found in file');
      }

      // Get all available characters
      const characters: string[] = [];

      // Try to access characterSet property safely
      const characterSet = (
        font as unknown as { characterSet?: number[] | Set<number> }
      ).characterSet;
      if (!characterSet) {
        console.log(
          chalk.yellow('    ⚠️  Character set not accessible, using fallback')
        );
        return this.getFallbackCharacterSet();
      }

      // Convert to array if it's a Set
      const codePoints = Array.isArray(characterSet)
        ? characterSet
        : Array.from(characterSet);

      for (const codePoint of codePoints) {
        try {
          const char = String.fromCodePoint(codePoint);
          // Skip control characters and invalid characters
          if (codePoint > 31 && char.trim().length > 0) {
            characters.push(char);
          }
        } catch {
          // Skip invalid code points
          continue;
        }
      }

      console.log(chalk.green(`    ✅ Found ${characters.length} characters`));

      // Cache font metrics for faster estimation
      if (characters.length > 0) {
        try {
          const sampleBuffer = await this.createFontSubset(
            fontBuffer,
            characters.slice(0, 100)
          );
          const avgCharSize = sampleBuffer.length / 100;
          this.fontMetricsCache.set(cacheKey, {
            avgCharSize,
            baseSize: sampleBuffer.length * 0.1, // Estimated base font overhead
          });
        } catch {
          // If sampling fails, continue without caching
        }
      }

      return characters.sort();
    } catch (error) {
      console.log(
        chalk.yellow(
          `    ⚠️  Character extraction failed: ${(error as Error).message}`
        )
      );
      return this.getFallbackCharacterSet();
    }
  }

  /**
   * Get fallback character set for Chinese fonts
   */
  private getFallbackCharacterSet(): string[] {
    // Common Chinese characters (simplified + traditional + punctuation)
    const ranges: [number, number][] = [
      [0x4e00, 0x9fff], // CJK Unified Ideographs
      [0x3400, 0x4dbf], // CJK Extension A
      [0xff00, 0xffef], // Halfwidth and Fullwidth Forms
      [0x3000, 0x303f], // CJK Symbols and Punctuation
    ];

    const chars: string[] = [];
    for (const [start, end] of ranges) {
      for (let i = start; i <= Math.min(end, start + 1000); i++) {
        // Limit to avoid too many chars
        try {
          chars.push(String.fromCodePoint(i));
        } catch {
          continue;
        }
      }
    }

    return chars;
  }

  /**
   * Create font subset using subset-font library
   */
  async createFontSubset(
    fontBuffer: Buffer,
    characters: string[],
    options?: { format?: 'woff2' | 'woff' | 'truetype' }
  ): Promise<Buffer> {
    const text = characters.join('');
    const format = options?.format ?? this.config.outputFormat;

    try {
      const subsetBuffer = await subsetFont(fontBuffer, text, {
        targetFormat: format,
        // Additional optimization options
        preserveNameIds: [1, 2, 4, 6], // Keep essential name records
      });

      return Buffer.from(subsetBuffer);
    } catch (error) {
      throw new Error(`Font subsetting failed: ${(error as Error).message}`);
    }
  }

  /**
   * Fast chunk size estimation without creating actual files
   */
  private estimateChunkSize(fontPath: string, charCount: number): number {
    const cacheKey = path.basename(fontPath, path.extname(fontPath));
    const metrics = this.fontMetricsCache.get(cacheKey);

    if (metrics) {
      return metrics.baseSize + metrics.avgCharSize * charCount;
    }

    // Fallback estimation
    const isVariableFont =
      fontPath.includes('[') || fontPath.toLowerCase().includes('variable');
    const avgCharSize = isVariableFont ? 120 : 80; // bytes per character
    const baseSize = isVariableFont ? 8000 : 5000; // base font overhead

    return baseSize + avgCharSize * charCount;
  }

  /**
   * Ultra-fast chunk creation using smart estimation
   */
  async createOptimalChunksUltraFast(
    fontPath: string,
    characters: string[],
    targetChunkSizeKB?: number
  ): Promise<ChunkWithBuffer[]> {
    const fontBuffer = await fs.readFile(fontPath);
    const chunkSize = targetChunkSizeKB ?? this.config.targetChunkSize;
    const targetSizeBytes = chunkSize * 1024;
    const chunks: ChunkWithBuffer[] = [];

    console.log(chalk.blue(`    📦 Creating chunks (target: ${chunkSize}KB)`));

    let currentIndex = 0;
    let remainingChars = [...characters];

    // First, create a calibration chunk to get accurate metrics
    if (
      remainingChars.length > 100 &&
      !this.fontMetricsCache.has(
        path.basename(fontPath, path.extname(fontPath))
      )
    ) {
      console.log(chalk.gray('    🔬 Calibrating font metrics...'));
      const calibrationChars = remainingChars.slice(0, 100);
      const calibrationBuffer = await this.createFontSubset(
        fontBuffer,
        calibrationChars
      );

      const cacheKey = path.basename(fontPath, path.extname(fontPath));
      this.fontMetricsCache.set(cacheKey, {
        avgCharSize: calibrationBuffer.length / 100,
        baseSize: calibrationBuffer.length * 0.1,
      });
    }

    while (remainingChars.length > 0) {
      // Use smart estimation to get initial chunk size
      let estimatedCharsForTarget = Math.floor(
        targetSizeBytes /
          (this.estimateChunkSize(fontPath, 1) -
            this.estimateChunkSize(fontPath, 0))
      );
      estimatedCharsForTarget = Math.max(
        10,
        Math.min(estimatedCharsForTarget, remainingChars.length)
      );

      // Start with estimated size and adjust once
      let chunkSize = estimatedCharsForTarget;
      let testChars = remainingChars.slice(0, chunkSize);
      let testBuffer = await this.createFontSubset(fontBuffer, testChars);

      // Single adjustment if needed
      if (testBuffer.length > targetSizeBytes && chunkSize > 10) {
        // Too big, reduce by 20%
        chunkSize = Math.floor(chunkSize * 0.8);
        testChars = remainingChars.slice(0, chunkSize);
        testBuffer = await this.createFontSubset(fontBuffer, testChars);
      } else if (
        testBuffer.length < targetSizeBytes * 0.7 &&
        chunkSize < remainingChars.length
      ) {
        // Too small, increase by 30%
        const newSize = Math.min(
          Math.floor(chunkSize * 1.3),
          remainingChars.length
        );
        const newTestChars = remainingChars.slice(0, newSize);
        const newTestBuffer = await this.createFontSubset(
          fontBuffer,
          newTestChars
        );

        if (newTestBuffer.length <= targetSizeBytes) {
          chunkSize = newSize;
          testChars = newTestChars;
          testBuffer = newTestBuffer;
        }
      }

      // Generate Unicode ranges for CSS
      const unicodeRanges = this.generateUnicodeRanges(testChars);

      chunks.push({
        chunkIndex: currentIndex,
        path: '',
        filename: '',
        size: testBuffer.length,
        compressionRatio: `${(
          (1 - testBuffer.length / fontBuffer.length) *
          100
        ).toFixed(1)}%`,
        unicodeRanges,
        characterCount: testChars.length,
        buffer: testBuffer,
      });

      console.log(
        chalk.green(
          `    ✅ Chunk ${currentIndex}: ${testChars.length} chars, ${(
            testBuffer.length / 1024
          ).toFixed(1)}KB`
        )
      );

      remainingChars = remainingChars.slice(chunkSize);
      currentIndex++;
    }

    return chunks;
  }

  /**
   * Generate Unicode ranges for CSS
   */
  private generateUnicodeRanges(characters: string[]): string[] {
    const codePoints = characters
      .map((char) => char.codePointAt(0))
      .filter((cp): cp is number => cp !== undefined)
      .sort((a, b) => a - b);

    if (codePoints.length === 0) return [];

    const ranges: string[] = [];
    let start: number | undefined = codePoints[0];
    let end: number | undefined = codePoints[0];

    for (let i = 1; i < codePoints.length; i++) {
      if (end !== undefined && codePoints[i] === end + 1) {
        end = codePoints[i];
      } else {
        // Add range
        if (start !== undefined && end !== undefined) {
          if (start === end) {
            ranges.push(
              `U+${start.toString(16).toUpperCase().padStart(4, '0')}`
            );
          } else {
            ranges.push(
              `U+${start.toString(16).toUpperCase().padStart(4, '0')}-${end
                .toString(16)
                .toUpperCase()
                .padStart(4, '0')}`
            );
          }
        }
        start = end = codePoints[i];
      }
    }

    // Add final range
    if (start !== undefined && end !== undefined) {
      if (start === end) {
        ranges.push(`U+${start.toString(16).toUpperCase().padStart(4, '0')}`);
      } else {
        ranges.push(
          `U+${start.toString(16).toUpperCase().padStart(4, '0')}-${end
            .toString(16)
            .toUpperCase()
            .padStart(4, '0')}`
        );
      }
    }

    return ranges;
  }

  /**
   * Process a single Chinese font with ultra-fast chunking
   */
  async processChineseFont(
    fontId: string,
    fontConfig: FontConfig,
    inputPath: string,
    styleOverride?: string
  ): Promise<(ChunkResult & { style: string })[]> {
    const fileName = path.basename(inputPath);
    const style = styleOverride ?? fontConfig.style ?? 'regular';

    console.log(
      chalk.blue(`  📝 Processing font: ${fontConfig.displayName} (${style})`)
    );
    console.log(chalk.gray(`    📁 File: ${fileName}`));

    // Extract characters from font
    const characters = await this.extractFontCharacters(inputPath);
    if (characters.length === 0) {
      console.log(chalk.yellow('    ⚠️  No characters found, skipping'));
      return [];
    }

    // Create chunks using ultra-fast method with per-font chunk size
    const chunks = await this.createOptimalChunksUltraFast(
      inputPath,
      characters,
      fontConfig.subset.maxChunkSizeKB
    );

    // Save chunks to files in parallel
    const fontDir = path.join(this.outputDir, 'fonts', fontId);
    await fs.ensureDir(fontDir);

    // Process chunks in parallel batches
    const results: (ChunkResult & { style: string })[] = [];
    const chunkBatches = this.createBatches(chunks, MAX_CONCURRENT_CHUNKS);

    for (const batch of chunkBatches) {
      const batchPromises = batch.map(async (chunk) => {
        const filename =
          fontConfig.output.filenamePattern
            .replace('{index}', chunk.chunkIndex.toString())
            .replace('{style}', style) + `.${this.config.outputFormat}`;

        const outputPath = path.join(fontDir, filename);

        // Save chunk buffer to file
        await fs.writeFile(outputPath, chunk.buffer);

        return {
          chunkIndex: chunk.chunkIndex,
          path: outputPath,
          filename,
          size: chunk.size,
          compressionRatio: chunk.compressionRatio,
          unicodeRanges: chunk.unicodeRanges,
          characterCount: chunk.characterCount,
          style, // Include style for metadata
        };
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    console.log(
      chalk.green(`    ✅ Created ${results.length} chunks for ${style}`)
    );
    return results;
  }

  /**
   * Save chunk metadata to JSON file for CSS generator
   */
  private async saveChunkMetadata(
    fontId: string,
    fontConfig: FontConfig,
    allChunks: (ChunkResult & { style: string })[]
  ): Promise<void> {
    const fontDir = path.join(this.outputDir, 'fonts', fontId);
    const metadataPath = path.join(fontDir, 'chunks.json');

    const metadata = {
      fontId,
      displayName: fontConfig.displayName,
      generatedAt: new Date().toISOString(),
      chunks: allChunks.map((chunk) => ({
        chunkIndex: chunk.chunkIndex,
        filename: chunk.filename,
        style: chunk.style,
        size: chunk.size,
        unicodeRanges: chunk.unicodeRanges,
        characterCount: chunk.characterCount,
      })),
      totalChunks: allChunks.length,
      totalSize: allChunks.reduce((sum, chunk) => sum + chunk.size, 0),
    };

    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    console.log(chalk.gray(`    💾 Saved metadata: chunks.json`));
  }

  /**
   * Process all fonts with maximum parallel execution
   */
  async processAll(): Promise<void> {
    const config = await this.loadConfig();
    const downloadedFonts = await this.getDownloadedFonts();

    console.log(
      chalk.blue(
        `📚 Processing ${downloadedFonts.length} fonts with optimized method`
      )
    );

    // Process fonts in parallel batches
    const batches = this.createBatches(downloadedFonts, MAX_CONCURRENT_FONTS);

    for (const batch of batches) {
      const batchPromises = batch.map(async (fontId: string) => {
        try {
          const fontConfig = config.fonts[fontId];
          if (!fontConfig) {
            console.log(chalk.yellow(`  ⚠️  No config found for ${fontId}`));
            return;
          }

          const downloadResult = await this.getDownloadResult(fontId);
          if (!downloadResult?.files?.length) {
            console.log(
              chalk.yellow(`  ⚠️  No downloaded files for ${fontId}`)
            );
            return;
          }

          // Process all files for this font (handle multiple styles like Amstelvar)
          const allChunks: (ChunkResult & { style: string })[] = [];
          let totalChunks = 0;
          for (const file of downloadResult.files) {
            const inputPath = file.path;
            const styleOverride = file.style; // Get style from file if available

            const results = await this.processChineseFont(
              fontId,
              fontConfig,
              inputPath,
              styleOverride
            );

            allChunks.push(...results);
            totalChunks += results.length;
          }

          // Save combined metadata for all styles
          if (allChunks.length > 0) {
            await this.saveChunkMetadata(fontId, fontConfig, allChunks);
          }

          console.log(
            chalk.green(`  ✅ ${fontId}: ${totalChunks} total chunks created`)
          );
        } catch (error) {
          console.log(chalk.red(`  ❌ ${fontId}: ${(error as Error).message}`));
        }
      });

      await Promise.all(batchPromises);
    }

    console.log(chalk.green('🎉 All fonts processed successfully!'));
  }

  /**
   * Process specific fonts by their IDs
   */
  async processSpecific(fontIds: string[]): Promise<void> {
    const config = await this.loadConfig();

    console.log(chalk.blue(`📚 Processing ${fontIds.length} specific fonts`));

    // Process fonts in parallel batches
    const batches = this.createBatches(fontIds, MAX_CONCURRENT_FONTS);

    for (const batch of batches) {
      const batchPromises = batch.map(async (fontId: string) => {
        try {
          const fontConfig = config.fonts[fontId];
          if (!fontConfig) {
            console.log(chalk.yellow(`  ⚠️  No config found for ${fontId}`));
            return;
          }

          const downloadResult = await this.getDownloadResult(fontId);
          if (!downloadResult?.files?.length) {
            console.log(
              chalk.yellow(`  ⚠️  No downloaded files for ${fontId}`)
            );
            return;
          }

          // Process all files for this font (handle multiple styles like Amstelvar)
          const allChunks: (ChunkResult & { style: string })[] = [];
          let totalChunks = 0;
          for (const file of downloadResult.files) {
            const inputPath = file.path;
            const styleOverride = file.style; // Get style from file if available

            const results = await this.processChineseFont(
              fontId,
              fontConfig,
              inputPath,
              styleOverride
            );

            allChunks.push(...results);
            totalChunks += results.length;
          }

          // Save combined metadata for all styles
          if (allChunks.length > 0) {
            await this.saveChunkMetadata(fontId, fontConfig, allChunks);
          }

          console.log(
            chalk.green(`  ✅ ${fontId}: ${totalChunks} total chunks created`)
          );
        } catch (error) {
          console.log(chalk.red(`  ❌ ${fontId}: ${(error as Error).message}`));
        }
      });

      await Promise.all(batchPromises);
    }

    console.log(chalk.green('🎉 Specific fonts processed successfully!'));
  }

  /**
   * Utility methods
   */
  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  async getDownloadedFonts(): Promise<string[]> {
    try {
      const downloadedDir = this.downloadDir;
      const items = await fs.readdir(downloadedDir);

      const fonts: string[] = [];
      for (const item of items) {
        const itemPath = path.join(downloadedDir, item);
        const stat = await fs.stat(itemPath);
        if (stat.isDirectory()) {
          fonts.push(item);
        }
      }

      return fonts.sort();
    } catch {
      console.log(chalk.yellow(`⚠️  Failed to read downloads directory`));
      return [];
    }
  }

  async getDownloadResult(
    fontId: string
  ): Promise<{ files: Array<{ path: string; style?: string }> } | null> {
    try {
      const fontDir = path.join(this.downloadDir, fontId);
      const files = await fs.readdir(fontDir);

      const fontFiles = files
        .filter((file) => file.endsWith('.ttf') || file.endsWith('.otf'))
        .map((file) => {
          // Extract style from filename like the original implementation
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

      return { files: fontFiles };
    } catch {
      return null;
    }
  }
}

export default FontSubset;

// Main execution block for command line usage
if (import.meta.url === new URL(process.argv[1] ?? '', 'file:').href) {
  const fontSubset = new FontSubset();

  // Check if specific fonts are requested via command line args
  const targetFonts = process.argv.slice(2);

  async function run() {
    try {
      await fontSubset.init();

      if (targetFonts.length > 0) {
        console.log(
          chalk.bold.blue(
            `🚀 Starting font subsetting for: ${targetFonts.join(', ')}\n`
          )
        );
        await fontSubset.processSpecific(targetFonts);
      } else {
        console.log(
          chalk.bold.blue('🚀 Starting font subsetting for all fonts\n')
        );
        await fontSubset.processAll();
      }

      console.log(chalk.bold.green('\n🎉 Font subsetting completed!'));
    } catch (error) {
      console.error(
        chalk.red('❌ Font subsetting failed:'),
        (error as Error).message
      );
      process.exit(1);
    }
  }

  run();
}
