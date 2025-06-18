// Base processor class for font operations
import { BaseService } from './BaseService.js';
import { readFileSync, existsSync } from 'fs';

export abstract class BaseProcessor extends BaseService {
  constructor(name: string) {
    super(name);
  }

  protected validateFile(filePath: string): boolean {
    if (!existsSync(filePath)) {
      this.log(`File not found: ${filePath}`, 'error');
      return false;
    }

    try {
      const stats = readFileSync(filePath);
      if (stats.length === 0) {
        this.log(`File is empty: ${filePath}`, 'error');
        return false;
      }
      return true;
    } catch (error) {
      this.log(
        `Failed to validate file ${filePath}: ${(error as Error).message}`,
        'error'
      );
      return false;
    }
  }

  protected validateFiles(filePaths: string[]): boolean {
    return filePaths.every((filePath) => this.validateFile(filePath));
  }

  protected async processInBatches<T>(
    items: T[],
    batchSize: number,
    processor: (batch: T[]) => Promise<void>
  ): Promise<void> {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      this.log(
        `Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(
          items.length / batchSize
        )}`
      );
      await processor(batch);
    }
  }
}
