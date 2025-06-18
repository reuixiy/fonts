// GitHub download service
import { Octokit } from '@octokit/rest';
import fetch from 'node-fetch';
import fs from 'fs-extra';
import path from 'path';
import { BaseService } from '@/core/base/BaseService.js';
import type { FontConfig } from '@/types/config.js';
import type { DownloadResult, GitHubAsset, GitHubRelease } from '@/modules/download/types.js';
import { FileValidator } from '@/modules/download/FileValidator.js';

export class GitHubDownloadService extends BaseService {
  private octokit: Octokit;
  private validator: FileValidator;

  constructor() {
    super('GitHubDownloadService');
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });
    this.validator = new FileValidator();
  }

  async downloadFromRelease(
    fontConfig: FontConfig,
    fontId: string,
    downloadDir: string
  ): Promise<DownloadResult> {
    return this.executeWithErrorHandling(async () => {
      const { source } = fontConfig;
      this.log(
        `📥 Downloading ${fontConfig.displayName} from GitHub release...`
      );

      // Get latest release
      const { data: releases } = await this.octokit.rest.repos.listReleases({
        owner: source.owner,
        repo: source.repo,
        per_page: 1,
      });

      if (releases.length === 0) {
        throw new Error('No releases found');
      }

      const latestRelease = releases[0] as GitHubRelease;
      const version = latestRelease.tag_name;

      // Find the target file
      const targetFileName =
        source.filePattern?.replace('{version}', version) ?? '';
      const asset = latestRelease.assets.find(
        (asset: GitHubAsset) =>
          asset.name === targetFileName ||
          asset.name.includes(targetFileName.replace('.ttf', ''))
      );

      if (!asset) {
        throw new Error(`Target file not found: ${targetFileName}`);
      }

      this.log(
        `Found: ${asset.name} (${(asset.size / 1024 / 1024).toFixed(2)} MB)`
      );

      // Create subdirectory
      const fontDir = path.join(downloadDir, fontId);
      await fs.ensureDir(fontDir);

      const outputPath = path.join(fontDir, `${fontId}-${version}.ttf`);

      // Check if file already exists and is valid
      if (await this.validator.checkExistingFile(outputPath, 100 * 1024)) {
        this.log(`⏭ File already exists and is valid: ${outputPath}`, 'info');
        return {
          path: outputPath,
          version,
          originalName: asset.name,
        };
      }

      // Download the font file
      await this.downloadFile(
        asset.browser_download_url,
        outputPath,
        100 * 1024
      );

      return {
        path: outputPath,
        version,
        originalName: asset.name,
      };
    }, `download from GitHub release for ${fontId}`);
  }

  async downloadFromRepo(
    fontConfig: FontConfig,
    fontId: string,
    downloadDir: string
  ): Promise<DownloadResult> {
    return this.executeWithErrorHandling(async () => {
      const { source } = fontConfig;
      this.log(
        `📥 Downloading ${fontConfig.displayName} from GitHub repository...`
      );

      if (!source.files || source.files.length === 0) {
        throw new Error('No files specified in source configuration');
      }

      const fontDir = path.join(downloadDir, fontId);
      await fs.ensureDir(fontDir);

      for (const fileConfig of source.files) {
        const fileName = path.basename(fileConfig.path);
        const outputPath = path.join(fontDir, fileName);

        // Check if file already exists and is valid
        if (await this.validator.checkExistingFile(outputPath, 10 * 1024)) {
          this.log(`⏭ File already exists and is valid: ${fileName}`, 'info');
          continue;
        }

        // Construct download URL for GitHub raw files
        const encodedPath = encodeURIComponent(fileConfig.path).replace(
          /%2F/g,
          '/'
        );
        const downloadUrl = `https://raw.githubusercontent.com/${source.owner}/${source.repo}/main/${encodedPath}`;

        this.log(`Downloading: ${fileName}`, 'debug');
        this.log(`URL: ${downloadUrl}`, 'debug');

        await this.downloadFile(downloadUrl, outputPath, 10 * 1024);
      }

      return {
        path: fontDir,
        version: 'latest',
        originalName: fontId,
      };
    }, `download from GitHub repo for ${fontId}`);
  }

  private async downloadFile(
    url: string,
    outputPath: string,
    minSize: number
  ): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await fs.writeFile(outputPath, buffer);

    // Validate the downloaded file
    try {
      await this.validator.validateFile(outputPath, minSize);
      this.log(`✅ Downloaded and validated: ${path.basename(outputPath)}`);
    } catch (validationError) {
      // Clean up invalid file
      await this.validator.cleanupInvalidFile(outputPath);
      throw validationError;
    }
  }
}
