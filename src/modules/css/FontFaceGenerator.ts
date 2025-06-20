// Font face CSS generation service
import { BaseService } from '@/core/base/BaseService.js';
import type { FontConfig } from '@/types/config.js';
import type {
  FontFaceRule,
  FontProcessingResult,
  ChunkWithUnicodeRanges,
} from '@/modules/css/types.js';

export class FontFaceGenerator extends BaseService {
  constructor() {
    super('FontFaceGenerator');
  }

  /**
   * Generate @font-face CSS rules for a font
   */
  generateFontFaceRules(
    fontId: string,
    fontConfig: FontConfig,
    processResults: FontProcessingResult[],
    baseUrl: string = '../fonts'
  ): FontFaceRule[] {
    const fontPath = `${baseUrl}/${fontId}`;
    const rules: FontFaceRule[] = [];

    processResults.forEach((result) => {
      result.chunks.forEach((chunk) => {
        const rule = this.createFontRule(
          fontConfig,
          chunk,
          fontPath,
          fontId,
          result.style ?? 'regular'
        );

        // For non-chunked fonts, use full unicode range
        if (fontConfig.subset.type !== 'size-based-chunks') {
          rule.unicodeRange = 'U+0000-FFFF';
        }

        rules.push(rule);
      });
    });

    return rules;
  }

  /**
   * Create a font-face rule
   */
  private createFontRule(
    fontConfig: FontConfig,
    chunk: ChunkWithUnicodeRanges,
    fontPath: string,
    fontId: string,
    style: string
  ): FontFaceRule {
    const fontStyle = style === 'italic' ? 'italic' : 'normal';
    const fontWeight =
      fontConfig.type === 'variable'
        ? fontConfig.weight ?? '100 900'
        : String(fontConfig.weight ?? 400);

    const src = this.generateSrcValue(
      fontConfig,
      chunk.filename,
      fontPath,
      fontId,
      style
    );

    return {
      fontFamily: `'${fontConfig.displayName}'`,
      src,
      fontDisplay: 'swap',
      fontStyle,
      fontWeight: String(fontWeight),
      fontStretch: fontConfig.css?.fontStretch,
      unicodeRange: this.formatUnicodeRanges(chunk.unicodeRanges ?? []),
    };
  }

  /**
   * Generate the src value for a font
   */
  private generateSrcValue(
    fontConfig: FontConfig,
    filename: string,
    fontPath: string,
    fontId?: string,
    style?: string
  ): string {
    if (fontConfig.css?.srcFormat) {
      return this.generateCustomSrcValue(
        fontConfig,
        filename,
        fontPath,
        fontId,
        style
      );
    }

    return this.generateDefaultSrcValue(filename, fontPath, style);
  }

  /**
   * Generate custom src value using srcFormat template
   */
  private generateCustomSrcValue(
    fontConfig: FontConfig,
    filename: string,
    fontPath: string,
    fontId?: string,
    style?: string
  ): string {
    const actualFilename =
      style && style !== 'regular' ? `${style}/${filename}` : filename;
    const srcFormat = fontConfig.css?.srcFormat;

    if (!srcFormat) {
      return this.generateDefaultSrcValue(filename, fontPath, style);
    }

    return srcFormat
      .replace(/{filename}/g, actualFilename)
      .replace(/{fontPath}/g, fontPath)
      .replace(/{fontId}/g, fontId ?? '');
  }

  /**
   * Generate default src value
   */
  private generateDefaultSrcValue(
    filename: string,
    fontPath: string,
    style?: string
  ): string {
    const actualPath =
      style && style !== 'regular'
        ? `${fontPath}/${style}/${filename}`
        : `${fontPath}/${filename}`;

    return `url('${actualPath}') format('woff2')`;
  }

  /**
   * Format unicode ranges for CSS
   */
  private formatUnicodeRanges(ranges: string[]): string {
    return ranges.join(', ');
  }

  /**
   * Convert font face rules to CSS string
   */
  fontFaceRulesToCSS(rules: FontFaceRule[]): string {
    return rules
      .map((rule) => {
        let css = `@font-face {\n`;
        css += `  font-family: ${rule.fontFamily};\n`;
        css += `  src: ${rule.src};\n`;
        css += `  font-display: ${rule.fontDisplay};\n`;
        css += `  font-style: ${rule.fontStyle};\n`;
        css += `  font-weight: ${rule.fontWeight};\n`;

        if (rule.fontStretch) {
          css += `  font-stretch: ${rule.fontStretch};\n`;
        }

        css += `  unicode-range: ${rule.unicodeRange};\n`;
        css += `}\n\n`;

        return css;
      })
      .join('');
  }
}
