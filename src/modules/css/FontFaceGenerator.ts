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

    if (fontConfig.type === 'variable') {
      rules.push(
        ...this.generateVariableFontRules(
          fontConfig,
          processResults,
          fontPath,
          fontId
        )
      );
    } else {
      rules.push(
        ...this.generateStaticFontRules(
          fontConfig,
          processResults,
          fontPath,
          fontId
        )
      );
    }

    return rules;
  }

  /**
   * Generate rules for variable fonts
   */
  private generateVariableFontRules(
    fontConfig: FontConfig,
    processResults: FontProcessingResult[],
    fontPath: string,
    fontId: string
  ): FontFaceRule[] {
    const rules: FontFaceRule[] = [];

    if (fontConfig.subset.type === 'size-based-chunks') {
      // Chunked variable font: group chunks by style
      const chunksByStyle = this.groupChunksByStyle(processResults);

      Object.entries(chunksByStyle).forEach(([style, chunks]) => {
        const sortedChunks = chunks.sort((a, b) => a.index - b.index);

        sortedChunks.forEach((chunk) => {
          const rule = this.createVariableFontRule(
            fontConfig,
            chunk,
            fontPath,
            style,
            fontId
          );
          rules.push(rule);
        });
      });
    } else {
      // Single-file variable font
      rules.push(
        ...this.generateSingleVariableFontRules(
          fontConfig,
          processResults,
          fontPath,
          fontId
        )
      );
    }

    return rules;
  }

  /**
   * Generate rules for static fonts
   */
  private generateStaticFontRules(
    fontConfig: FontConfig,
    processResults: FontProcessingResult[],
    fontPath: string,
    fontId: string
  ): FontFaceRule[] {
    const rules: FontFaceRule[] = [];

    processResults.forEach((result) => {
      const sortedChunks = result.chunks.sort((a, b) => a.index - b.index);

      sortedChunks.forEach((chunk) => {
        const rule = this.createStaticFontRule(
          fontConfig,
          chunk,
          fontPath,
          fontId
        );
        rules.push(rule);
      });
    });

    return rules;
  }

  /**
   * Create a font-face rule for variable fonts
   */
  private createVariableFontRule(
    fontConfig: FontConfig,
    chunk: ChunkWithUnicodeRanges,
    fontPath: string,
    style: string,
    fontId: string
  ): FontFaceRule {
    const fontStyle = style === 'italic' ? 'italic' : 'normal';
    const fontWeight = fontConfig.weight ?? '100 900';

    const src = this.generateSrcValue(
      fontConfig,
      chunk.filename,
      fontPath,
      fontId
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
   * Create a font-face rule for static fonts
   */
  private createStaticFontRule(
    fontConfig: FontConfig,
    chunk: ChunkWithUnicodeRanges,
    fontPath: string,
    fontId: string
  ): FontFaceRule {
    const fontStyle = fontConfig.style ?? 'normal';
    const fontWeight = fontConfig.weight ?? 400;

    const src = this.generateSrcValue(
      fontConfig,
      chunk.filename,
      fontPath,
      fontId
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
    fontId?: string
  ): string {
    if (fontConfig.css?.srcFormat) {
      return fontConfig.css.srcFormat
        .replace(/{filename}/g, filename)
        .replace(/{fontPath}/g, fontPath)
        .replace(/{fontId}/g, fontId ?? '');
    }

    return `url('${fontPath}/${filename}') format('woff2')`;
  }

  /**
   * Format unicode ranges for CSS
   */
  private formatUnicodeRanges(ranges: string[]): string {
    return ranges.join(', ');
  }

  /**
   * Group chunks by style
   */
  private groupChunksByStyle(
    processResults: FontProcessingResult[]
  ): Record<string, ChunkWithUnicodeRanges[]> {
    const chunksByStyle: Record<string, ChunkWithUnicodeRanges[]> = {};

    processResults.forEach((result) => {
      result.chunks.forEach((chunk) => {
        const style = chunk.style ?? 'regular';
        chunksByStyle[style] ??= [];
        chunksByStyle[style].push(chunk);
      });
    });

    return chunksByStyle;
  }

  /**
   * Generate rules for single variable font files
   */
  private generateSingleVariableFontRules(
    fontConfig: FontConfig,
    processResults: FontProcessingResult[],
    fontPath: string,
    fontId: string
  ): FontFaceRule[] {
    const rules: FontFaceRule[] = [];

    if (fontConfig.styles && Array.isArray(fontConfig.styles)) {
      // Multi-style variable font
      fontConfig.styles.forEach((style) => {
        const styleResult = processResults.find(
          (result) => result.style === style
        );
        if (styleResult && styleResult.chunks.length > 0) {
          const chunk = styleResult.chunks[0];
          const rule = this.createVariableFontRule(
            fontConfig,
            chunk,
            fontPath,
            style,
            fontId
          );
          rules.push({
            ...rule,
            unicodeRange: 'U+0000-FFFF', // Full range for non-chunked
          });
        }
      });
    } else {
      // Single style variable font
      if (processResults.length > 0 && processResults[0].chunks.length > 0) {
        const chunk = processResults[0].chunks[0];
        const rule = this.createVariableFontRule(
          fontConfig,
          chunk,
          fontPath,
          'regular',
          fontId
        );
        rules.push({
          ...rule,
          unicodeRange: 'U+0000-FFFF', // Full range for non-chunked
        });
      }
    }

    return rules;
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
