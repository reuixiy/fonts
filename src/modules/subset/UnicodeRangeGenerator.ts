// Unicode range generator service
import { BaseService } from '@/core/base/BaseService.js';

export class UnicodeRangeGenerator extends BaseService {
  constructor() {
    super('UnicodeRangeGenerator');
  }

  /**
   * Generate Unicode ranges for CSS from an array of characters
   */
  generateRanges(characters: string[]): string[] {
    const codePoints = characters
      .map((char) => char.codePointAt(0))
      .filter((cp): cp is number => cp !== undefined)
      .sort((a, b) => a - b);

    if (codePoints.length === 0) return [];

    const ranges: string[] = [];
    let start: number | undefined = codePoints[0];
    let end: number | undefined = codePoints[0];

    for (let i = 1; i < codePoints.length; i++) {
      if (end !== undefined && codePoints[i] === end + 1) {
        end = codePoints[i];
      } else {
        // Add range
        if (start !== undefined && end !== undefined) {
          if (start === end) {
            ranges.push(
              `U+${start.toString(16).toUpperCase().padStart(4, '0')}`
            );
          } else {
            ranges.push(
              `U+${start.toString(16).toUpperCase().padStart(4, '0')}-${end
                .toString(16)
                .toUpperCase()
                .padStart(4, '0')}`
            );
          }
        }
        start = end = codePoints[i];
      }
    }

    // Add final range
    if (start !== undefined && end !== undefined) {
      if (start === end) {
        ranges.push(`U+${start.toString(16).toUpperCase().padStart(4, '0')}`);
      } else {
        ranges.push(
          `U+${start.toString(16).toUpperCase().padStart(4, '0')}-${end
            .toString(16)
            .toUpperCase()
            .padStart(4, '0')}`
        );
      }
    }

    return ranges;
  }

  /**
   * Generate ranges for multiple character chunks
   */
  generateRangesForChunks(characterChunks: string[][]): string[][] {
    return characterChunks.map((chunk) => this.generateRanges(chunk));
  }
}
