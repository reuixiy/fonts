// Common validation utilities
import { URL } from 'node:url';

export class ValidationUtils {
  /**
   * Check if string is not empty or whitespace
   */
  static isNotEmpty(value: string): boolean {
    return typeof value === 'string' && value.trim().length > 0;
  }

  /**
   * Check if value is a valid URL
   */
  static isValidUrl(value: string): boolean {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if string is a valid font ID (alphanumeric, hyphens, underscores)
   */
  static isValidFontId(value: string): boolean {
    return /^[a-zA-Z0-9_-]+$/.test(value);
  }

  /**
   * Check if file extension is supported
   */
  static isValidFontExtension(filename: string): boolean {
    const validExtensions = ['.ttf', '.otf', '.woff', '.woff2'];
    const ext = filename.toLowerCase().split('.').pop();
    return ext ? validExtensions.includes(`.${ext}`) : false;
  }

  /**
   * Validate array of font IDs
   */
  static validateFontIds(fontIds: string[]): {
    valid: string[];
    invalid: string[];
  } {
    const valid: string[] = [];
    const invalid: string[] = [];

    for (const fontId of fontIds) {
      if (this.isValidFontId(fontId)) {
        valid.push(fontId);
      } else {
        invalid.push(fontId);
      }
    }

    return { valid, invalid };
  }

  /**
   * Check if path is safe (no directory traversal)
   */
  static isSafePath(path: string): boolean {
    const normalized = path.replace(/\\/g, '/');
    return !normalized.includes('../') && !normalized.startsWith('/');
  }

  /**
   * Validate file size is within limits
   */
  static isValidFileSize(size: number, maxSize = 50 * 1024 * 1024): boolean {
    // 50MB default
    return size > 0 && size <= maxSize;
  }

  /**
   * Check if string contains only allowed characters for filenames
   */
  static isValidFilename(filename: string): boolean {
    // Allow alphanumeric, hyphens, underscores, dots
    return /^[a-zA-Z0-9._-]+$/.test(filename);
  }

  /**
   * Validate environment name
   */
  static isValidEnvironment(env: string): boolean {
    const validEnvironments = ['development', 'production', 'test'];
    return validEnvironments.includes(env);
  }

  /**
   * Sanitize string for use as filename
   */
  static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  /**
   * Check if number is within range
   */
  static isInRange(value: number, min: number, max: number): boolean {
    return value >= min && value <= max;
  }
}
