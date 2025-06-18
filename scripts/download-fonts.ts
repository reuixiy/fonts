import { Octokit } from '@octokit/rest';
import chalk from 'chalk';
import fs from 'fs-extra';
import fetch from 'node-fetch';
import path from 'path';

import type { FontConfig, FontsConfig } from '@/types.js';

interface DownloadResult {
  path: string;
  version: string;
  originalName: string;
}

interface DownloadResults {
  [fontId: string]: DownloadResult | { error: string };
}

interface GitHubAsset {
  name: string;
  size: number;
  browser_download_url: string;
}

interface GitHubRelease {
  tag_name: string;
  assets: GitHubAsset[];
}

class FontDownloader {
  private octokit: Octokit;
  private configPath: string;
  private downloadDir: string;

  constructor() {
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });
    this.configPath = path.join(process.cwd(), 'src/config/fonts.json');
    this.downloadDir = path.join(process.cwd(), 'downloads');
  }

  async init(): Promise<void> {
    // Ensure download directory exists
    await fs.ensureDir(this.downloadDir);
  }

  async checkExistingFile(
    filePath: string,
    expectedMinSize: number = 1024
  ): Promise<boolean> {
    try {
      // Check if file exists
      if (!(await fs.pathExists(filePath))) {
        return false;
      }

      // Use existing validation logic
      await this.validateDownloadedFile(filePath, expectedMinSize);
      return true;
    } catch (error) {
      // If validation fails, file is invalid or missing
      console.log(
        chalk.gray(`    File check failed: ${(error as Error).message}`)
      );
      return false;
    }
  }

  async validateDownloadedFile(
    filePath: string,
    expectedMinSize: number = 1024
  ): Promise<boolean> {
    try {
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

      console.log(
        chalk.green(`    ✓ File validation passed (${stats.size} bytes)`)
      );
      return true;
    } catch (error) {
      console.error(
        chalk.red(`    ❌ File validation failed: ${(error as Error).message}`)
      );
      throw error;
    }
  }

  async loadConfig(): Promise<FontsConfig> {
    try {
      const config = await fs.readJson(this.configPath);
      return config as FontsConfig;
    } catch (error) {
      console.error(
        chalk.red('Failed to load font configuration:'),
        (error as Error).message
      );
      throw error;
    }
  }

  async downloadFromGitHubRelease(
    fontConfig: FontConfig,
    fontId: string
  ): Promise<DownloadResult> {
    const { source } = fontConfig;
    console.log(
      chalk.blue(
        `📥 Downloading ${fontConfig.displayName} from GitHub release...`
      )
    );

    try {
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

      console.log(
        chalk.cyan(
          `  Found: ${asset.name} (${(asset.size / 1024 / 1024).toFixed(2)} MB)`
        )
      );

      // Create subdirectory for consistency with repo downloads
      const fontDir = path.join(this.downloadDir, fontId);
      await fs.ensureDir(fontDir);

      const outputPath = path.join(fontDir, `${fontId}-${version}.ttf`);

      // Check if file already exists and is valid
      if (await this.checkExistingFile(outputPath, 100 * 1024)) {
        console.log(
          chalk.yellow(`  ⏭ File already exists and is valid: ${outputPath}`)
        );
        return {
          path: outputPath,
          version,
          originalName: asset.name,
        };
      }

      // Download the font file
      const response = await fetch(asset.browser_download_url);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      await fs.writeFile(outputPath, buffer);

      // Validate the downloaded file
      try {
        await this.validateDownloadedFile(outputPath, 100 * 1024); // Expect at least 100KB for font files
        console.log(
          chalk.green(`  ✅ Downloaded and validated to: ${outputPath}`)
        );
      } catch (validationError) {
        // Clean up invalid file
        await fs.remove(outputPath);
        throw validationError;
      }

      return {
        path: outputPath,
        version,
        originalName: asset.name,
      };
    } catch (error) {
      console.error(
        chalk.red(`Failed to download ${fontConfig.displayName}:`),
        (error as Error).message
      );
      throw error;
    }
  }

  async downloadFromGitHubRepo(
    fontConfig: FontConfig,
    fontId: string
  ): Promise<DownloadResult> {
    const { source } = fontConfig;
    console.log(
      chalk.blue(
        `📥 Downloading ${fontConfig.displayName} from GitHub repository...`
      )
    );

    try {
      if (!source.files || source.files.length === 0) {
        throw new Error('No files specified in source configuration');
      }

      const fontDir = path.join(this.downloadDir, fontId);
      await fs.ensureDir(fontDir);

      const downloadedFiles: Array<{ path: string; style?: string }> = [];

      for (const fileConfig of source.files) {
        const fileName = path.basename(fileConfig.path);
        const outputPath = path.join(fontDir, fileName);

        // Check if file already exists and is valid
        if (await this.checkExistingFile(outputPath, 10 * 1024)) {
          console.log(
            chalk.yellow(`  ⏭ File already exists and is valid: ${fileName}`)
          );
          downloadedFiles.push({
            path: outputPath,
            style: fileConfig.style,
          });
          continue;
        }

        // Construct download URL for GitHub raw files
        const encodedPath = encodeURIComponent(fileConfig.path).replace(
          /%2F/g,
          '/'
        );
        const downloadUrl = `https://raw.githubusercontent.com/${source.owner}/${source.repo}/main/${encodedPath}`;
        console.log(chalk.cyan(`  Downloading: ${fileName}`));
        console.log(chalk.gray(`    URL: ${downloadUrl}`));

        const response = await fetch(downloadUrl);
        if (!response.ok) {
          throw new Error(
            `Download failed for ${fileName}: ${response.statusText}`
          );
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        await fs.writeFile(outputPath, buffer);

        // Validate the downloaded file
        try {
          await this.validateDownloadedFile(outputPath, 10 * 1024); // Expect at least 10KB for font files
          console.log(
            chalk.green(`  ✅ Downloaded and validated: ${fileName}`)
          );
          downloadedFiles.push({
            path: outputPath,
            style: fileConfig.style,
          });
        } catch (validationError) {
          // Clean up invalid file
          await fs.remove(outputPath);
          throw validationError;
        }
      }

      return {
        path: fontDir,
        version: 'latest',
        originalName: fontId,
      };
    } catch (error) {
      console.error(
        chalk.red(`Failed to download ${fontConfig.displayName}:`),
        (error as Error).message
      );
      throw error;
    }
  }

  async downloadFromDirectUrl(
    fontConfig: FontConfig,
    fontId: string
  ): Promise<DownloadResult> {
    const { source } = fontConfig;
    console.log(
      chalk.blue(`📥 Downloading ${fontConfig.displayName} from direct URL...`)
    );

    try {
      // Create subdirectory for consistency
      const fontDir = path.join(this.downloadDir, fontId);
      await fs.ensureDir(fontDir);

      const fileName = `${fontId}.ttf`;
      const outputPath = path.join(fontDir, fileName);

      // Check if file already exists and is valid
      if (await this.checkExistingFile(outputPath, 100 * 1024)) {
        console.log(
          chalk.yellow(`  ⏭ File already exists and is valid: ${outputPath}`)
        );
        return {
          path: outputPath,
          version: 'latest',
          originalName: fileName,
        };
      }

      console.log(chalk.cyan(`  Downloading from: ${source.url}`));

      const response = await fetch(source.url);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      await fs.writeFile(outputPath, buffer);

      // Validate the downloaded file
      try {
        await this.validateDownloadedFile(outputPath, 100 * 1024); // Expect at least 100KB for font files
        console.log(
          chalk.green(`  ✅ Downloaded and validated to: ${outputPath}`)
        );
      } catch (validationError) {
        // Clean up invalid file
        await fs.remove(outputPath);
        throw validationError;
      }

      return {
        path: outputPath,
        version: 'latest',
        originalName: fileName,
      };
    } catch (error) {
      console.error(
        chalk.red(`Failed to download ${fontConfig.displayName}:`),
        (error as Error).message
      );
      throw error;
    }
  }

  async downloadFont(
    fontId: string,
    fontConfig: FontConfig
  ): Promise<DownloadResult> {
    console.log(chalk.blue(`📦 Processing font: ${fontConfig.displayName}`));

    try {
      switch (fontConfig.source.type) {
        case 'github-release':
          return await this.downloadFromGitHubRelease(fontConfig, fontId);
        case 'github-repo':
          return await this.downloadFromGitHubRepo(fontConfig, fontId);
        case 'direct-url':
          return await this.downloadFromDirectUrl(fontConfig, fontId);
        default:
          throw new Error(`Unsupported source type: ${fontConfig.source.type}`);
      }
    } catch (error) {
      console.error(
        chalk.red(`❌ Failed to download font ${fontId}:`),
        (error as Error).message
      );
      throw error;
    }
  }

  async downloadAll(): Promise<DownloadResults> {
    console.log(chalk.bold.blue('🚀 Starting font download for all fonts\\n'));

    try {
      await this.init();
      const config = await this.loadConfig();

      const downloadResults: DownloadResults = {};
      const fontIds = Object.keys(config.fonts);

      console.log(
        chalk.blue(`📝 Found ${fontIds.length} fonts to download\\n`)
      );

      for (const fontId of fontIds) {
        const fontConfig = config.fonts[fontId];
        if (!fontConfig) {
          console.log(chalk.yellow(`⚠️  No config found for font: ${fontId}`));
          continue;
        }

        try {
          const result = await this.downloadFont(fontId, fontConfig);
          downloadResults[fontId] = result;
          console.log(chalk.green(`✅ Completed download: ${fontId}\\n`));
        } catch (error) {
          console.error(
            chalk.red(`❌ Failed to download font ${fontId}:`),
            (error as Error).message
          );
          downloadResults[fontId] = { error: (error as Error).message };
        }
      }

      console.log(chalk.bold.green('🎉 Font download completed!'));
      return downloadResults;
    } catch (error) {
      console.error(
        chalk.red('❌ Font download failed:'),
        (error as Error).message
      );
      throw error;
    }
  }

  async downloadSpecific(fontIds: string[]): Promise<DownloadResults> {
    console.log(
      chalk.bold.blue(
        `🚀 Starting font download for specific fonts: ${fontIds.join(', ')}\\n`
      )
    );

    try {
      await this.init();
      const config = await this.loadConfig();

      const downloadResults: DownloadResults = {};

      for (const fontId of fontIds) {
        const fontConfig = config.fonts[fontId];
        if (!fontConfig) {
          console.log(chalk.yellow(`⚠️  No config found for font: ${fontId}`));
          downloadResults[fontId] = {
            error: `No config found for font: ${fontId}`,
          };
          continue;
        }

        try {
          const result = await this.downloadFont(fontId, fontConfig);
          downloadResults[fontId] = result;
          console.log(chalk.green(`✅ Completed download: ${fontId}\\n`));
        } catch (error) {
          console.error(
            chalk.red(`❌ Failed to download font ${fontId}:`),
            (error as Error).message
          );
          downloadResults[fontId] = { error: (error as Error).message };
        }
      }

      console.log(chalk.bold.green('🎉 Specific font download completed!'));
      return downloadResults;
    } catch (error) {
      console.error(
        chalk.red('❌ Specific font download failed:'),
        (error as Error).message
      );
      throw error;
    }
  }
}

// Run if called directly
if (import.meta.url === new URL(process.argv[1] ?? '', 'file:').href) {
  const downloader = new FontDownloader();

  // Check if specific fonts are requested via command line args
  const targetFonts = process.argv.slice(2);

  if (targetFonts.length > 0) {
    downloader.downloadSpecific(targetFonts);
  } else {
    downloader.downloadAll();
  }
}

export default FontDownloader;
