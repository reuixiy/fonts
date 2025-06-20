// Main CSS generator service
import fs from 'fs-extra';
import path from 'path';
import { BaseService } from '@/core/base/BaseService.js';
import { ErrorHandler } from '@/core/services/ErrorHandler.js';
import { FontFaceGenerator } from '@/modules/css/FontFaceGenerator.js';
import { CSSMinifier } from '@/modules/css/CSSMinifier.js';
import { UnifiedCSSGenerator } from '@/modules/css/UnifiedCSSGenerator.js';
import { ConfigManager } from '@/config/index.js';
import type { ICSSGenerator } from '@/core/interfaces/ICSSGenerator.js';
import type { FontConfig } from '@/types/config.js';
import type {
  CSSResult,
  AllResults,
  FontProcessingResult,
  CSSGeneratorConfig,
  ChunkWithUnicodeRanges,
  ProcessingMetadata,
} from '@/modules/css/types.js';

// Constants
const DEFAULT_CONFIG = {
  outputDir: path.join(process.cwd(), 'build'),
  cssDir: path.join(process.cwd(), 'build', 'css'),
  template: 'standard' as const,
  minify: true,
  baseUrl: '../fonts',
};

const SUPPORTED_FONT_EXTENSIONS = ['.woff2', '.woff', '.ttf'] as const;
const STYLE_PATTERNS = {
  italic: /italic/i,
  roman: /roman/i,
  bold: /bold/i,
  light: /light/i,
} as const;

const FILE_NAMES = {
  metadata: 'chunks.json',
  unifiedCSS: 'fonts.css',
  unifiedMinCSS: 'fonts.min.css',
} as const;

const CSS_TEMPLATE = {
  header: (
    fontId: string,
    fontConfig: FontConfig,
    currentDateTime: string
  ) => `/*!
 * ${fontConfig.displayName} - Font CSS
 * 
 * Font ID: ${fontId}
 * Display Name: ${fontConfig.displayName}
 * License: ${fontConfig.license.type}
 * License URL: ${fontConfig.license.url}
 * 
 * Generated: ${currentDateTime}
 * Generator: https://github.com/reuixiy/fonts
 */

`,
  unifiedHeader: (availableFonts: string[], currentDateTime: string) => `/*!
 * Chinese Fonts CSS - Unified Import-Based Stylesheet (Minified)
 * 
 * This file imports individual minified font CSS files with their respective licenses.
 * See individual CSS files for specific font license information.
 * 
 * Generated: ${currentDateTime}
 * Generator: https://github.com/reuixiy/fonts
 */

/* Available fonts: ${availableFonts.join(', ')} */

`,
} as const;

const FALLBACK_UNICODE_RANGE = 'U+4E00-9FFF'; // Default Chinese range

export class CSSGenerator extends BaseService implements ICSSGenerator {
  private readonly fontFaceGenerator: FontFaceGenerator;
  private readonly minifier: CSSMinifier;
  private readonly unifiedGenerator: UnifiedCSSGenerator;
  private readonly config: CSSGeneratorConfig;

  constructor(options?: Partial<CSSGeneratorConfig>) {
    super('CSSGenerator');

    this.config = {
      ...DEFAULT_CONFIG,
      ...options,
    };

    this.fontFaceGenerator = new FontFaceGenerator();
    this.minifier = new CSSMinifier();
    this.unifiedGenerator = new UnifiedCSSGenerator();
  }

  /**
   * Initialize CSS generator
   */
  async init(): Promise<void> {
    await fs.ensureDir(this.config.cssDir);
    this.log('CSS Generator initialized');
  }

  /**
   * Generate CSS for all fonts
   */
  async generateAll(): Promise<void> {
    try {
      await this.init();

      const processedFonts = await this.getProcessedFonts();
      if (processedFonts.length === 0) {
        this.log(
          'No processed fonts found. Please run font processing first.',
          'warn'
        );
        return;
      }

      this.log(
        `Found ${processedFonts.length} processed fonts to generate CSS for`
      );

      const fontConfigs = ConfigManager.load().fonts;
      await this.generateFontCSS(processedFonts, fontConfigs);

      // Generate unified CSS file
      await this.generateUnified(fontConfigs);

      this.log('🎉 CSS generation completed!');
    } catch (error) {
      ErrorHandler.handle(error, 'CSS generation');
      throw error;
    }
  }

  /**
   * Generate CSS for specific fonts
   */
  async generateSpecific(fontIds: string[]): Promise<void> {
    try {
      await this.init();

      this.log(
        `Starting CSS generation for specific fonts: ${fontIds.join(', ')}`
      );

      const fontConfigs = ConfigManager.load().fonts;
      await this.generateFontCSS(fontIds, fontConfigs);

      // Don't regenerate unified CSS when generating specific fonts
      // The unified CSS should only be generated when building all fonts

      this.log('🎉 Specific font CSS generation completed!');
    } catch (error) {
      ErrorHandler.handle(error, 'Specific font CSS generation');
      throw error;
    }
  }

  /**
   * Generate CSS for multiple fonts (shared logic)
   */
  private async generateFontCSS(
    fontIds: string[],
    fontConfigs: Record<string, FontConfig>
  ): Promise<AllResults> {
    const allResults: AllResults = {};

    for (const fontId of fontIds) {
      const fontConfig = fontConfigs[fontId];
      if (!fontConfig) {
        this.log(`No config found for font: ${fontId}`, 'warn');
        continue;
      }

      try {
        const processResult = await this.getProcessingResult(fontId);
        if (!processResult) {
          this.log(`No processing result for: ${fontId}`, 'warn');
          continue;
        }

        await this.generateIndividualCSS(fontId, fontConfig, processResult);
        allResults[fontId] = processResult;
        this.log(`Completed CSS generation: ${fontId}`);
      } catch (error) {
        await this.handleFontGenerationError(fontId, error, allResults);
        continue;
      }
    }

    return allResults;
  }

  /**
   * Handle font generation errors consistently
   */
  private async handleFontGenerationError(
    fontId: string,
    error: unknown,
    allResults: AllResults
  ): Promise<void> {
    ErrorHandler.handle(error, `Generating CSS for ${fontId}`);
    allResults[fontId] = {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  /**
   * Generate unified CSS file
   */
  async generateUnified(
    fontConfigs?: Record<string, FontConfig>
  ): Promise<void> {
    try {
      const configs = fontConfigs ?? ConfigManager.load().fonts;

      const unifiedPath = path.join(this.config.cssDir, FILE_NAMES.unifiedCSS);
      await this.unifiedGenerator.generateUnifiedCSS(configs, unifiedPath);

      // Generate minified version if enabled
      if (this.config.minify) {
        await this.generateMinifiedUnified(configs);
      }

      this.log('Generated unified CSS file');
    } catch (error) {
      ErrorHandler.handle(error, 'Generating unified CSS');
      throw error;
    }
  }

  /**
   * Generate minified unified CSS
   */
  private async generateMinifiedUnified(
    configs: Record<string, FontConfig>
  ): Promise<void> {
    // Create minified version that imports .min.css files
    const minifiedUnifiedCSS = this.createMinifiedUnifiedCSS(configs);
    const minifiedMinCSS = await this.minifier.minify(minifiedUnifiedCSS);

    const minUnifiedPath = path.join(
      this.config.cssDir,
      FILE_NAMES.unifiedMinCSS
    );
    await fs.writeFile(minUnifiedPath, minifiedMinCSS);
    const minStats = await fs.stat(minUnifiedPath);

    this.log(
      `Generated minified unified CSS: ${FILE_NAMES.unifiedMinCSS} (${(
        minStats.size / 1024
      ).toFixed(1)}KB)`
    );
  }

  /**
   * Generate CSS for an individual font
   */
  private async generateIndividualCSS(
    fontId: string,
    fontConfig: FontConfig,
    processResults: FontProcessingResult[]
  ): Promise<CSSResult> {
    this.log(`Generating CSS for ${fontConfig.displayName}...`);

    try {
      // Generate CSS content
      const css = await this.createCSSContent(
        fontId,
        fontConfig,
        processResults
      );

      // Write main CSS file
      const result = await this.writeCSSFile(fontId, css);

      // Generate minified version if enabled
      if (this.config.minify) {
        result.minified = await this.writeMinifiedCSSFile(fontId, css);
      }

      return result;
    } catch (error) {
      this.log(
        `Failed to generate CSS for ${fontId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        'error'
      );
      throw error;
    }
  }

  /**
   * Create CSS content for a font
   */
  private async createCSSContent(
    fontId: string,
    fontConfig: FontConfig,
    processResults: FontProcessingResult[]
  ): Promise<string> {
    // Generate @font-face rules
    const fontFaceRules = this.fontFaceGenerator.generateFontFaceRules(
      fontId,
      fontConfig,
      processResults,
      this.config.baseUrl
    );

    // Convert to CSS string
    let css = this.createCSSHeader(fontId, fontConfig);
    css += this.fontFaceGenerator.fontFaceRulesToCSS(fontFaceRules);

    return css;
  }

  /**
   * Write CSS file and return result metadata
   */
  private async writeCSSFile(fontId: string, css: string): Promise<CSSResult> {
    const cssFileName = `${fontId}.css`;
    const cssPath = path.join(this.config.cssDir, cssFileName);
    await fs.writeFile(cssPath, css);
    const cssStats = await fs.stat(cssPath);

    this.log(
      `Generated CSS: ${cssFileName} (${(cssStats.size / 1024).toFixed(1)}KB)`
    );

    return {
      path: cssPath,
      filename: cssFileName,
      size: cssStats.size,
    };
  }

  /**
   * Write minified CSS file and return result metadata
   */
  private async writeMinifiedCSSFile(
    fontId: string,
    css: string
  ): Promise<CSSResult> {
    const minifiedCSS = await this.minifier.minify(css);
    const minCssFileName = `${fontId}.min.css`;
    const minCssPath = path.join(this.config.cssDir, minCssFileName);

    await fs.writeFile(minCssPath, minifiedCSS);
    const minCssStats = await fs.stat(minCssPath);

    this.log(
      `Generated minified CSS: ${minCssFileName} (${(
        minCssStats.size / 1024
      ).toFixed(1)}KB)`
    );

    return {
      path: minCssPath,
      filename: minCssFileName,
      size: minCssStats.size,
    };
  }

  /**
   * Create CSS header with metadata
   */
  private createCSSHeader(fontId: string, fontConfig: FontConfig): string {
    const currentDateTime = new Date().toISOString();
    return CSS_TEMPLATE.header(fontId, fontConfig, currentDateTime);
  }

  /**
   * Cleanup temporary files
   */
  async cleanup(): Promise<void> {
    try {
      // Clean up any temporary files if needed
      this.log('CSS cleanup completed');
    } catch (error) {
      ErrorHandler.handle(error, 'CSS cleanup');
      throw error;
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get list of processed fonts
   */
  private async getProcessedFonts(): Promise<string[]> {
    try {
      const fontsDir = path.join(this.config.outputDir, 'fonts');
      const items = await fs.readdir(fontsDir);

      const processedFonts: string[] = [];
      for (const item of items) {
        const itemPath = path.join(fontsDir, item);
        const stat = await fs.stat(itemPath);
        if (stat.isDirectory() && (await this.hasFontChunks(itemPath))) {
          processedFonts.push(item);
        }
      }

      return processedFonts.sort();
    } catch {
      this.log('Failed to read fonts directory', 'warn');
      return [];
    }
  }

  /**
   * Check if a directory has font chunks
   */
  private async hasFontChunks(fontDir: string): Promise<boolean> {
    try {
      // Check main directory for font files
      if (await this.directoryHasFontFiles(fontDir)) {
        return true;
      }

      // Check subdirectories for font files
      const items = await fs.readdir(fontDir);
      for (const item of items) {
        const itemPath = path.join(fontDir, item);
        const stat = await fs.stat(itemPath);

        if (
          stat.isDirectory() &&
          (await this.directoryHasFontFiles(itemPath))
        ) {
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Check if a directory contains font files
   */
  private async directoryHasFontFiles(directory: string): Promise<boolean> {
    try {
      const files = await fs.readdir(directory);
      return files.some((file) => this.isSupportedFontFile(file));
    } catch {
      return false;
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
   * Get processing result for a font
   */
  private async getProcessingResult(
    fontId: string
  ): Promise<FontProcessingResult[] | null> {
    try {
      const fontDir = path.join(this.config.outputDir, 'fonts', fontId);
      const metadataFiles = await this.findMetadataFiles(fontDir);

      if (metadataFiles.length > 0) {
        return this.loadFromMetadata(metadataFiles);
      } else {
        return this.scanDirectoryForChunks(fontDir);
      }
    } catch (error) {
      this.log(
        `Failed to get processing result for ${fontId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        'error'
      );
      return null;
    }
  }

  /**
   * Load processing results from metadata files
   */
  private async loadFromMetadata(
    metadataFiles: Array<{ path: string; style: string }>
  ): Promise<FontProcessingResult[]> {
    const results: FontProcessingResult[] = [];

    for (const metadataFile of metadataFiles) {
      const metadata = await fs.readJson(metadataFile.path);
      const processResult = this.convertMetadataToProcessingResult(metadata);
      results.push(...processResult);
    }

    return results;
  }

  /**
   * Find all chunks.json metadata files for a font in correct order
   */
  private async findMetadataFiles(
    fontDir: string
  ): Promise<Array<{ path: string; style: string }>> {
    const metadataFiles: Array<{ path: string; style: string }> = [];

    try {
      // Check main directory for regular style
      await this.addMainMetadataFile(fontDir, metadataFiles);

      // Check style subdirectories in correct order
      await this.addStyleMetadataFiles(fontDir, metadataFiles);
    } catch (error) {
      this.log(`Error finding metadata files in ${fontDir}: ${error}`, 'debug');
    }

    return metadataFiles;
  }

  /**
   * Add main directory metadata file if exists
   */
  private async addMainMetadataFile(
    fontDir: string,
    metadataFiles: Array<{ path: string; style: string }>
  ): Promise<void> {
    const mainMetadataPath = path.join(fontDir, FILE_NAMES.metadata);
    if (await fs.pathExists(mainMetadataPath)) {
      metadataFiles.push({ path: mainMetadataPath, style: 'regular' });
    }
  }

  /**
   * Add style subdirectory metadata files in correct order
   */
  private async addStyleMetadataFiles(
    fontDir: string,
    metadataFiles: Array<{ path: string; style: string }>
  ): Promise<void> {
    const directoryEntries = await fs.readdir(fontDir);
    const sortedStyleDirectories = this.sortStyleDirectories(directoryEntries);

    for (const styleDirName of sortedStyleDirectories) {
      const styleDirPath = path.join(fontDir, styleDirName);
      const stat = await fs.stat(styleDirPath);

      if (stat.isDirectory()) {
        const styleMetadataPath = path.join(styleDirPath, FILE_NAMES.metadata);
        if (await fs.pathExists(styleMetadataPath)) {
          metadataFiles.push({
            path: styleMetadataPath,
            style: styleDirName,
          });
        }
      }
    }
  }

  /**
   * Sort style directories to ensure roman comes before italic
   */
  private sortStyleDirectories(directoryEntries: string[]): string[] {
    return directoryEntries.sort((a, b) => {
      if (a === 'roman' && b !== 'roman') return -1;
      if (a !== 'roman' && b === 'roman') return 1;
      return a.localeCompare(b);
    });
  }

  /**
   * Convert metadata to processing result format
   */
  private convertMetadataToProcessingResult(
    metadata: ProcessingMetadata
  ): FontProcessingResult[] {
    const chunks = metadata.chunks.map((chunk) => this.convertChunk(chunk));
    const style = metadata.chunks[0]?.style ?? 'regular';

    return [{ style, chunks }];
  }

  /**
   * Convert a single chunk from metadata format
   */
  private convertChunk(
    chunk: ProcessingMetadata['chunks'][0]
  ): ChunkWithUnicodeRanges {
    return {
      index: chunk.chunkIndex,
      filename: chunk.filename,
      size: chunk.size,
      unicodeRanges: chunk.unicodeRanges ?? [],
      characterCount: chunk.characterCount ?? 0,
      style: chunk.style,
    };
  }

  /**
   * Scan directory for font chunks (fallback method)
   */
  private async scanDirectoryForChunks(
    fontDir: string
  ): Promise<FontProcessingResult[] | null> {
    try {
      const files = await fs.readdir(fontDir);
      const fontFiles = files.filter((file) => this.isSupportedFontFile(file));

      if (fontFiles.length === 0) {
        return null;
      }

      const chunks = await this.createChunksFromFiles(fontDir, fontFiles);

      return [
        {
          style: 'regular',
          chunks,
        },
      ];
    } catch {
      return null;
    }
  }

  /**
   * Create chunks from font files
   */
  private async createChunksFromFiles(
    fontDir: string,
    fontFiles: string[]
  ): Promise<ChunkWithUnicodeRanges[]> {
    return Promise.all(
      fontFiles.map(async (file, index) => {
        const filePath = path.join(fontDir, file);
        const stats = await fs.stat(filePath);

        return {
          index,
          filename: file,
          size: stats.size,
          unicodeRanges: [FALLBACK_UNICODE_RANGE],
          characterCount: 0,
          style: this.extractStyleFromFilename(file),
        };
      })
    );
  }

  /**
   * Extract style from filename
   */
  private extractStyleFromFilename(filename: string): string {
    const lowerFilename = filename.toLowerCase();

    for (const [style, pattern] of Object.entries(STYLE_PATTERNS)) {
      if (pattern.test(lowerFilename)) {
        return style;
      }
    }

    return 'regular';
  }

  /**
   * Create minified unified CSS content that imports .min.css files
   */
  private createMinifiedUnifiedCSS(
    fontConfigs: Record<string, FontConfig>
  ): string {
    const currentDateTime = new Date().toISOString();
    const availableFonts = Object.keys(fontConfigs);

    let css = CSS_TEMPLATE.unifiedHeader(availableFonts, currentDateTime);

    // Add imports for each font (using .min.css files, assume all files exist)
    Object.keys(fontConfigs).forEach((fontId) => {
      const fontConfig = fontConfigs[fontId];
      css += `@import './${fontId}.min.css';  /* ${fontConfig.displayName} */\n`;
    });

    css += `\n/* End of imports */\n`;

    return css;
  }
}
