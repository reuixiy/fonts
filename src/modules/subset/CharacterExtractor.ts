// Character extraction service
import fs from 'fs-extra';
import path from 'path';
import * as fontkit from 'fontkit';
import { BaseService } from '@/core/base/BaseService.js';
import type {
  CharacterExtractionResult,
  FontMetrics,
} from '@/modules/subset/types.js';

export class CharacterExtractor extends BaseService {
  private metricsCache = new Map<string, FontMetrics>();

  constructor() {
    super('CharacterExtractor');
  }

  /**
   * Extract characters from a font file using fontkit
   */
  async extractCharacters(
    fontPath: string
  ): Promise<CharacterExtractionResult> {
    const cacheKey = path.basename(fontPath, path.extname(fontPath));
    this.log(`Extracting characters from ${path.basename(fontPath)}`);

    try {
      const fontBuffer = await fs.readFile(fontPath);
      const fontOrCollection = fontkit.create(fontBuffer);

      // Handle font collection vs single font
      const font =
        'fonts' in fontOrCollection
          ? fontOrCollection.fonts[0]
          : fontOrCollection;

      if (!font) {
        throw new Error('No font found in file');
      }

      // Get all available characters
      const characters: string[] = [];

      // Try to access characterSet property safely
      const characterSet = (
        font as unknown as { characterSet?: number[] | Set<number> }
      ).characterSet;

      if (!characterSet) {
        throw new Error('Cannot access character set from font file');
      }

      // Convert to array if it's a Set
      const codePoints = Array.isArray(characterSet)
        ? characterSet
        : Array.from(characterSet);

      for (const codePoint of codePoints) {
        try {
          const char = String.fromCodePoint(codePoint);
          // Include all characters that exist in the font, no filtering
          characters.push(char);
        } catch {
          // Skip invalid code points
          continue;
        }
      }

      this.log(`Found ${characters.length} characters`);

      // Create sample to cache font metrics
      let fontMetrics: FontMetrics | undefined;
      if (characters.length > 0) {
        try {
          fontMetrics = await this.calculateFontMetrics(
            fontBuffer,
            characters.slice(0, 100),
            cacheKey
          );
        } catch (error) {
          this.log(
            `Failed to calculate font metrics: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
            'warn'
          );
        }
      }

      return {
        characters: characters.sort(),
        fontMetrics,
      };
    } catch (error) {
      this.log(
        `Character extraction failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        'error'
      );
      throw error;
    }
  }

  /**
   * Calculate font metrics for chunk size estimation
   */
  private async calculateFontMetrics(
    fontBuffer: Buffer,
    sampleChars: string[],
    cacheKey: string
  ): Promise<FontMetrics> {
    const cached = this.metricsCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Create a sample subset to measure metrics
    const subsetFont = await import('subset-font');
    const sampleText = sampleChars.join('');
    const sampleBuffer = await subsetFont.default(fontBuffer, sampleText, {
      targetFormat: 'woff2',
      preserveNameIds: [1, 2, 4, 6],
    });

    const metrics: FontMetrics = {
      avgCharSize: Buffer.from(sampleBuffer).length / sampleChars.length,
      baseSize: Buffer.from(sampleBuffer).length * 0.1, // Estimated base font overhead
    };

    this.metricsCache.set(cacheKey, metrics);
    return metrics;
  }

  /**
   * Get font metrics from cache
   */
  getFontMetrics(fontPath: string): FontMetrics | undefined {
    const cacheKey = path.basename(fontPath, path.extname(fontPath));
    return this.metricsCache.get(cacheKey);
  }

  /**
   * Set font metrics in cache
   */
  setFontMetrics(fontPath: string, metrics: FontMetrics): void {
    const cacheKey = path.basename(fontPath, path.extname(fontPath));
    this.metricsCache.set(cacheKey, metrics);
  }
}
