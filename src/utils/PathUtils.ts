// Path manipulation utilities
import { join, resolve, relative, dirname, basename, extname } from 'node:path';
import { cwd } from 'node:process';

export class PathUtils {
  /**
   * Join paths safely
   */
  static join(...paths: string[]): string {
    return join(...paths);
  }

  /**
   * Resolve absolute path
   */
  static resolve(...paths: string[]): string {
    return resolve(...paths);
  }

  /**
   * Get relative path from one location to another
   */
  static relative(from: string, to: string): string {
    return relative(from, to);
  }

  /**
   * Get directory name
   */
  static dirname(path: string): string {
    return dirname(path);
  }

  /**
   * Get base name (file name with extension)
   */
  static basename(path: string, ext?: string): string {
    return basename(path, ext);
  }

  /**
   * Get file extension
   */
  static extname(path: string): string {
    return extname(path);
  }

  /**
   * Normalize path separators for current platform
   */
  static normalize(path: string): string {
    return resolve(path);
  }

  /**
   * Get current working directory
   */
  static cwd(): string {
    return cwd();
  }

  /**
   * Check if path is absolute
   */
  static isAbsolute(path: string): boolean {
    return resolve(path) === path;
  }

  /**
   * Convert to absolute path from current working directory
   */
  static toAbsolute(path: string): string {
    return this.isAbsolute(path) ? path : this.resolve(this.cwd(), path);
  }

  /**
   * Get file name without extension
   */
  static getNameWithoutExt(path: string): string {
    const base = this.basename(path);
    const ext = this.extname(base);
    return ext ? base.slice(0, -ext.length) : base;
  }

  /**
   * Change file extension
   */
  static changeExtension(path: string, newExt: string): string {
    const dir = this.dirname(path);
    const name = this.getNameWithoutExt(path);
    const ext = newExt.startsWith('.') ? newExt : `.${newExt}`;
    return this.join(dir, `${name}${ext}`);
  }

  /**
   * Ensure path ends with separator
   */
  static ensureTrailingSeparator(path: string): string {
    return path.endsWith('/') ? path : `${path}/`;
  }
}
