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
    inputPath: string
  ): Promise<ChunkResult[]> {
    console.log(chalk.blue(`    🧩 Using chunked processing...`));

    const fontDir = path.join(this.outputDir, 'fonts', fontId);
    const results: ChunkResult[] = [];

    // Generate optimal chunks
    const chunks = await this.generateOptimalChunks(inputPath, fontConfig);

    for (const chunk of chunks) {
      const outputFileName =
        fontConfig.output.filenamePattern
          .replace('{index}', chunk.index.toString())
          .replace('{style}', 'regular') + '.woff2';
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

    // For variable fonts, process one input file
    const inputFile = inputFiles.files[0];
    if (!inputFile) {
      throw new Error(`No input file found for variable font ${fontId}`);
    }

    // Check if this is a chunked font configuration
    if (fontConfig.subset.type === 'size-based-chunks') {
      return await this.processChunkedVariableFont(
        fontId,
        fontConfig,
        inputFile
      );
    }

    // Single variable font file
    const outputFileName =
      fontConfig.output.filenamePattern.replace('{style}', 'variable') +
      '.woff2';
    const outputPath = path.join(fontDir, outputFileName);

    // Check if output file already exists
    if (await fs.pathExists(outputPath)) {
      const stats = await fs.stat(outputPath);
      console.log(
        chalk.green(`    ⏭️  Variable font already exists: ${outputFileName}`)
      );
      console.log(chalk.gray(`    Size: ${(stats.size / 1024).toFixed(1)}KB`));

      return [
        {
          chunkIndex: 0,
          path: outputPath,
          filename: outputFileName,
          size: stats.size,
          compressionRatio: 'N/A (existing)',
          unicodeRanges: ['U+0000-FFFF'],
          characterCount: 0,
        },
      ];
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

      return [
        {
          chunkIndex: 0,
          path: outputPath,
          filename: outputFileName,
          size: stats.size,
          compressionRatio: parseFloat(compressionRatio),
          unicodeRanges: ['U+0000-FFFF'],
          characterCount: 0,
        },
      ];
    } catch (error) {
      console.error(
        chalk.red(`    ❌ Failed to process variable font:`),
        (error as Error).message
      );
      throw error;
    }
  }

  async processChunkedVariableFont(
    fontId: string,
    fontConfig: FontConfig,
    inputFile: { path: string; style?: string }
  ): Promise<ChunkResult[]> {
    console.log(chalk.blue(`    🧩 Using chunked variable font processing...`));

    const fontDir = path.join(this.outputDir, 'fonts', fontId);
    const results: ChunkResult[] = [];

    // Generate optimal chunks for variable font
    const chunks = await this.generateOptimalChunks(inputFile.path, fontConfig);

    for (const chunk of chunks) {
      const outputFileName =
        fontConfig.output.filenamePattern
          .replace('{index}', chunk.index.toString())
          .replace('{style}', 'variable') + '.woff2';
      const outputPath = path.join(fontDir, outputFileName);

      // Check if chunk file already exists
      if (await fs.pathExists(outputPath)) {
        const stats = await fs.stat(outputPath);
        console.log(
          chalk.green(
            `    ⏭️  Variable chunk ${chunk.index} already exists: ${outputFileName}`
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
            `    ✅ Created variable chunk ${chunk.index}: ${outputFileName}`
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
        });
      } catch (error) {
        console.error(
          chalk.red(`    ❌ Failed to process variable chunk ${chunk.index}:`),
          (error as Error).message
        );
        throw error;
      }
    }

    console.log(
      chalk.green(
        `    ✅ Completed variable font chunked processing: ${results.length} chunks`
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

          await this.processFont(fontId, fontConfig, downloadResult);
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

          await this.processFont(fontId, fontConfig, downloadResult);
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
        .map((file) => ({
          path: path.join(fontDir, file),
          style: file.includes('italic') ? 'italic' : 'regular',
        }));

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

    // Sort by frequency (most frequent first)
    const sortedChars = availableChars.sort(
      (a, b) => (characterFrequency[b] ?? 0) - (characterFrequency[a] ?? 0)
    );

    const chunks: ChunkData[] = [];
    const chunkSizes = fontConfig.subset.chunkSizes ?? [50000, 30000, 20000];
    const maxChunks = fontConfig.subset.maxChunks ?? 10;

    let currentIndex = 0;
    let currentChunkSize = 0;
    let currentChunk: string[] = [];

    for (const char of sortedChars) {
      currentChunk.push(char);
      currentChunkSize += this.estimateCharacterSize(char);

      // Check if we should create a new chunk
      const targetSize =
        chunkSizes[Math.min(currentIndex, chunkSizes.length - 1)] ?? 50000;
      if (currentChunkSize >= targetSize || currentChunk.length >= 1000) {
        chunks.push({
          index: currentIndex,
          characters: [...currentChunk],
          unicodeRanges: this.generateUnicodeRangesFromChars(currentChunk),
        });

        currentIndex++;
        currentChunk = [];
        currentChunkSize = 0;

        if (currentIndex >= maxChunks) {
          break;
        }
      }
    }

    // Add remaining characters to the last chunk
    if (currentChunk.length > 0 && currentIndex < maxChunks) {
      chunks.push({
        index: currentIndex,
        characters: currentChunk,
        unicodeRanges: this.generateUnicodeRangesFromChars(currentChunk),
      });
    }

    console.log(
      chalk.green(`    ✅ Generated ${chunks.length} optimal chunks`)
    );
    return chunks;
  }

  async loadCharacterFrequency(): Promise<Record<string, number>> {
    try {
      if (await fs.pathExists(this.characterFrequencyPath)) {
        return await fs.readJson(this.characterFrequencyPath);
      }
      // Return default frequency data
      return this.getDefaultCharacterFrequency();
    } catch (_error) {
      console.log(chalk.yellow('⚠️  Using default character frequency data'));
      return this.getDefaultCharacterFrequency();
    }
  }

  getDefaultCharacterFrequency(): Record<string, number> {
    // Basic frequency data for common Chinese characters
    const commonChars =
      '的一是在不了有和人这中大为上个国我以要他时来用你年生会自然后能对立事三之通此为也之'.split(
        ''
      );
    const frequency: Record<string, number> = {};

    commonChars.forEach((char, index) => {
      frequency[char] = 1000 - index;
    });

    return frequency;
  }

  estimateCharacterSize(_char: string): number {
    // Simplified character size estimation
    return 100; // bytes per character (rough estimate)
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
