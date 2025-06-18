// File validation service for downloads
import fs from 'fs-extra';
import { BaseService } from '@/core/base/BaseService.js';

export class FileValidator extends BaseService {
  constructor() {
    super('FileValidator');
  }

  async validateFile(
    filePath: string,
    expectedMinSize = 1024
  ): Promise<boolean> {
    return this.executeWithErrorHandling(async () => {
      // Check if file exists
      if (!(await fs.pathExists(filePath))) {
        throw new Error('File does not exist');
      }

      // Validate file size and content
      await this.validateFileContent(filePath, expectedMinSize);
      return true;
    }, `validate file ${filePath}`);
  }

  async checkExistingFile(
    filePath: string,
    expectedMinSize = 1024
  ): Promise<boolean> {
    try {
      return await this.validateFile(filePath, expectedMinSize);
    } catch (error) {
      this.log(`File check failed: ${(error as Error).message}`, 'debug');
      return false;
    }
  }

  private async validateFileContent(
    filePath: string,
    expectedMinSize: number
  ): Promise<void> {
    const stats = await fs.stat(filePath);

    if (stats.size === 0) {
      throw new Error(`Downloaded file is empty: ${filePath}`);
    }

    if (stats.size < expectedMinSize) {
      throw new Error(
        `Downloaded file is too small (${stats.size} bytes, expected at least ${expectedMinSize}): ${filePath}`
      );
    }

    // Check if it's a valid font file by reading the first few bytes
    const fullBuffer = await fs.readFile(filePath);
    const buffer = fullBuffer.subarray(0, 4);
    const header = buffer.toString('ascii');

    // Check for common font file signatures
    const validHeaders = [
      'OTTO', // OpenType/CFF
      'ttcf', // TrueType Collection
      'true', // TrueType (Mac)
      'typ1', // PostScript Type 1
    ];

    // Check for TrueType signature (first 4 bytes should be version number)
    const isTrueType =
      buffer.length >= 4 && buffer.readUInt32BE(0) === 0x00010000;
    const isValidHeader = validHeaders.includes(header) || isTrueType;

    if (!isValidHeader) {
      throw new Error(
        `Invalid font file format: ${filePath} (header: ${header})`
      );
    }

    this.log(`File validation passed (${stats.size} bytes)`, 'debug');
  }

  async cleanupInvalidFile(filePath: string): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      if (await fs.pathExists(filePath)) {
        await fs.remove(filePath);
        this.log(`Cleaned up invalid file: ${filePath}`, 'debug');
      }
    }, `cleanup invalid file ${filePath}`);
  }
}
