import { Octokit } from '@octokit/rest';
import fetch from 'node-fetch';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

class FontDownloader {
  constructor() {
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });
    this.configPath = path.join(process.cwd(), 'src/config/fonts.json');
    this.downloadDir = path.join(process.cwd(), 'downloads');
    this.tempDir = path.join(process.cwd(), 'temp');
  }

  async init() {
    // Ensure download directories exist
    await fs.ensureDir(this.downloadDir);
    await fs.ensureDir(this.tempDir);

    // Clean temp directory
    await fs.emptyDir(this.tempDir);
  }

  async loadConfig() {
    try {
      const config = await fs.readJson(this.configPath);
      return config;
    } catch (error) {
      console.error(
        chalk.red('Failed to load font configuration:'),
        error.message
      );
      throw error;
    }
  }

  async downloadFromGitHubRelease(fontConfig, fontId) {
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

      const latestRelease = releases[0];
      const version = latestRelease.tag_name;

      // Find the target file
      const targetFileName = source.filePattern.replace('{version}', version);
      const asset = latestRelease.assets.find(
        (asset) =>
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

      // Download the font file
      const response = await fetch(asset.browser_download_url);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const buffer = await response.buffer();
      const outputPath = path.join(
        this.downloadDir,
        `${fontId}-${version}.ttf`
      );

      await fs.writeFile(outputPath, buffer);
      console.log(chalk.green(`  ✅ Downloaded to: ${outputPath}`));

      return {
        path: outputPath,
        version: version,
        originalName: asset.name,
      };
    } catch (error) {
      console.error(
        chalk.red(`Failed to download ${fontConfig.displayName}:`),
        error.message
      );
      throw error;
    }
  }

  async downloadFromGitHubRepo(fontConfig, fontId) {
    const { source } = fontConfig;
    console.log(
      chalk.blue(
        `📥 Downloading ${fontConfig.displayName} from GitHub repository...`
      )
    );

    try {
      // Get latest commit to determine version
      const { data: commits } = await this.octokit.rest.repos.listCommits({
        owner: source.owner,
        repo: source.repo,
        per_page: 1,
      });

      const latestCommit = commits[0];
      const version = latestCommit.sha.substring(0, 8); // Short commit hash

      const downloadedFiles = [];

      for (const fileConfig of source.files) {
        console.log(chalk.cyan(`  Downloading ${fileConfig.style} variant...`));

        // Get file content from repository
        const { data: fileData } = await this.octokit.rest.repos.getContent({
          owner: source.owner,
          repo: source.repo,
          path: fileConfig.path,
          ref: latestCommit.sha,
        });

        if (fileData.type !== 'file') {
          throw new Error(`Path is not a file: ${fileConfig.path}`);
        }

        // Decode base64 content
        const buffer = Buffer.from(fileData.content, 'base64');
        const outputPath = path.join(
          this.downloadDir,
          `${fontId}-${fileConfig.style}-${version}.ttf`
        );

        await fs.writeFile(outputPath, buffer);
        console.log(chalk.green(`    ✅ Downloaded to: ${outputPath}`));

        downloadedFiles.push({
          path: outputPath,
          style: fileConfig.style,
          originalPath: fileConfig.path,
        });
      }

      return {
        files: downloadedFiles,
        version: version,
        commit: latestCommit.sha,
      };
    } catch (error) {
      console.error(
        chalk.red(`Failed to download ${fontConfig.displayName}:`),
        error.message
      );
      throw error;
    }
  }

  async downloadFont(fontId, fontConfig) {
    console.log(chalk.yellow(`\\n🎯 Processing ${fontConfig.displayName}...`));

    try {
      if (fontConfig.source.type === 'github-release') {
        return await this.downloadFromGitHubRelease(fontConfig, fontId);
      } else if (fontConfig.source.type === 'github-repo') {
        return await this.downloadFromGitHubRepo(fontConfig, fontId);
      } else {
        throw new Error(`Unsupported source type: ${fontConfig.source.type}`);
      }
    } catch (error) {
      console.error(
        chalk.red(`❌ Failed to download ${fontConfig.displayName}:`),
        error.message
      );
      throw error;
    }
  }

  async downloadAll() {
    await this.init();
    const config = await this.loadConfig();
    const downloadResults = {};

    console.log(chalk.bold.blue('🚀 Font Downloader\\n'));
    console.log(chalk.gray(`Download directory: ${this.downloadDir}\\n`));

    for (const [fontId, fontConfig] of Object.entries(config.fonts)) {
      try {
        const result = await this.downloadFont(fontId, fontConfig);
        downloadResults[fontId] = result;
      } catch (error) {
        console.error(
          chalk.red(`Failed to download ${fontId}:`),
          error.message
        );
        downloadResults[fontId] = { error: error.message };
      }
    }

    // Save download results metadata
    const metadataPath = path.join(this.downloadDir, 'download-metadata.json');
    await fs.writeJson(
      metadataPath,
      {
        timestamp: new Date().toISOString(),
        results: downloadResults,
      },
      { spaces: 2 }
    );

    console.log(chalk.bold.green('\\n✅ Download process completed!'));
    console.log(chalk.gray(`Metadata saved to: ${metadataPath}`));

    return downloadResults;
  }

  async downloadSpecific(fontIds) {
    await this.init();
    const config = await this.loadConfig();
    const downloadResults = {};

    console.log(chalk.bold.blue('🚀 Font Downloader (Specific Fonts)\\n'));
    console.log(chalk.cyan(`Target fonts: ${fontIds.join(', ')}\\n`));

    for (const fontId of fontIds) {
      if (!config.fonts[fontId]) {
        console.error(chalk.red(`❌ Font configuration not found: ${fontId}`));
        continue;
      }

      try {
        const result = await this.downloadFont(fontId, config.fonts[fontId]);
        downloadResults[fontId] = result;
      } catch (error) {
        console.error(
          chalk.red(`Failed to download ${fontId}:`),
          error.message
        );
        downloadResults[fontId] = { error: error.message };
      }
    }

    return downloadResults;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
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
