// CSS minification service
import cssnano from 'cssnano';
import postcss from 'postcss';
import { BaseService } from '@/core/base/BaseService.js';

export class CSSMinifier extends BaseService {
  private processor: postcss.Processor;

  constructor() {
    super('CSSMinifier');
    this.processor = postcss([cssnano()]);
  }

  /**
   * Minify CSS content
   */
  async minify(css: string): Promise<string> {
    try {
      const result = await this.processor.process(css, { from: undefined });
      return result.css;
    } catch (error) {
      this.log(
        `Failed to minify CSS: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        'error'
      );
      throw error;
    }
  }

  /**
   * Check if CSS is already minified (simple heuristic)
   */
  isMinified(css: string): boolean {
    // Simple heuristic: minified CSS has no line breaks or minimal spacing
    const lines = css.split('\n');
    const avgLineLength = css.length / lines.length;
    return avgLineLength > 100 || lines.length < 10;
  }

  /**
   * Calculate compression ratio
   */
  calculateCompressionRatio(original: string, minified: string): number {
    if (original.length === 0) return 0;
    return ((original.length - minified.length) / original.length) * 100;
  }
}
