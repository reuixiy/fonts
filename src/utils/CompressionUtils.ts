// Compression utilities for file optimization
import { gzip, deflate } from 'node:zlib';
import { promisify } from 'node:util';

const gzipAsync = promisify(gzip);
const deflateAsync = promisify(deflate);

export class CompressionUtils {
  /**
   * Compress content using gzip
   */
  static async gzip(content: string | Buffer): Promise<Buffer> {
    const input =
      typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
    return await gzipAsync(input);
  }

  /**
   * Compress content using deflate
   */
  static async deflate(content: string | Buffer): Promise<Buffer> {
    const input =
      typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
    return await deflateAsync(input);
  }

  /**
   * Calculate compression ratio
   */
  static compressionRatio(original: number, compressed: number): number {
    if (original === 0) return 0;
    return Math.round(((original - compressed) / original) * 100);
  }

  /**
   * Format file size for human readability
   */
  static formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  /**
   * Get compression statistics
   */
  static getStats(
    originalSize: number,
    compressedSize: number
  ): {
    original: string;
    compressed: string;
    ratio: number;
    savings: string;
  } {
    const ratio = this.compressionRatio(originalSize, compressedSize);
    const savings = originalSize - compressedSize;

    return {
      original: this.formatSize(originalSize),
      compressed: this.formatSize(compressedSize),
      ratio,
      savings: this.formatSize(savings),
    };
  }

  /**
   * Check if content is worth compressing
   */
  static shouldCompress(content: string | Buffer, minSize = 1024): boolean {
    const size =
      typeof content === 'string'
        ? Buffer.byteLength(content, 'utf-8')
        : content.length;
    return size >= minSize;
  }
}
