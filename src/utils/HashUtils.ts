// Hashing utilities for content integrity and caching
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export class HashUtils {
  /**
   * Generate MD5 hash of string content
   */
  static md5(content: string): string {
    return createHash('md5').update(content).digest('hex');
  }

  /**
   * Generate SHA256 hash of string content
   */
  static sha256(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Generate hash of file contents
   */
  static async hashFile(
    filePath: string,
    algorithm: 'md5' | 'sha256' = 'sha256'
  ): Promise<string> {
    const content = await readFile(filePath);
    return createHash(algorithm).update(content).digest('hex');
  }

  /**
   * Generate short hash for cache keys (first 8 characters of SHA256)
   */
  static shortHash(content: string): string {
    return this.sha256(content).substring(0, 8);
  }

  /**
   * Generate content-based filename with hash
   */
  static hashFilename(originalName: string, content: string): string {
    const hash = this.shortHash(content);
    const parts = originalName.split('.');
    if (parts.length > 1) {
      const ext = parts.pop();
      const name = parts.join('.');
      return `${name}.${hash}.${ext}`;
    }
    return `${originalName}.${hash}`;
  }

  /**
   * Verify file integrity against expected hash
   */
  static async verifyFile(
    filePath: string,
    expectedHash: string,
    algorithm: 'md5' | 'sha256' = 'sha256'
  ): Promise<boolean> {
    try {
      const actualHash = await this.hashFile(filePath, algorithm);
      return actualHash === expectedHash;
    } catch {
      return false;
    }
  }

  /**
   * Generate cache key from multiple values
   */
  static cacheKey(...values: string[]): string {
    const combined = values.join('|');
    return this.shortHash(combined);
  }
}
