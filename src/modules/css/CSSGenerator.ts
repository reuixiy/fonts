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

export class CSSGenerator extends BaseService implements ICSSGenerator {
  private fontFaceGenerator: FontFaceGenerator;
  private minifier: CSSMinifier;
  private unifiedGenerator: UnifiedCSSGenerator;
  private config: CSSGeneratorConfig;

  constructor(options?: Partial<CSSGeneratorConfig>) {
    super('CSSGenerator');

    this.config = {
      outputDir: path.join(process.cwd(), 'build'),
      cssDir: path.join(process.cwd(), 'build', 'css'),
      template: 'standard',
      minify: true,
      baseUrl: '../fonts',
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
      const allResults: AllResults = {};

      // Generate individual CSS files for each font
      for (const fontId of processedFonts) {
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
          ErrorHandler.handle(error, `Generating CSS for ${fontId}`);
          allResults[fontId] = {
            error: error instanceof Error ? error.message : 'Unknown error',
          };
          continue;
        }
      }

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
          ErrorHandler.handle(error, `Generating CSS for ${fontId}`);
          allResults[fontId] = {
            error: error instanceof Error ? error.message : 'Unknown error',
          };
          continue;
        }
      }

      // Don't regenerate unified CSS when generating specific fonts
      // The unified CSS should only be generated when building all fonts

      this.log('🎉 Specific font CSS generation completed!');
    } catch (error) {
      ErrorHandler.handle(error, 'Specific font CSS generation');
      throw error;
    }
  }

  /**
   * Generate unified CSS file
   */
  async generateUnified(
    fontConfigs?: Record<string, FontConfig>
  ): Promise<void> {
    try {
      const configs = fontConfigs ?? ConfigManager.load().fonts;

      const unifiedPath = path.join(this.config.cssDir, 'fonts.css');
      await this.unifiedGenerator.generateUnifiedCSS(configs, unifiedPath);

      // Generate minified version if enabled
      if (this.config.minify) {
        // Create minified version that imports .min.css files
        const minifiedUnifiedCSS = this.createMinifiedUnifiedCSS(configs);
        const minifiedMinCSS = await this.minifier.minify(minifiedUnifiedCSS);

        const minUnifiedPath = path.join(this.config.cssDir, 'fonts.min.css');
        await fs.writeFile(minUnifiedPath, minifiedMinCSS);
        const minStats = await fs.stat(minUnifiedPath);

        this.log(
          `Generated minified unified CSS: fonts.min.css (${(
            minStats.size / 1024
          ).toFixed(1)}KB)`
        );
      }

      this.log('Generated unified CSS file');
    } catch (error) {
      ErrorHandler.handle(error, 'Generating unified CSS');
      throw error;
    }
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

      // Write main CSS file
      const cssFileName = `${fontId}.css`;
      const cssPath = path.join(this.config.cssDir, cssFileName);
      await fs.writeFile(cssPath, css);
      const cssStats = await fs.stat(cssPath);

      this.log(
        `Generated CSS: ${cssFileName} (${(cssStats.size / 1024).toFixed(1)}KB)`
      );

      const result: CSSResult = {
        path: cssPath,
        filename: cssFileName,
        size: cssStats.size,
      };

      // Generate minified version if enabled
      if (this.config.minify) {
        const minifiedCSS = await this.minifier.minify(css);
        const minCssFileName = `${fontId}.min.css`;
        const minCssPath = path.join(this.config.cssDir, minCssFileName);

        await fs.writeFile(minCssPath, minifiedCSS);
        const minCssStats = await fs.stat(minCssPath);

        result.minified = {
          path: minCssPath,
          filename: minCssFileName,
          size: minCssStats.size,
        };

        this.log(
          `Generated minified CSS: ${minCssFileName} (${(
            minCssStats.size / 1024
          ).toFixed(1)}KB)`
        );
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
   * Create CSS header with metadata
   */
  private createCSSHeader(fontId: string, fontConfig: FontConfig): string {
    const currentDateTime = new Date().toISOString();

    return `/*!
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

`;
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
        if (stat.isDirectory()) {
          // Check if this directory has font files
          const hasChunks = await this.hasFontChunks(itemPath);
          if (hasChunks) {
            processedFonts.push(item);
          }
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
      const files = await fs.readdir(fontDir);
      return files.some(
        (file) =>
          file.endsWith('.woff2') ||
          file.endsWith('.woff') ||
          file.endsWith('.ttf')
      );
    } catch {
      return false;
    }
  }

  /**
   * Get processing result for a font
   */
  private async getProcessingResult(
    fontId: string
  ): Promise<FontProcessingResult[] | null> {
    try {
      const fontDir = path.join(this.config.outputDir, 'fonts', fontId);
      const metadataPath = path.join(fontDir, 'chunks.json');

      if (await fs.pathExists(metadataPath)) {
        // Use metadata if available
        const metadata = await fs.readJson(metadataPath);
        return this.convertMetadataToProcessingResult(metadata);
      } else {
        // Fallback: scan directory for font files
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
   * Convert metadata to processing result format
   */
  private convertMetadataToProcessingResult(
    metadata: ProcessingMetadata
  ): FontProcessingResult[] {
    const chunksByStyle: Record<string, ChunkWithUnicodeRanges[]> = {};

    metadata.chunks.forEach((chunk) => {
      const style = chunk.style ?? 'regular';
      chunksByStyle[style] ??= [];
      chunksByStyle[style].push({
        index: chunk.chunkIndex,
        filename: chunk.filename,
        size: chunk.size,
        unicodeRanges: chunk.unicodeRanges ?? [],
        characterCount: chunk.characterCount ?? 0,
        style: chunk.style,
      });
    });

    return Object.entries(chunksByStyle).map(([style, chunks]) => ({
      style,
      chunks: chunks.sort((a, b) => a.index - b.index),
    }));
  }

  /**
   * Scan directory for font chunks (fallback method)
   */
  private async scanDirectoryForChunks(
    fontDir: string
  ): Promise<FontProcessingResult[] | null> {
    try {
      const files = await fs.readdir(fontDir);
      const fontFiles = files.filter(
        (file) =>
          file.endsWith('.woff2') ||
          file.endsWith('.woff') ||
          file.endsWith('.ttf')
      );

      if (fontFiles.length === 0) {
        return null;
      }

      const chunks: ChunkWithUnicodeRanges[] = await Promise.all(
        fontFiles.map(async (file, index) => {
          const filePath = path.join(fontDir, file);
          const stats = await fs.stat(filePath);

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
            index,
            filename: file,
            size: stats.size,
            unicodeRanges: ['U+4E00-9FFF'], // Default Chinese range
            characterCount: 0,
            style,
          };
        })
      );

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
   * Create minified unified CSS content that imports .min.css files
   */
  private createMinifiedUnifiedCSS(
    fontConfigs: Record<string, FontConfig>
  ): string {
    const currentDateTime = new Date().toISOString();
    const availableFonts = Object.keys(fontConfigs);

    let css = `/*!
 * Chinese Fonts CSS - Unified Import-Based Stylesheet (Minified)
 * 
 * This file imports individual minified font CSS files with their respective licenses.
 * See individual CSS files for specific font license information.
 * 
 * Generated: ${currentDateTime}
 * Generator: https://github.com/reuixiy/fonts
 */

/* Available fonts: ${availableFonts.join(', ')} */

`;

    // Add imports for each font (using .min.css files, assume all files exist)
    Object.keys(fontConfigs).forEach((fontId) => {
      const fontConfig = fontConfigs[fontId];
      css += `@import './${fontId}.min.css';  /* ${fontConfig.displayName} */\n`;
    });

    css += `\n/* End of imports */\n`;

    return css;
  }
}
