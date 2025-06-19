// Font subset service
import fs from 'fs-extra';
import path from 'path';
import subsetFont from 'subset-font';
import { BaseService } from '@/core/base/BaseService.js';
import type {
  FontSubsetConfig,
  ChunkWithBuffer,
  FontMetrics,
} from '@/modules/subset/types.js';

export class FontSubsetService extends BaseService {
  private config: FontSubsetConfig;

  constructor(config?: Partial<FontSubsetConfig>) {
    super('FontSubsetService');
    this.config = {
      targetChunkSize: 64, // 64KB default
      outputFormat: 'woff2',
      estimatedCharsPerKB: 30, // Conservative estimate for Chinese fonts
      ...config,
    };
  }

  /**
   * Create font subset using subset-font library
   */
  async createSubset(
    fontBuffer: Buffer,
    characters: string[],
    options?: { format?: 'woff2' | 'woff' | 'truetype' }
  ): Promise<Buffer> {
    const text = characters.join('');
    const format = options?.format ?? this.config.outputFormat;

    try {
      const subsetBuffer = await subsetFont(fontBuffer, text, {
        targetFormat: format,
        // Additional optimization options
        preserveNameIds: [1, 2, 4, 6], // Keep essential name records
      });

      return Buffer.from(subsetBuffer);
    } catch (error) {
      throw new Error(
        `Font subsetting failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Estimate chunk size without creating actual files
   */
  estimateChunkSize(
    fontPath: string,
    charCount: number,
    metrics?: FontMetrics
  ): number {
    if (metrics) {
      return metrics.baseSize + metrics.avgCharSize * charCount;
    }

    // Fallback estimation
    const isVariableFont =
      fontPath.includes('[') || fontPath.toLowerCase().includes('variable');
    const avgCharSize = isVariableFont ? 120 : 80; // bytes per character
    const baseSize = isVariableFont ? 8000 : 5000; // base font overhead

    return baseSize + avgCharSize * charCount;
  }

  /**
   * Create optimal chunks using smart estimation
   */
  async createOptimalChunks(
    fontBuffer: Buffer,
    characters: string[],
    targetChunkSizeKB?: number,
    metrics?: FontMetrics,
    fontName?: string,
    fontStyle?: string
  ): Promise<ChunkWithBuffer[]> {
    const chunkSize = targetChunkSizeKB ?? this.config.targetChunkSize;
    const targetSizeBytes = chunkSize * 1024;
    const chunks: ChunkWithBuffer[] = [];

    const fontInfo = fontName
      ? `${fontName}${fontStyle ? ` (${fontStyle})` : ''}`
      : 'font';
    this.log(
      `📦 Creating chunks for ${fontInfo} (target: ${chunkSize}KB, ${characters.length} characters)`
    );

    let currentIndex = 0;
    let remainingChars = [...characters];

    // First, create a calibration chunk to get accurate metrics if not provided
    if (remainingChars.length > 100 && !metrics) {
      this.log(`🔬 Calibrating font metrics for ${fontInfo}...`);
      const calibrationChars = remainingChars.slice(0, 100);
      const calibrationBuffer = await this.createSubset(
        fontBuffer,
        calibrationChars
      );

      metrics = {
        avgCharSize: calibrationBuffer.length / 100,
        baseSize: calibrationBuffer.length * 0.1,
      };

      this.log(
        `📊 Metrics - Avg char size: ${metrics.avgCharSize.toFixed(
          1
        )} bytes, Base size: ${metrics.baseSize.toFixed(1)} bytes`
      );
    }

    while (remainingChars.length > 0) {
      const totalChars = characters.length;
      const processedChars = totalChars - remainingChars.length;
      const progress = ((processedChars / totalChars) * 100).toFixed(1);

      this.log(
        `⚙️  Processing chunk ${currentIndex} for ${fontInfo} (${progress}% complete, ${remainingChars.length} chars remaining)`
      );

      // Use smart estimation to get initial chunk size
      let estimatedCharsForTarget = Math.floor(
        targetSizeBytes /
          ((metrics?.avgCharSize ?? 80) +
            (metrics?.baseSize ?? 5000) / remainingChars.length)
      );
      estimatedCharsForTarget = Math.max(
        10,
        Math.min(estimatedCharsForTarget, remainingChars.length)
      );

      this.log(
        `📏 Estimated ${estimatedCharsForTarget} characters for target size ${chunkSize}KB`,
        'debug'
      );

      // Start with estimated size and adjust once
      let actualChunkSize = estimatedCharsForTarget;
      let testChars = remainingChars.slice(0, actualChunkSize);
      let testBuffer = await this.createSubset(fontBuffer, testChars);

      this.log(
        `🔬 Initial test: ${testChars.length} chars → ${(
          testBuffer.length / 1024
        ).toFixed(1)}KB`,
        'debug'
      );

      // Single adjustment if needed
      if (testBuffer.length > targetSizeBytes && actualChunkSize > 10) {
        // Too big, reduce by 20%
        this.log(`⬇️  Chunk too large, reducing by 20%`, 'debug');
        actualChunkSize = Math.floor(actualChunkSize * 0.8);
        testChars = remainingChars.slice(0, actualChunkSize);
        testBuffer = await this.createSubset(fontBuffer, testChars);
        this.log(
          `🔬 After reduction: ${testChars.length} chars → ${(
            testBuffer.length / 1024
          ).toFixed(1)}KB`,
          'debug'
        );
      } else if (
        testBuffer.length < targetSizeBytes * 0.7 &&
        actualChunkSize < remainingChars.length
      ) {
        // Too small, increase by 30%
        this.log(`⬆️  Chunk too small, increasing by 30%`, 'debug');
        const newSize = Math.min(
          Math.floor(actualChunkSize * 1.3),
          remainingChars.length
        );
        const newTestChars = remainingChars.slice(0, newSize);
        const newTestBuffer = await this.createSubset(fontBuffer, newTestChars);

        if (newTestBuffer.length <= targetSizeBytes) {
          actualChunkSize = newSize;
          testChars = newTestChars;
          testBuffer = newTestBuffer;
          this.log(
            `🔬 After increase: ${testChars.length} chars → ${(
              testBuffer.length / 1024
            ).toFixed(1)}KB`,
            'debug'
          );
        } else {
          this.log(
            `⚠️  Increased size exceeds target, keeping original`,
            'debug'
          );
        }
      }

      // Show character sample for debugging
      const charSample = testChars.slice(0, 10).join('');
      const hasMoreChars = testChars.length > 10 ? '...' : '';

      chunks.push({
        index: currentIndex,
        path: '',
        filename: '',
        size: testBuffer.length,
        compressionRatio: `${(
          (1 - testBuffer.length / fontBuffer.length) *
          100
        ).toFixed(1)}%`,
        unicodeRanges: [], // Will be set by caller
        characterCount: testChars.length,
        buffer: testBuffer,
      });

      this.log(
        `✅ Chunk ${currentIndex} complete: ${testChars.length} chars, ${(
          testBuffer.length / 1024
        ).toFixed(1)}KB (compression: ${(
          (1 - testBuffer.length / fontBuffer.length) *
          100
        ).toFixed(1)}%)`
      );

      this.log(`📝 Sample characters: "${charSample}${hasMoreChars}"`, 'debug');

      remainingChars = remainingChars.slice(actualChunkSize);
      currentIndex++;
    }

    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
    const originalSize = fontBuffer.length;
    const totalCompression = ((1 - totalSize / originalSize) * 100).toFixed(1);

    this.log(`🎉 Chunking complete for ${fontInfo}:`);
    this.log(`   • Total chunks: ${chunks.length}`);
    this.log(`   • Total characters: ${characters.length}`);
    this.log(`   • Original size: ${(originalSize / 1024).toFixed(1)}KB`);
    this.log(`   • Total chunked size: ${(totalSize / 1024).toFixed(1)}KB`);
    this.log(`   • Overall compression: ${totalCompression}%`);

    return chunks;
  }

  /**
   * Save chunks to files
   */
  async saveChunks(
    chunks: ChunkWithBuffer[],
    outputDir: string,
    filenamePattern: string,
    style: string,
    fontName?: string
  ): Promise<ChunkWithBuffer[]> {
    await fs.ensureDir(outputDir);

    const fontInfo = fontName ? `${fontName} (${style})` : `font (${style})`;
    this.log(
      `💾 Saving ${chunks.length} chunks for ${fontInfo} to ${outputDir}`
    );

    const savedChunks = await Promise.all(
      chunks.map(async (chunk) => {
        const filename =
          filenamePattern
            .replace('{index}', chunk.index.toString())
            .replace('{style}', style) + `.${this.config.outputFormat}`;

        const outputPath = path.join(outputDir, filename);
        await fs.writeFile(outputPath, chunk.buffer);

        this.log(
          `✅ Saved chunk ${chunk.index}: ${filename} (${(
            chunk.size / 1024
          ).toFixed(1)}KB, ${chunk.characterCount} chars)`,
          'debug'
        );

        return {
          ...chunk,
          path: outputPath,
          filename,
        };
      })
    );

    const totalSavedSize = savedChunks.reduce(
      (sum, chunk) => sum + chunk.size,
      0
    );
    this.log(
      `📁 All chunks saved for ${fontInfo} - Total: ${(
        totalSavedSize / 1024
      ).toFixed(1)}KB`
    );

    return savedChunks;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<FontSubsetConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): FontSubsetConfig {
    return { ...this.config };
  }
}
