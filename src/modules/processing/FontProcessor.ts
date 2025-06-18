// Main font processor service
import fs from 'fs-extra';
import path from 'path';
import { cpus } from 'os';
import { BaseService } from '@/core/base/BaseService.js';
import { ErrorHandler } from '@/core/services/ErrorHandler.js';
import { CharacterExtractor } from './CharacterExtractor.js';
import { FontSubsetService } from './FontSubsetService.js';
import { UnicodeRangeGenerator } from './UnicodeRangeGenerator.js';
import type { IFontProcessor } from '@/core/interfaces/IFontProcessor.js';
import type { FontConfig } from '@/types/config.js';
import type {
  ProcessingResult,
  ProcessingOptions,
  ChunkMetadata,
  FontSubsetConfig,
  ChunkWithBuffer,
} from './types.js';

export class FontProcessor extends BaseService implements IFontProcessor {
  private characterExtractor: CharacterExtractor;
  private subsetService: FontSubsetService;
  private unicodeGenerator: UnicodeRangeGenerator;
  private options: ProcessingOptions;

  // Performance optimizations
  private readonly maxConcurrentFonts: number;

  constructor(
    private downloadDir: string,
    private outputDir: string,
    private fontConfigs: Record<string, FontConfig>,
    options?: ProcessingOptions
  ) {
    super('FontProcessor');

    this.options = {
      maxConcurrentFonts: Math.min(cpus().length, 4),
      maxConcurrentChunks: Math.min(cpus().length * 2, 8),
      outputFormat: 'woff2',
      targetChunkSize: 64,
      ...options,
    };

    this.maxConcurrentFonts = this.options.maxConcurrentFonts!;

    this.characterExtractor = new CharacterExtractor();
    this.subsetService = new FontSubsetService({
      outputFormat: this.options.outputFormat,
      targetChunkSize: this.options.targetChunkSize,
    } as FontSubsetConfig);
    this.unicodeGenerator = new UnicodeRangeGenerator();
  }

  /**
   * Initialize the processor
   */
  async init(): Promise<void> {
    await fs.ensureDir(this.outputDir);
    this.log('Font Processor initialized');
  }

  /**
   * Process all available fonts
   */
  async processAll(): Promise<void> {
    try {
      const downloadedFonts = await this.getDownloadedFonts();
      this.log(
        `Processing ${downloadedFonts.length} fonts with optimized method`
      );

      // Process fonts in parallel batches
      const batches = this.createBatches(
        downloadedFonts,
        this.maxConcurrentFonts
      );

      for (const batch of batches) {
        const batchPromises = batch.map(async (fontId: string) => {
          try {
            await this.processSingleFont(fontId);
          } catch (error) {
            ErrorHandler.handle(error, `Processing font ${fontId}`);
            this.log(
              `❌ ${fontId}: ${
                error instanceof Error ? error.message : 'Unknown error'
              }`,
              'error'
            );
          }
        });

        await Promise.all(batchPromises);
      }

      this.log('🎉 All fonts processed successfully!');
    } catch (error) {
      ErrorHandler.handle(error, 'Processing all fonts');
      throw error;
    }
  }

  /**
   * Process specific fonts by their IDs
   */
  async processSpecific(fontIds: string[]): Promise<void> {
    try {
      this.log(`Processing ${fontIds.length} specific fonts`);

      // Process fonts in parallel batches
      const batches = this.createBatches(fontIds, this.maxConcurrentFonts);

      for (const batch of batches) {
        const batchPromises = batch.map(async (fontId: string) => {
          try {
            await this.processSingleFont(fontId);
          } catch (error) {
            ErrorHandler.handle(error, `Processing specific font ${fontId}`);
            this.log(
              `❌ ${fontId}: ${
                error instanceof Error ? error.message : 'Unknown error'
              }`,
              'error'
            );
          }
        });

        await Promise.all(batchPromises);
      }

      this.log('🎉 Specific fonts processed successfully!');
    } catch (error) {
      ErrorHandler.handle(error, 'Processing specific fonts');
      throw error;
    }
  }

  /**
   * Process a single font
   */
  private async processSingleFont(fontId: string): Promise<void> {
    const fontConfig = this.fontConfigs[fontId];
    if (!fontConfig) {
      this.log(`⚠️ No config found for ${fontId}`, 'warn');
      return;
    }

    const downloadResult = await this.getDownloadResult(fontId);
    if (!downloadResult?.files?.length) {
      this.log(`⚠️ No downloaded files for ${fontId}`, 'warn');
      return;
    }

    // Process all files for this font (handle multiple styles)
    const allChunks: (ChunkWithBuffer & { style: string })[] = [];
    let totalChunks = 0;

    for (const file of downloadResult.files) {
      const inputPath = file.path;
      const style = file.style ?? 'regular';

      const result = await this.processFont(
        fontId,
        fontConfig,
        inputPath,
        style
      );
      if (result) {
        allChunks.push(...result.chunks.map((chunk) => ({ ...chunk, style })));
        totalChunks += result.chunks.length;
      }
    }

    // Save combined metadata for all styles
    if (allChunks.length > 0) {
      await this.saveChunkMetadata(fontId, fontConfig, allChunks);
    }

    this.log(`✅ ${fontId}: ${totalChunks} total chunks created`);
  }

  /**
   * Process a single font file
   */
  private async processFont(
    fontId: string,
    fontConfig: FontConfig,
    inputPath: string,
    style: string
  ): Promise<ProcessingResult | null> {
    const fileName = path.basename(inputPath);

    this.log(`📝 Processing font: ${fontConfig.displayName} (${style})`);
    this.log(`📁 File: ${fileName}`, 'debug');

    try {
      // Extract characters from font
      const extractionResult = await this.characterExtractor.extractCharacters(
        inputPath
      );
      if (extractionResult.characters.length === 0) {
        this.log('⚠️ No characters found, skipping', 'warn');
        return null;
      }

      // Read font buffer
      const fontBuffer = await fs.readFile(inputPath);

      // Create chunks using ultra-fast method with per-font chunk size
      const chunks = await this.subsetService.createOptimalChunks(
        fontBuffer,
        extractionResult.characters,
        fontConfig.subset.maxChunkSizeKB,
        extractionResult.fontMetrics
      );

      // Generate Unicode ranges for each chunk
      const chunksWithRanges = chunks.map((chunk, index) => {
        const chunkChars = extractionResult.characters.slice(
          index *
            Math.floor(extractionResult.characters.length / chunks.length),
          (index + 1) *
            Math.floor(extractionResult.characters.length / chunks.length)
        );
        return {
          ...chunk,
          unicodeRanges: this.unicodeGenerator.generateRanges(chunkChars),
        };
      });

      // Save chunks to files
      const fontDir = path.join(this.outputDir, 'fonts', fontId);
      const savedChunks = await this.subsetService.saveChunks(
        chunksWithRanges,
        fontDir,
        fontConfig.output.filenamePattern,
        style
      );

      this.log(`✅ Created ${savedChunks.length} chunks for ${style}`);

      const totalSize = savedChunks.reduce((sum, chunk) => sum + chunk.size, 0);

      return {
        fontId,
        style,
        chunks: savedChunks,
        totalSize,
        metadata: {
          fontId,
          displayName: fontConfig.displayName,
          generatedAt: new Date().toISOString(),
          chunks: savedChunks.map((chunk) => ({
            chunkIndex: chunk.index,
            filename: chunk.filename,
            style,
            size: chunk.size,
            unicodeRanges: chunk.unicodeRanges,
            characterCount: chunk.characterCount,
          })),
          totalChunks: savedChunks.length,
          totalSize,
        },
      };
    } catch (error) {
      ErrorHandler.handle(error, `Processing font ${fontId}`);
      throw error;
    }
  }

  /**
   * Save chunk metadata to JSON file for CSS generator
   */
  private async saveChunkMetadata(
    fontId: string,
    fontConfig: FontConfig,
    allChunks: (ChunkWithBuffer & { style: string })[]
  ): Promise<void> {
    const fontDir = path.join(this.outputDir, 'fonts', fontId);
    const metadataPath = path.join(fontDir, 'chunks.json');

    const metadata: ChunkMetadata = {
      fontId,
      displayName: fontConfig.displayName,
      generatedAt: new Date().toISOString(),
      chunks: allChunks.map((chunk) => ({
        chunkIndex: chunk.index,
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
    this.log(`💾 Saved metadata: chunks.json`, 'debug');
  }

  /**
   * Validate output files
   */
  async validateOutput(fontIds?: string[]): Promise<boolean> {
    try {
      const fontsToValidate = fontIds ?? (await this.getDownloadedFonts());
      let allValid = true;

      for (const fontId of fontsToValidate) {
        const fontDir = path.join(this.outputDir, 'fonts', fontId);
        const metadataPath = path.join(fontDir, 'chunks.json');

        if (!(await fs.pathExists(metadataPath))) {
          this.log(`❌ Missing metadata for ${fontId}`, 'error');
          allValid = false;
          continue;
        }

        const metadata = JSON.parse(
          await fs.readFile(metadataPath, 'utf-8')
        ) as ChunkMetadata;

        for (const chunk of metadata.chunks) {
          const chunkPath = path.join(fontDir, chunk.filename);
          if (!(await fs.pathExists(chunkPath))) {
            this.log(`❌ Missing chunk file: ${chunk.filename}`, 'error');
            allValid = false;
          }
        }
      }

      return allValid;
    } catch (error) {
      ErrorHandler.handle(error, 'Validating output');
      return false;
    }
  }

  /**
   * Clean up temporary files and cache
   */
  async cleanup(): Promise<void> {
    try {
      // Clean up any temporary files if needed
      this.log('Cleanup completed');
    } catch (error) {
      ErrorHandler.handle(error, 'Cleanup');
      throw error;
    }
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

  private async getDownloadedFonts(): Promise<string[]> {
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
      this.log(`⚠️ Failed to read downloads directory`, 'warn');
      return [];
    }
  }

  private async getDownloadResult(
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
