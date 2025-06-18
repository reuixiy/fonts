// Shared utility functions for file system operations
import { promises as fs } from 'node:fs';
import { dirname } from 'node:path';

export class FileSystem {
  /**
   * Ensure directory exists, create if needed
   */
  static async ensureDir(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Check if file exists
   */
  static async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read JSON file with error handling
   */
  static async readJSON<T = unknown>(filePath: string): Promise<T> {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  }

  /**
   * Write JSON file with proper formatting
   */
  static async writeJSON(filePath: string, data: unknown): Promise<void> {
    await this.ensureDir(dirname(filePath));
    const content = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, content, 'utf-8');
  }

  /**
   * Copy file with directory creation
   */
  static async copyFile(src: string, dest: string): Promise<void> {
    await this.ensureDir(dirname(dest));
    await fs.copyFile(src, dest);
  }

  /**
   * Get file size in bytes
   */
  static async getSize(filePath: string): Promise<number> {
    const stats = await fs.stat(filePath);
    return stats.size;
  }

  /**
   * Get directory contents
   */
  static async readDir(dirPath: string): Promise<string[]> {
    return await fs.readdir(dirPath);
  }

  /**
   * Remove file or directory recursively
   */
  static async remove(path: string): Promise<void> {
    try {
      await fs.rm(path, { recursive: true, force: true });
    } catch {
      // Ignore errors if path doesn't exist
    }
  }

  /**
   * Get file extension
   */
  static getExtension(filePath: string): string {
    return filePath.split('.').pop()?.toLowerCase() ?? '';
  }

  /**
   * Get file name without extension
   */
  static getBaseName(filePath: string): string {
    const name = filePath.split('/').pop() ?? '';
    return name.split('.')[0] ?? '';
  }
}
