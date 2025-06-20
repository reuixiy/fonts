// Main font subsetting service using cn-font-split
import fs from 'fs-extra';
import path from 'path';
import { fontSplit } from 'cn-font-split';
import { BaseService } from '@/core/base/BaseService.js';
import { ErrorHandler } from '@/core/services/ErrorHandler.js';
import type { IFontSubsetter } from '@/core/interfaces/IFontSubsetter.js';
import type { FontConfig } from '@/types/config.js';
import type {
  SubsettingResult,
  ChunksMetadata,
  Chunk,
  ChunkInfo,
  FontFile,
  DownloadResult,
  FontStyle,
} from '@/modules/subset/types.js';
import {
  SUPPORTED_FONT_EXTENSIONS,
  STYLE_PATTERNS,
  CSS_REGEX,
} from '@/modules/subset/types.js';

export class FontSubsetter extends BaseService implements IFontSubsetter {
  constructor(
    private readonly downloadDir: string,
    private readonly outputDir: string,
    private readonly fontConfigs: Record<string, FontConfig>
  ) {
    super('FontSubsetter');
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
      this.log(`Processing ${downloadedFonts.length} fonts`);

      await this.processFontsInBatches(downloadedFonts);
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
      await this.processFontsInBatches(fontIds);
      this.log('🎉 Specific fonts processed successfully!');
    } catch (error) {
      ErrorHandler.handle(error, 'Processing specific fonts');
      throw error;
    }
  }

  /**
   * Validate output files - simplified version
   */
  async validateOutput(fontIds?: string[]): Promise<boolean> {
    try {
      const fontsToValidate = fontIds ?? (await this.getDownloadedFonts());

      for (const fontId of fontsToValidate) {
        const fontDir = path.join(this.outputDir, 'fonts', fontId);
        if (!(await fs.pathExists(fontDir))) {
          this.log(`❌ Missing font directory for ${fontId}`, 'error');
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clean up temporary files and cache
   */
  async cleanup(): Promise<void> {
    try {
      this.log('Cleanup completed');
    } catch (error) {
      ErrorHandler.handle(error, 'Cleanup');
      throw error;
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Process fonts in parallel batches
   */
  private async processFontsInBatches(fontIds: string[]): Promise<void> {
    const batches = this.createBatches(fontIds, fontIds.length);

    for (const batch of batches) {
      const batchPromises = batch.map(async (fontId: string) => {
        try {
          await this.processSingleFont(fontId);
        } catch (error) {
          this.handleFontProcessingError(fontId, error);
        }
      });

      await Promise.all(batchPromises);
    }
  }

  /**
   * Handle font processing errors consistently
   */
  private handleFontProcessingError(fontId: string, error: unknown): void {
    ErrorHandler.handle(error, `Processing font ${fontId}`);
    this.log(
      `❌ ${fontId}: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      'error'
    );
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

    const totalChunks = await this.processAllFontFiles(
      fontId,
      fontConfig,
      downloadResult.files
    );
    this.log(`✅ ${fontId}: ${totalChunks} total chunks created`);
  }

  /**
   * Process all font files for a single font family
   */
  private async processAllFontFiles(
    fontId: string,
    fontConfig: FontConfig,
    files: FontFile[]
  ): Promise<number> {
    let totalChunks = 0;

    for (const file of files) {
      const style = file.style ?? 'regular';
      const result = await this.processFont(
        fontId,
        fontConfig,
        file.path,
        style
      );

      if (result) {
        totalChunks += result.chunks.length;
      }
    }

    return totalChunks;
  }

  /**
   * Process a single font file using cn-font-split
   */
  private async processFont(
    fontId: string,
    fontConfig: FontConfig,
    inputPath: string,
    style: FontStyle
  ): Promise<SubsettingResult | null> {
    const fileName = path.basename(inputPath);

    this.log(`📝 Processing font: ${fontConfig.displayName} (${style})`);
    this.log(`📁 File: ${fileName}`, 'debug');

    try {
      const outputDir = this.determineOutputDirectory(fontId, style);
      await fs.ensureDir(outputDir);

      // Process font with cn-font-split
      await this.splitFont(inputPath, outputDir, fontId, style);

      // Create and save metadata
      const result = await this.createFontResult(
        fontId,
        fontConfig,
        outputDir,
        style
      );

      if (result) {
        this.log(`✅ Created ${result.chunks.length} chunks for ${style}`);
      } else {
        this.log('⚠️ No chunks generated, skipping', 'warn');
      }

      return result;
    } catch (error) {
      ErrorHandler.handle(error, `Processing font ${fontId}`);
      throw error;
    }
  }

  /**
   * Determine the output directory for a font style
   */
  private determineOutputDirectory(fontId: string, style: FontStyle): string {
    const fontDir = path.join(this.outputDir, 'fonts', fontId);
    return style !== 'regular' ? path.join(fontDir, style) : fontDir;
  }

  /**
   * Split font using cn-font-split
   */
  private async splitFont(
    inputPath: string,
    outputDir: string,
    fontId: string,
    style: FontStyle
  ): Promise<void> {
    const inputBuffer = new Uint8Array(await fs.readFile(inputPath));

    await fontSplit({
      input: inputBuffer,
      outDir: outputDir,
      css: {
        fileName: `${fontId}${style !== 'regular' ? `-${style}` : ''}.css`,
        compress: false,
        commentUnicodes: true,
      },
      testHtml: false,
      reporter: false,
      renameOutputFont: '[index].[ext]',
      silent: true,
    });
  }

  /**
   * Create font result with metadata from generated files
   */
  private async createFontResult(
    fontId: string,
    fontConfig: FontConfig,
    outputDir: string,
    style: FontStyle
  ): Promise<SubsettingResult | null> {
    const files = await fs.readdir(outputDir);
    const cssFile = files.find((file) => file.endsWith('.css'));

    if (!cssFile) {
      return null;
    }

    // Parse CSS to extract all chunk information
    const cssContent = await fs.readFile(
      path.join(outputDir, cssFile),
      'utf-8'
    );
    const chunkInfoFromCSS = this.extractChunkInfoFromCSS(cssContent);

    if (chunkInfoFromCSS.length === 0) {
      return null;
    }

    // Convert to Chunk format
    const chunks = await this.createChunksFromCSSInfo(
      chunkInfoFromCSS,
      outputDir
    );
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0); // Sum in KB since chunk.size is already in KB

    // Save metadata
    const metadata = this.createMetadata(
      fontId,
      fontConfig,
      chunks,
      totalSize,
      style
    );
    await this.saveMetadata(outputDir, metadata);

    // Clean up temporary files
    await this.cleanupTemporaryFiles(outputDir);

    return {
      fontId,
      style,
      chunks,
      totalSize,
      metadata,
    };
  }

  /**
   * Extract chunk information directly from CSS file
   */
  private extractChunkInfoFromCSS(cssContent: string): ChunkInfo[] {
    const chunkInfo: ChunkInfo[] = [];

    let match;
    while ((match = CSS_REGEX.fontFace.exec(cssContent)) !== null) {
      const fontFaceBlock = match[0];

      // Extract src URL and unicode range
      const srcMatch = CSS_REGEX.src.exec(fontFaceBlock);
      const unicodeMatch = CSS_REGEX.unicodeRange.exec(fontFaceBlock);

      if (srcMatch && unicodeMatch) {
        const filename = srcMatch[1]; // e.g., "10.woff2"
        const rangeString = unicodeMatch[1].trim();
        const unicodeRanges = rangeString.split(',').map((r) => r.trim());

        // Extract index from filename
        const indexMatch = filename.match(/^(\d+)\./);
        const index = indexMatch ? parseInt(indexMatch[1], 10) : 0;

        chunkInfo.push({
          index,
          filename,
          unicodeRanges,
          characterCount: this.estimateCharacterCount(unicodeRanges),
        });
      }
    }

    // Sort by index to ensure correct order
    return chunkInfo.sort((a, b) => a.index - b.index);
  }

  /**
   * Create chunks from CSS-extracted information
   */
  private async createChunksFromCSSInfo(
    chunkInfoFromCSS: ChunkInfo[],
    outputDir: string
  ): Promise<Chunk[]> {
    const chunks: Chunk[] = [];

    for (const info of chunkInfoFromCSS) {
      const chunkPath = path.join(outputDir, info.filename);

      // Only read file size, not full buffer to save memory
      let size: number;

      try {
        const stats = await fs.stat(chunkPath);
        size = stats.size;
      } catch {
        // If file doesn't exist, skip
        continue;
      }

      chunks.push({
        index: info.index,
        filename: info.filename,
        path: chunkPath,
        size: this.bytesToKB(size), // Convert to KB
        unicodeRanges: info.unicodeRanges,
        characterCount: info.characterCount,
      });
    }

    return chunks;
  }

  /**
   * Create metadata object
   */
  private createMetadata(
    fontId: string,
    fontConfig: FontConfig,
    chunks: Chunk[],
    totalSize: number,
    style: FontStyle
  ): ChunksMetadata {
    return {
      fontId,
      displayName: fontConfig.displayName,
      generatedAt: new Date().toISOString(),
      chunks: chunks.map((chunk) => ({
        chunkIndex: chunk.index,
        filename: chunk.filename,
        style,
        size: chunk.size,
        unicodeRanges: chunk.unicodeRanges,
        characterCount: chunk.characterCount,
      })),
      totalChunks: chunks.length,
      totalSize,
    };
  }

  /**
   * Save metadata to file
   */
  private async saveMetadata(
    outputDir: string,
    metadata: ChunksMetadata
  ): Promise<void> {
    const metadataPath = path.join(outputDir, 'chunks.json');
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    this.log(
      `💾 Saved metadata for ${metadata.chunks[0]?.style || 'unknown'}: ${
        metadata.totalChunks
      } chunks, ${metadata.totalSize}KB total`,
      'debug'
    );
  }

  /**
   * Clean up temporary files after metadata generation
   */
  private async cleanupTemporaryFiles(outputDir: string): Promise<void> {
    try {
      const files = await fs.readdir(outputDir);

      // Files to remove after chunks.json is generated
      const filesToRemove = files.filter(
        (file) => file.endsWith('.css') || file === 'index.proto'
      );

      for (const file of filesToRemove) {
        const filePath = path.join(outputDir, file);
        await fs.remove(filePath);
        this.log(`🗑️ Removed temporary file: ${file}`, 'debug');
      }

      if (filesToRemove.length > 0) {
        this.log(
          `✨ Cleaned up ${filesToRemove.length} temporary files`,
          'debug'
        );
      }
    } catch (error) {
      this.log(
        `⚠️ Failed to clean up temporary files: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        'warn'
      );
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Create batches from an array
   */
  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Get list of downloaded font directories
   */
  private async getDownloadedFonts(): Promise<string[]> {
    try {
      const items = await fs.readdir(this.downloadDir);
      const fonts: string[] = [];

      for (const item of items) {
        const itemPath = path.join(this.downloadDir, item);
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

  /**
   * Get download result for a specific font
   */
  private async getDownloadResult(
    fontId: string
  ): Promise<DownloadResult | null> {
    try {
      const fontDir = path.join(this.downloadDir, fontId);
      const files = await fs.readdir(fontDir);

      const fontFiles = files
        .filter((file) => this.isSupportedFontFile(file))
        .map((file) => ({
          path: path.join(fontDir, file),
          style: this.extractStyleFromFilename(file),
        }));

      return { files: fontFiles };
    } catch {
      return null;
    }
  }

  /**
   * Check if file is a supported font file
   */
  private isSupportedFontFile(filename: string): boolean {
    const extension = path.extname(filename).toLowerCase();
    return SUPPORTED_FONT_EXTENSIONS.includes(
      extension as (typeof SUPPORTED_FONT_EXTENSIONS)[number]
    );
  }

  /**
   * Extract style from filename
   */
  private extractStyleFromFilename(filename: string): FontStyle {
    const lowerFilename = filename.toLowerCase();

    for (const [style, pattern] of Object.entries(STYLE_PATTERNS)) {
      if (pattern.test(lowerFilename)) {
        return style;
      }
    }

    return 'regular';
  }

  /**
   * Estimate character count from unicode ranges
   */
  private estimateCharacterCount(unicodeRanges: string[]): number {
    let count = 0;

    for (const range of unicodeRanges) {
      if (range.includes('-')) {
        // Range like "U+4E00-9FFF"
        const parts = range.replace('U+', '').split('-');
        if (parts.length === 2) {
          const start = parseInt(parts[0], 16);
          const end = parseInt(parts[1], 16);
          count += Math.max(0, end - start + 1);
        }
      } else {
        // Single character like "U+4E00"
        count += 1;
      }
    }

    return count;
  }

  /**
   * Convert bytes to KB (rounded)
   */
  private bytesToKB(bytes: number): number {
    return Math.round(bytes / 1024);
  }
}
