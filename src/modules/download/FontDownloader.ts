// Main font downloader implementation
import fs from 'fs-extra';
import fetch from 'node-fetch';
import path from 'path';
import { BaseService } from '@/core/base/BaseService.js';
import type { IFontDownloader } from '@/core/interfaces/IFontDownloader.js';
import type { FontConfig } from '@/types/config.js';
import { ConfigManager } from '@/config/index.js';
import { GitHubDownloadService } from '@/modules/download/GitHubDownloadService.js';
import { FileValidator } from '@/modules/download/FileValidator.js';
import type { DownloadResult, DownloadResults } from '@/modules/download/types.js';

export class FontDownloader extends BaseService implements IFontDownloader {
  private downloadDir: string;
  private githubService: GitHubDownloadService;
  private validator: FileValidator;

  constructor() {
    super('FontDownloader');
    this.downloadDir = path.join(process.cwd(), 'downloads');
    this.githubService = new GitHubDownloadService();
    this.validator = new FileValidator();
  }

  async downloadAll(): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      this.log('🚀 Starting font download for all fonts');

      await this.ensureDownloadDir();
      const fontIds = ConfigManager.getFontIds();

      this.log(`📝 Found ${fontIds.length} fonts to download`);

      const results = await this.downloadFonts(fontIds);
      this.logResults(results);
    }, 'download all fonts');
  }

  async downloadSpecific(fontIds: string[]): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      this.log(
        `🚀 Starting font download for specific fonts: ${fontIds.join(', ')}`
      );

      // Validate font IDs
      const validation = ConfigManager.validateFontIds(fontIds);
      if (validation.invalid.length > 0) {
        throw new Error(`Invalid font IDs: ${validation.invalid.join(', ')}`);
      }

      await this.ensureDownloadDir();
      const results = await this.downloadFonts(validation.valid);
      this.logResults(results);
    }, 'download specific fonts');
  }

  async validateDownloads(fontIds?: string[]): Promise<boolean> {
    return this.executeWithErrorHandling(async () => {
      const targetFontIds = fontIds ?? ConfigManager.getFontIds();
      let allValid = true;

      this.log(`🔍 Validating downloads for ${targetFontIds.length} fonts`);

      for (const fontId of targetFontIds) {
        try {
          const fontConfig = ConfigManager.getFontConfig(fontId);
          const isValid = await this.validateFontDownload(fontId, fontConfig);

          if (!isValid) {
            this.log(`❌ Validation failed for ${fontId}`, 'warn');
            allValid = false;
          } else {
            this.log(`✅ Validation passed for ${fontId}`, 'debug');
          }
        } catch (error) {
          this.log(
            `❌ Validation error for ${fontId}: ${(error as Error).message}`,
            'error'
          );
          allValid = false;
        }
      }

      return allValid;
    }, 'validate downloads');
  }

  async cleanup(): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      this.log('🧹 Cleaning up download directory');

      if (await fs.pathExists(this.downloadDir)) {
        await fs.remove(this.downloadDir);
        this.log('Download directory cleaned up');
      }
    }, 'cleanup downloads');
  }

  private async ensureDownloadDir(): Promise<void> {
    await fs.ensureDir(this.downloadDir);
  }

  private async downloadFonts(fontIds: string[]): Promise<DownloadResults> {
    const results: DownloadResults = {};

    for (const fontId of fontIds) {
      try {
        const fontConfig = ConfigManager.getFontConfig(fontId);
        const result = await this.downloadFont(fontId, fontConfig);
        results[fontId] = result;
        this.log(`✅ Completed download: ${fontId}`);
      } catch (error) {
        this.log(
          `❌ Failed to download font ${fontId}: ${(error as Error).message}`,
          'error'
        );
        results[fontId] = { error: (error as Error).message };
      }
    }

    return results;
  }

  private async downloadFont(
    fontId: string,
    fontConfig: FontConfig
  ): Promise<DownloadResult> {
    this.log(`📦 Processing font: ${fontConfig.displayName}`);

    switch (fontConfig.source.type) {
      case 'github-release':
        return this.githubService.downloadFromRelease(
          fontConfig,
          fontId,
          this.downloadDir
        );
      case 'github-repo':
        return this.githubService.downloadFromRepo(
          fontConfig,
          fontId,
          this.downloadDir
        );
      case 'direct-url':
        return this.downloadFromDirectUrl(fontConfig, fontId);
      default:
        throw new Error(`Unsupported source type: ${fontConfig.source.type}`);
    }
  }

  private async downloadFromDirectUrl(
    fontConfig: FontConfig,
    fontId: string
  ): Promise<DownloadResult> {
    return this.executeWithErrorHandling(async () => {
      const { source } = fontConfig;
      this.log(`📥 Downloading ${fontConfig.displayName} from direct URL...`);

      // Create subdirectory for consistency
      const fontDir = path.join(this.downloadDir, fontId);
      await fs.ensureDir(fontDir);

      const fileName = `${fontId}.ttf`;
      const outputPath = path.join(fontDir, fileName);

      // Check if file already exists and is valid
      if (await this.validator.checkExistingFile(outputPath, 100 * 1024)) {
        this.log(`⏭ File already exists and is valid: ${outputPath}`, 'info');
        return {
          path: outputPath,
          version: 'latest',
          originalName: fileName,
        };
      }

      this.log(`Downloading from: ${source.url}`);

      const response = await fetch(source.url);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      await fs.writeFile(outputPath, buffer);

      // Validate the downloaded file
      try {
        await this.validator.validateFile(outputPath, 100 * 1024);
        this.log(`✅ Downloaded and validated to: ${outputPath}`);
      } catch (validationError) {
        await this.validator.cleanupInvalidFile(outputPath);
        throw validationError;
      }

      return {
        path: outputPath,
        version: 'latest',
        originalName: fileName,
      };
    }, `download from direct URL for ${fontId}`);
  }

  private async validateFontDownload(
    fontId: string,
    fontConfig: FontConfig
  ): Promise<boolean> {
    const fontDir = path.join(this.downloadDir, fontId);

    if (!(await fs.pathExists(fontDir))) {
      return false;
    }

    // Check if expected files exist and are valid
    if (fontConfig.source.type === 'github-repo' && fontConfig.source.files) {
      // Check all files for repo downloads
      for (const fileConfig of fontConfig.source.files) {
        const fileName = path.basename(fileConfig.path);
        const filePath = path.join(fontDir, fileName);

        if (!(await this.validator.checkExistingFile(filePath, 10 * 1024))) {
          return false;
        }
      }
      return true;
    } else {
      // Check single file for release downloads
      const files = await fs.readdir(fontDir);
      const fontFiles = files.filter(
        (file) => file.endsWith('.ttf') || file.endsWith('.otf')
      );

      if (fontFiles.length === 0) {
        return false;
      }

      // Validate the first font file found
      const filePath = path.join(fontDir, fontFiles[0]);
      return this.validator.checkExistingFile(filePath, 100 * 1024);
    }
  }

  private logResults(results: DownloadResults): void {
    const successful = Object.values(results).filter(
      (result) => !('error' in result)
    ).length;
    const failed = Object.values(results).filter(
      (result) => 'error' in result
    ).length;

    if (failed > 0) {
      this.log(
        `⚠️ Download completed with ${failed} failures out of ${
          successful + failed
        } fonts`,
        'warn'
      );
    } else {
      this.log(`🎉 All ${successful} fonts downloaded successfully!`);
    }
  }
}
