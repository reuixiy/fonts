import chalk from 'chalk';
import cssnano from 'cssnano';
import fs from 'fs-extra';
import path from 'path';
import postcss from 'postcss';
import { URL } from 'url';

import type {
  ChunkResult,
  CSSResult,
  FontConfig,
  FontsConfig,
} from '@/types.js';

interface ProcessResult {
  filename: string;
  style?: string;
  unicodeRanges?: string[];
}

interface AllResults {
  [fontId: string]: ChunkResult[] | ProcessResult[] | { error: string };
}

class CSSGenerator {
  private configPath: string;
  private outputDir: string;
  private cssDir: string;

  constructor() {
    this.configPath = path.join(process.cwd(), 'src/config/fonts.json');
    this.outputDir = path.join(process.cwd(), 'build');
    this.cssDir = path.join(this.outputDir, 'css');
  }

  async init(): Promise<void> {
    // Ensure CSS output directory exists
    await fs.ensureDir(this.cssDir);
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

  formatUnicodeRanges(ranges: string[]): string {
    return ranges
      .map((range) => {
        if (range.includes('-')) {
          // Range format like U+4E00-9FFF
          return range;
        } else {
          // Single codepoint format
          return range;
        }
      })
      .join(', ');
  }

  generateFontFaceCSS(
    fontId: string,
    fontConfig: FontConfig,
    processResult: ChunkResult[] | ProcessResult[],
    baseUrl: string = '../fonts'
  ): string {
    const fontPath = `${baseUrl}/${fontId}`;
    let css = '';

    if (fontConfig.type === 'variable') {
      // Variable font CSS generation
      if (fontConfig.subset.type === 'size-based-chunks') {
        // Chunked variable font: group chunks by style
        const chunksByStyle: Record<string, ChunkResult[]> = {};
        (processResult as ChunkResult[]).forEach((chunk) => {
          const style =
            'style' in chunk
              ? (chunk as ChunkResult & { style: string }).style
              : 'regular';
          chunksByStyle[style] ??= [];
          chunksByStyle[style].push(chunk);
        });

        // Generate @font-face rules for each style's chunks
        Object.entries(chunksByStyle).forEach(([style, chunks]) => {
          // Sort chunks by index for proper order
          const sortedChunks = chunks.sort(
            (a, b) => a.chunkIndex - b.chunkIndex
          );

          sortedChunks.forEach((chunk) => {
            const fontStyle = style === 'italic' ? 'italic' : 'normal';
            const fontWeight = fontConfig.weight ?? '100 900'; // Variable weight range

            // Use custom src format if specified, otherwise default
            const srcFormat = fontConfig.css?.srcFormat
              ? fontConfig.css.srcFormat
                  .replace(/{fontId}/g, fontId)
                  .replace(/{filename}/g, chunk.filename)
              : `url('${fontPath}/${chunk.filename}') format('woff2')`;

            css += `@font-face {
  font-family: '${fontConfig.displayName}';
  src: ${srcFormat};
  font-display: swap;
  font-style: ${fontStyle};
  font-weight: ${fontWeight};`;

            // Add font-stretch if specified
            if (fontConfig.css?.fontStretch) {
              css += `\n  font-stretch: ${fontConfig.css.fontStretch};`;
            }

            css += `
  unicode-range: ${this.formatUnicodeRanges(chunk.unicodeRanges)};
}

`;
          });
        });
      } else {
        // Single-file variable font (not chunked)
        if (fontConfig.styles && Array.isArray(fontConfig.styles)) {
          // Multi-style variable font
          fontConfig.styles.forEach((style) => {
            const fontStyle = style === 'italic' ? 'italic' : 'normal';
            const fontWeight = fontConfig.weight ?? '100 900'; // Variable weight range

            // Find the corresponding chunk for this style
            const styleChunk = (processResult as ChunkResult[]).find(
              (chunk) => {
                const chunkStyle = chunk.style ?? 'roman';
                return chunkStyle === style;
              }
            );

            if (styleChunk) {
              // Use custom src format if specified, otherwise default
              const srcFormat = fontConfig.css?.srcFormat
                ? fontConfig.css.srcFormat
                    .replace(/{fontId}/g, fontId)
                    .replace(/{filename}/g, styleChunk.filename)
                : `url('${fontPath}/${styleChunk.filename}') format('woff2')`;

              css += `@font-face {
  font-family: '${fontConfig.displayName}';
  src: ${srcFormat};
  font-display: swap;
  font-style: ${fontStyle};
  font-weight: ${fontWeight};`;

              // Add font-stretch if specified
              if (fontConfig.css?.fontStretch) {
                css += `\n  font-stretch: ${fontConfig.css.fontStretch};`;
              }

              css += `
  unicode-range: U+0000-FFFF;
}

`;
            }
          });
        } else {
          // Single style variable font
          const result = (processResult as ChunkResult[])[0];
          if (result) {
            const fontStyle =
              fontConfig.style === 'italic' ? 'italic' : 'normal';
            const fontWeight = fontConfig.weight ?? '100 900'; // Variable weight range

            // Use custom src format if specified, otherwise default
            const srcFormat = fontConfig.css?.srcFormat
              ? fontConfig.css.srcFormat
                  .replace(/{fontId}/g, fontId)
                  .replace(/{filename}/g, result.filename)
              : `url('${fontPath}/${result.filename}') format('woff2')`;

            css += `@font-face {
  font-family: '${fontConfig.displayName}';
  src: ${srcFormat};
  font-display: swap;
  font-style: ${fontStyle};
  font-weight: ${fontWeight};`;

            // Add font-stretch if specified
            if (fontConfig.css?.fontStretch) {
              css += `\n  font-stretch: ${fontConfig.css.fontStretch};`;
            }

            css += `
  unicode-range: U+0000-FFFF;
}

`;
          }
        }
      }
    } else {
      // Check if this is chunked output (array) or single file output (object)
      if (Array.isArray(processResult)) {
        // Chunked font output - sort by chunk index for proper order
        const sortedChunks = (processResult as ChunkResult[]).sort(
          (a, b) => a.chunkIndex - b.chunkIndex
        );

        sortedChunks.forEach((chunk) => {
          const fontStyle = fontConfig.style ?? 'normal';
          const fontWeight = fontConfig.weight ?? 400;

          // Use custom src format if specified, otherwise default
          const srcFormat = fontConfig.css?.srcFormat
            ? fontConfig.css.srcFormat
                .replace(/{fontId}/g, fontId)
                .replace(/{filename}/g, chunk.filename)
            : `url('${fontPath}/${chunk.filename}') format('woff2')`;

          css += `@font-face {
  font-family: '${fontConfig.displayName}';
  src: ${srcFormat};
  font-display: swap;
  font-style: ${fontStyle};
  font-weight: ${fontWeight};`;

          // Add font-stretch if specified
          if (fontConfig.css?.fontStretch) {
            css += `\n  font-stretch: ${fontConfig.css.fontStretch};`;
          }

          css += `
  unicode-range: ${this.formatUnicodeRanges(chunk.unicodeRanges)};
}

`;
        });
      } else {
        // Single font file output (shouldn't happen with current implementation)
        const result = processResult as ProcessResult;
        const fontStyle = fontConfig.style ?? 'normal';
        const fontWeight = fontConfig.weight ?? 400;

        // Use custom src format if specified, otherwise default
        const srcFormat = fontConfig.css?.srcFormat
          ? fontConfig.css.srcFormat
              .replace(/{fontId}/g, fontId)
              .replace(/{filename}/g, result.filename)
          : `url('${fontPath}/${result.filename}') format('woff2')`;

        css += `@font-face {
  font-family: '${fontConfig.displayName}';
  src: ${srcFormat};
  font-display: swap;
  font-style: ${fontStyle};
  font-weight: ${fontWeight};`;

        // Add font-stretch if specified
        if (fontConfig.css?.fontStretch) {
          css += `\n  font-stretch: ${fontConfig.css.fontStretch};`;
        }

        css += `
  unicode-range: ${this.formatUnicodeRanges(result.unicodeRanges ?? [])};
}

`;
      }
    }

    return css;
  }

  generateLicenseHeader(fontConfig: FontConfig): string {
    return `/*!
 * ${fontConfig.displayName} Web Font
 * 
 * Licensed under: ${fontConfig.license.type}
 * License URL: ${fontConfig.license.url}
 * 
 * Generated: ${new Date().toISOString().split('T')[0]}
 * Generator: Web Font Auto-Subsetting Workflow
 */

`;
  }

  async minifyCSS(css: string): Promise<{ css: string; map?: unknown }> {
    try {
      const result = await postcss([cssnano({ preset: 'default' })]).process(
        css,
        { from: undefined }
      );
      return result;
    } catch (error) {
      console.error(
        chalk.red('CSS minification failed:'),
        (error as Error).message
      );
      // Return original CSS if minification fails
      return { css };
    }
  }

  async generateIndividualCSS(
    fontId: string,
    fontConfig: FontConfig,
    processResult: ChunkResult[] | ProcessResult[]
  ): Promise<CSSResult> {
    console.log(
      chalk.blue(`  📝 Generating CSS for: ${fontConfig.displayName}`)
    );

    try {
      // Generate the CSS content with license header
      const licenseHeader = this.generateLicenseHeader(fontConfig);
      const css =
        licenseHeader +
        this.generateFontFaceCSS(fontId, fontConfig, processResult);

      // Individual font CSS file
      const cssFileName = `${fontId}.css`;
      const cssPath = path.join(this.cssDir, cssFileName);

      await fs.writeFile(cssPath, css, 'utf8');

      const cssStats = await fs.stat(cssPath);
      console.log(
        chalk.green(
          `    ✅ Generated CSS: ${cssFileName} (${(
            cssStats.size / 1024
          ).toFixed(1)}KB)`
        )
      );

      // Generate minified version
      const minifiedResult = await this.minifyCSS(css);
      const minCssFileName = `${fontId}.min.css`;
      const minCssPath = path.join(this.cssDir, minCssFileName);

      await fs.writeFile(minCssPath, minifiedResult.css, 'utf8');

      const minCssStats = await fs.stat(minCssPath);
      console.log(
        chalk.green(
          `    ✅ Generated minified CSS: ${minCssFileName} (${(
            minCssStats.size / 1024
          ).toFixed(1)}KB)`
        )
      );

      return {
        path: cssPath,
        filename: cssFileName,
        size: cssStats.size,
        minified: {
          path: minCssPath,
          filename: minCssFileName,
          size: minCssStats.size,
        },
      };
    } catch (error) {
      console.error(
        chalk.red(`❌ Failed to generate CSS for ${fontId}:`),
        (error as Error).message
      );
      throw error;
    }
  }

  async generateUnifiedCSS(
    allResults: AllResults,
    config: FontsConfig
  ): Promise<CSSResult> {
    console.log(chalk.blue(`📝 Generating unified CSS file...`));

    try {
      // Generate import-based unified CSS (fonts.css imports *.css)
      let unifiedCSS = `/*!
 * Chinese Fonts CSS - Unified Import-Based Stylesheet
 * 
 * This file imports individual font CSS files with their respective licenses.
 * See individual CSS files for specific font license information.
 * 
 * Generated: ${new Date().toISOString().split('T')[0]}
 * Generator: Web Font Auto-Subsetting Workflow
 */

/* Available fonts: ${Object.keys(config.fonts).join(', ')} */

`;

      Object.keys(config.fonts).forEach((fontId) => {
        const result = allResults[fontId];
        const fontConfig = config.fonts[fontId];
        if (!fontConfig || !result || 'error' in result) {
          console.log(
            chalk.yellow(
              `⚠️  Skipping ${fontId} due to error or missing config`
            )
          );
          return;
        }
        unifiedCSS += `@import './${fontId}.css';\n`;
      });

      // Write unified CSS file
      const unifiedCssFileName = 'fonts.css';
      const unifiedCssPath = path.join(this.cssDir, unifiedCssFileName);

      await fs.writeFile(unifiedCssPath, unifiedCSS, 'utf8');

      const cssStats = await fs.stat(unifiedCssPath);
      console.log(
        chalk.green(
          `✅ Generated unified CSS: ${unifiedCssFileName} (${(
            cssStats.size / 1024
          ).toFixed(1)}KB)`
        )
      );

      // Generate import-based minified unified CSS (fonts.min.css imports *.min.css)
      let minImportUnifiedCSS = `/*!
 * Chinese Fonts CSS - Unified Minified Import-Based Stylesheet
 * 
 * This file imports individual minified font CSS files with their respective licenses.
 * See individual CSS files for specific font license information.
 * 
 * Generated: ${new Date().toISOString().split('T')[0]}
 * Generator: Web Font Auto-Subsetting Workflow
 */

/* Available fonts: ${Object.keys(config.fonts).join(', ')} */

`;

      Object.keys(config.fonts).forEach((fontId) => {
        const result = allResults[fontId];
        const fontConfig = config.fonts[fontId];
        if (!fontConfig || !result || 'error' in result) {
          return;
        }
        minImportUnifiedCSS += `@import './${fontId}.min.css';\n`;
      });

      const minUnifiedCssFileName = 'fonts.min.css';
      const minUnifiedCssPath = path.join(this.cssDir, minUnifiedCssFileName);

      await fs.writeFile(minUnifiedCssPath, minImportUnifiedCSS, 'utf8');

      const minCssStats = await fs.stat(minUnifiedCssPath);
      console.log(
        chalk.green(
          `✅ Generated import-based minified unified CSS: ${minUnifiedCssFileName} (${(
            minCssStats.size / 1024
          ).toFixed(1)}KB)`
        )
      );

      return {
        path: unifiedCssPath,
        filename: unifiedCssFileName,
        size: cssStats.size,
        minified: {
          path: minUnifiedCssPath,
          filename: minUnifiedCssFileName,
          size: minCssStats.size,
        },
      };
    } catch (error) {
      console.error(
        chalk.red('❌ Failed to generate unified CSS:'),
        (error as Error).message
      );
      throw error;
    }
  }

  async generateAll(): Promise<void> {
    console.log(chalk.bold.blue('🚀 Starting CSS generation for all fonts\\n'));

    try {
      await this.init();
      const config = await this.loadConfig();

      // Get processed font results from build directory
      const processedFonts = await this.getProcessedFonts();

      if (processedFonts.length === 0) {
        console.log(
          chalk.yellow(
            '⚠️  No processed fonts found. Please run font processing first.'
          )
        );
        return;
      }

      console.log(
        chalk.blue(
          `📝 Found ${processedFonts.length} processed fonts to generate CSS for\\n`
        )
      );

      const allResults: AllResults = {};

      // Generate individual CSS files for each font
      for (const fontId of processedFonts) {
        const fontConfig = config.fonts[fontId];
        if (!fontConfig) {
          console.log(chalk.yellow(`⚠️  No config found for font: ${fontId}`));
          continue;
        }

        try {
          // Get processing result
          const processResult = await this.getProcessingResult(fontId);
          if (!processResult) {
            console.log(
              chalk.yellow(`⚠️  No processing result for: ${fontId}`)
            );
            continue;
          }

          await this.generateIndividualCSS(fontId, fontConfig, processResult);
          allResults[fontId] = processResult;
          console.log(chalk.green(`✅ Completed CSS generation: ${fontId}\\n`));
        } catch (error) {
          console.error(
            chalk.red(`❌ Failed to generate CSS for ${fontId}:`),
            (error as Error).message
          );
          allResults[fontId] = { error: (error as Error).message };
          continue;
        }
      }

      // Generate unified CSS file
      await this.generateUnifiedCSS(allResults, config);

      console.log(chalk.bold.green('🎉 CSS generation completed!'));
    } catch (error) {
      console.error(
        chalk.red('❌ CSS generation failed:'),
        (error as Error).message
      );
      throw error;
    }
  }

  async generateSpecific(fontIds: string[]): Promise<void> {
    console.log(
      chalk.bold.blue(
        `🚀 Starting CSS generation for specific fonts: ${fontIds.join(
          ', '
        )}\\n`
      )
    );

    try {
      await this.init();
      const config = await this.loadConfig();

      const allResults: AllResults = {};

      for (const fontId of fontIds) {
        const fontConfig = config.fonts[fontId];
        if (!fontConfig) {
          console.log(chalk.yellow(`⚠️  No config found for font: ${fontId}`));
          continue;
        }

        try {
          // Get processing result
          const processResult = await this.getProcessingResult(fontId);
          if (!processResult) {
            console.log(
              chalk.yellow(`⚠️  No processing result for: ${fontId}`)
            );
            continue;
          }

          await this.generateIndividualCSS(fontId, fontConfig, processResult);
          allResults[fontId] = processResult;
          console.log(chalk.green(`✅ Completed CSS generation: ${fontId}\\n`));
        } catch (error) {
          console.error(
            chalk.red(`❌ Failed to generate CSS for ${fontId}:`),
            (error as Error).message
          );
          allResults[fontId] = { error: (error as Error).message };
          continue;
        }
      }

      // Regenerate unified CSS with all fonts (including existing ones)
      const allProcessedFonts = await this.getProcessedFonts();
      const completeResults: AllResults = { ...allResults };

      // Add existing fonts that weren't in the specific list
      for (const fontId of allProcessedFonts) {
        if (!completeResults[fontId]) {
          const fontConfig = config.fonts[fontId];
          if (fontConfig) {
            const processResult = await this.getProcessingResult(fontId);
            if (processResult) {
              completeResults[fontId] = processResult;
            }
          }
        }
      }

      await this.generateUnifiedCSS(completeResults, config);

      console.log(chalk.bold.green('🎉 Specific CSS generation completed!'));
    } catch (error) {
      console.error(
        chalk.red('❌ Specific CSS generation failed:'),
        (error as Error).message
      );
      throw error;
    }
  }

  async getProcessedFonts(): Promise<string[]> {
    try {
      const fontsDir = path.join(this.outputDir, 'fonts');
      if (!(await fs.pathExists(fontsDir))) {
        return [];
      }

      const items = await fs.readdir(fontsDir);
      const fontDirs = [];

      for (const item of items) {
        const itemPath = path.join(fontsDir, item);
        const stat = await fs.stat(itemPath);
        if (stat.isDirectory()) {
          fontDirs.push(item);
        }
      }

      return fontDirs;
    } catch (error) {
      console.error(
        chalk.red('Failed to get processed fonts:'),
        (error as Error).message
      );
      return [];
    }
  }
  async getProcessingResult(fontId: string): Promise<ChunkResult[] | null> {
    try {
      const fontDir = path.join(this.outputDir, 'fonts', fontId);
      if (!(await fs.pathExists(fontDir))) {
        return null;
      }

      // Try to read chunk metadata first
      const metadataPath = path.join(fontDir, 'chunks.json');
      if (await fs.pathExists(metadataPath)) {
        const metadata = await fs.readJson(metadataPath);
        return metadata.chunks.map(
          (chunk: {
            chunkIndex: number;
            filename: string;
            style: string;
            size: number;
            unicodeRanges: string[];
            characterCount: number;
          }) => ({
            chunkIndex: chunk.chunkIndex,
            path: path.join(fontDir, chunk.filename),
            filename: chunk.filename,
            size: chunk.size,
            compressionRatio: 'N/A',
            unicodeRanges: chunk.unicodeRanges,
            characterCount: chunk.characterCount,
            style: chunk.style,
          })
        );
      }

      // Fallback: scan files in directory (legacy behavior)
      const files = await fs.readdir(fontDir);
      const fontFiles = files.filter((file) => file.endsWith('.woff2'));

      if (fontFiles.length === 0) {
        return null;
      }

      // Convert file list to processing result format
      const results: ChunkResult[] = [];

      for (const file of fontFiles) {
        const filePath = path.join(fontDir, file);
        const stats = await fs.stat(filePath);

        // Extract style and chunk index from filename
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

        // Extract chunk index from filename if it's a chunked font
        const chunkMatch = file.match(/-(\d+)\.woff2$/);
        const chunkIndex = chunkMatch ? parseInt(chunkMatch[1]!, 10) : 0;

        results.push({
          chunkIndex,
          path: filePath,
          filename: file,
          size: stats.size,
          compressionRatio: 'N/A',
          unicodeRanges: ['U+4E00-9FFF'], // Default Chinese range
          characterCount: 0,
          style, // Add the extracted style
        } as ChunkResult & { style: string });
      }

      return results;
    } catch (error) {
      console.error(
        chalk.red(`Failed to get processing result for ${fontId}:`),
        (error as Error).message
      );
      return null;
    }
  }
}

// Run if called directly
if (import.meta.url === new URL(process.argv[1] ?? '', 'file:').href) {
  const generator = new CSSGenerator();

  // Check if specific fonts are requested via command line args
  const targetFonts = process.argv.slice(2);

  if (targetFonts.length > 0) {
    generator.generateSpecific(targetFonts);
  } else {
    generator.generateAll();
  }
}

export default CSSGenerator;
