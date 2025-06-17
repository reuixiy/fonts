import { Octokit } from '@octokit/rest';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

class VersionChecker {
  constructor() {
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });
    this.configPath = path.join(process.cwd(), 'src/config/fonts.json');
    this.versionCachePath = path.join(process.cwd(), '.version-cache.json');
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

  async loadVersionCache() {
    try {
      return await fs.readJson(this.versionCachePath);
    } catch (error) {
      // File doesn't exist, return empty cache
      return {};
    }
  }

  async saveVersionCache(cache) {
    await fs.writeJson(this.versionCachePath, cache, { spaces: 2 });
  }

  async checkGitHubReleaseVersion(owner, repo) {
    try {
      console.log(
        chalk.blue(`Checking latest release for ${owner}/${repo}...`)
      );

      const { data: releases } = await this.octokit.rest.repos.listReleases({
        owner,
        repo,
        per_page: 1,
      });

      if (releases.length === 0) {
        throw new Error('No releases found');
      }

      const latestRelease = releases[0];
      return {
        version: latestRelease.tag_name,
        publishedAt: latestRelease.published_at,
        downloadUrl: latestRelease.assets[0]?.browser_download_url || null,
      };
    } catch (error) {
      console.error(
        chalk.red(`Failed to check version for ${owner}/${repo}:`),
        error.message
      );
      throw error;
    }
  }

  async checkGitHubRepoCommit(owner, repo) {
    try {
      console.log(chalk.blue(`Checking latest commit for ${owner}/${repo}...`));

      const { data: commits } = await this.octokit.rest.repos.listCommits({
        owner,
        repo,
        per_page: 1,
      });

      if (commits.length === 0) {
        throw new Error('No commits found');
      }

      const latestCommit = commits[0];
      return {
        version: latestCommit.sha,
        publishedAt: latestCommit.commit.committer.date,
        message: latestCommit.commit.message,
      };
    } catch (error) {
      console.error(
        chalk.red(`Failed to check commit for ${owner}/${repo}:`),
        error.message
      );
      throw error;
    }
  }

  async checkAllVersions() {
    const config = await this.loadConfig();
    const versionCache = await this.loadVersionCache();
    const updatedFonts = [];
    const currentVersions = {};

    console.log(chalk.yellow('🔍 Checking font versions...\\n'));

    for (const [fontId, fontConfig] of Object.entries(config.fonts)) {
      console.log(chalk.cyan(`Checking ${fontConfig.displayName}...`));

      try {
        let versionInfo;

        if (fontConfig.source.type === 'github-release') {
          versionInfo = await this.checkGitHubReleaseVersion(
            fontConfig.source.owner,
            fontConfig.source.repo
          );
        } else if (fontConfig.source.type === 'github-repo') {
          versionInfo = await this.checkGitHubRepoCommit(
            fontConfig.source.owner,
            fontConfig.source.repo
          );
        }

        currentVersions[fontId] = versionInfo;

        // Compare with cached version
        const cachedVersion = versionCache[fontId]?.version;
        const currentVersion = versionInfo.version;

        if (!cachedVersion || cachedVersion !== currentVersion) {
          console.log(
            chalk.green(
              `  ✅ Update found: ${
                cachedVersion || 'none'
              } → ${currentVersion}`
            )
          );
          updatedFonts.push({
            id: fontId,
            name: fontConfig.displayName,
            oldVersion: cachedVersion || 'none',
            newVersion: currentVersion,
            publishedAt: versionInfo.publishedAt,
          });
        } else {
          console.log(chalk.gray(`  ✓ No update: ${currentVersion}`));
        }
      } catch (error) {
        console.error(
          chalk.red(`  ❌ Error checking ${fontConfig.displayName}:`),
          error.message
        );
      }

      console.log(''); // Empty line for readability
    }

    return {
      updatedFonts,
      currentVersions,
      hasUpdates: updatedFonts.length > 0,
    };
  }

  async updateVersionCache(currentVersions) {
    await this.saveVersionCache(currentVersions);
    console.log(chalk.green('✅ Version cache updated'));
  }

  async run() {
    try {
      console.log(chalk.bold.blue('🚀 Font Version Checker\\n'));

      const result = await this.checkAllVersions();

      if (result.hasUpdates) {
        console.log(
          chalk.bold.green(
            `🎉 Found ${result.updatedFonts.length} font updates:`
          )
        );
        result.updatedFonts.forEach((font) => {
          console.log(
            chalk.green(
              `  • ${font.name}: ${font.oldVersion} → ${font.newVersion}`
            )
          );
        });

        // Set GitHub Actions output
        if (process.env.GITHUB_ACTIONS) {
          console.log(`::set-output name=has_updates::true`);
          console.log(
            `::set-output name=updated_fonts::${JSON.stringify(
              result.updatedFonts.map((f) => f.id)
            )}`
          );
        }

        // Update version cache
        await this.updateVersionCache(result.currentVersions);
      } else {
        console.log(chalk.yellow('📅 All fonts are up to date'));

        if (process.env.GITHUB_ACTIONS) {
          console.log(`::set-output name=has_updates::false`);
        }
      }

      return result;
    } catch (error) {
      console.error(chalk.red('❌ Version check failed:'), error.message);
      process.exit(1);
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const checker = new VersionChecker();
  checker.run();
}

export default VersionChecker;
