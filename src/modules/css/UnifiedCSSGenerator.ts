// Unified CSS generation service
import fs from 'fs-extra';
import path from 'path';
import { BaseService } from '@/core/base/BaseService.js';
import type { FontConfig } from '@/types/config.js';
import type { AllResults, CSSResult } from './types.js';

export class UnifiedCSSGenerator extends BaseService {
  constructor() {
    super('UnifiedCSSGenerator');
  }

  /**
   * Generate unified CSS file that imports individual font CSS files
   */
  async generateUnifiedCSS(
    allResults: AllResults,
    fontConfigs: Record<string, FontConfig>,
    outputPath: string
  ): Promise<CSSResult> {
    this.log('Generating unified CSS file...');

    try {
      const unifiedCSS = this.createUnifiedCSSContent(allResults, fontConfigs);

      await fs.writeFile(outputPath, unifiedCSS);
      const stats = await fs.stat(outputPath);

      this.log(
        `Generated unified CSS: ${path.basename(outputPath)} (${(
          stats.size / 1024
        ).toFixed(1)}KB)`
      );

      return {
        path: outputPath,
        filename: path.basename(outputPath),
        size: stats.size,
      };
    } catch (error) {
      this.log(
        `Failed to generate unified CSS: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        'error'
      );
      throw error;
    }
  }

  /**
   * Create the content for unified CSS file
   */
  private createUnifiedCSSContent(
    allResults: AllResults,
    fontConfigs: Record<string, FontConfig>
  ): string {
    const currentDate = new Date().toISOString().split('T')[0];
    const availableFonts = Object.keys(fontConfigs);

    let css = `/*!
 * Chinese Fonts CSS - Unified Import-Based Stylesheet
 * 
 * This file imports individual font CSS files with their respective licenses.
 * See individual CSS files for specific font license information.
 * 
 * Generated: ${currentDate}
 * Generator: Web Font Auto-Subsetting Workflow v3.0
 */

/* Available fonts: ${availableFonts.join(', ')} */

`;

    // Add imports for each font
    Object.keys(fontConfigs).forEach((fontId) => {
      const result = allResults[fontId];
      const fontConfig = fontConfigs[fontId];

      if (!result || 'error' in result) {
        css += `/* @import './${fontId}.css'; */  /* Error: ${
          'error' in result ? result.error : 'No processing result'
        } */\n`;
      } else {
        css += `@import './${fontId}.css';  /* ${fontConfig.displayName} */\n`;
      }
    });

    css += `\n/* End of imports */\n`;

    return css;
  }

  /**
   * Generate CSS utility classes for fonts
   */
  generateUtilityClasses(fontConfigs: Record<string, FontConfig>): string {
    let css = `\n/* Utility classes for font families */\n`;

    Object.entries(fontConfigs).forEach(([fontId, config]) => {
      const className = this.generateClassName(fontId);
      css += `.font-${className} {\n`;
      css += `  font-family: '${config.displayName}', sans-serif;\n`;
      css += `}\n\n`;
    });

    return css;
  }

  /**
   * Generate CSS custom properties for font families
   */
  generateCustomProperties(fontConfigs: Record<string, FontConfig>): string {
    let css = `:root {\n`;
    css += `  /* Font family custom properties */\n`;

    Object.entries(fontConfigs).forEach(([fontId, config]) => {
      const propertyName = this.generatePropertyName(fontId);
      css += `  --font-${propertyName}: '${config.displayName}', sans-serif;\n`;
    });

    css += `}\n\n`;

    return css;
  }

  /**
   * Generate a CSS-safe class name from font ID
   */
  private generateClassName(fontId: string): string {
    return fontId
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Generate a CSS-safe property name from font ID
   */
  private generatePropertyName(fontId: string): string {
    return this.generateClassName(fontId);
  }

  /**
   * Add font preload hints
   */
  generatePreloadHints(
    fontConfigs: Record<string, FontConfig>,
    allResults: AllResults
  ): string {
    let html = `<!-- Font preload hints -->\n`;
    html += `<!-- Add these to your HTML <head> for better performance -->\n`;

    Object.entries(fontConfigs).forEach(([fontId]) => {
      const result = allResults[fontId];
      if (
        result &&
        !('error' in result) &&
        Array.isArray(result) &&
        result.length > 0
      ) {
        // Preload the first chunk for better performance
        const firstChunk = result[0].chunks[0];
        if (firstChunk) {
          html += `<link rel="preload" href="/fonts/${fontId}/${firstChunk.filename}" as="font" type="font/woff2" crossorigin>\n`;
        }
      }
    });

    html += `<!-- End of preload hints -->\n`;

    return html;
  }
}
