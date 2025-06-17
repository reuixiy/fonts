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
      // In GitHub Actions, try to load from cache branch first
      if (process.env.GITHUB_ACTIONS) {
        try {
          const owner = process.env.GITHUB_REPOSITORY_OWNER || 'reuixiy';
          const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] || 'fonts';
          
          const { data } = await this.octokit.rest.repos.getContent({
            owner,
            repo,
            path: 'version-cache.json',
            ref: 'cache'
          });

          if (data.content) {
            const content = Buffer.from(data.content, 'base64').toString('utf-8');
            const parsedCache = JSON.parse(content);
            console.log(
              chalk.blue('📋 Loaded version cache from cache branch')
            );
            return parsedCache;
          }
        } catch (error) {
          console.log(
            chalk.gray('📋 No cache branch found, checking environment variables...')
          );
        }

        // Fallback to environment variables (legacy support)
        const cacheData = {};
        if (process.env.FONT_IMING_VERSION) {
          cacheData.iming = { version: process.env.FONT_IMING_VERSION };
        }
        if (process.env.FONT_LXGW_VERSION) {
          cacheData.lxgw = { version: process.env.FONT_LXGW_VERSION };
        }
        if (process.env.FONT_AMSTELVAR_VERSION) {
          cacheData.amstelvar = { version: process.env.FONT_AMSTELVAR_VERSION };
        }

        if (Object.keys(cacheData).length > 0) {
          console.log(
            chalk.blue('📋 Loaded version cache from environment variables')
          );
          return cacheData;
        }
      }

      // Fallback to local file
      return await fs.readJson(this.versionCachePath);
    } catch (error) {
      // File doesn't exist, return empty cache
      console.log(
        chalk.gray('📋 No existing version cache found, starting fresh')
      );
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

    // In GitHub Actions, output as environment variables for current workflow run
    if (process.env.GITHUB_ACTIONS && process.env.GITHUB_OUTPUT) {
      console.log(
        chalk.blue(
          '📋 Setting version environment variables for current workflow:'
        )
      );

      const outputFile = process.env.GITHUB_OUTPUT;
      const fs = await import('fs/promises');
      const outputLines = [];

      if (currentVersions.iming) {
        outputLines.push(`font_iming_version=${currentVersions.iming.version}`);
        console.log(
          chalk.gray(`  • FONT_IMING_VERSION=${currentVersions.iming.version}`)
        );
      }
      if (currentVersions.lxgw) {
        outputLines.push(`font_lxgw_version=${currentVersions.lxgw.version}`);
        console.log(
          chalk.gray(`  • FONT_LXGW_VERSION=${currentVersions.lxgw.version}`)
        );
      }
      if (currentVersions.amstelvar) {
        outputLines.push(
          `font_amstelvar_version=${currentVersions.amstelvar.version}`
        );
        console.log(
          chalk.gray(
            `  • FONT_AMSTELVAR_VERSION=${currentVersions.amstelvar.version}`
          )
        );
      }

      if (outputLines.length > 0) {
        await fs.appendFile(outputFile, outputLines.join('\n') + '\n');
        console.log(chalk.green('📝 Version outputs written to GITHUB_OUTPUT'));
      }
    }

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
        if (process.env.GITHUB_ACTIONS && process.env.GITHUB_OUTPUT) {
          // Use the new GITHUB_OUTPUT environment file method
          const fs = await import('fs/promises');
          const outputFile = process.env.GITHUB_OUTPUT;

          const outputs = [
            `has-updates=true`,
            `updated-fonts=${result.updatedFonts.map((f) => f.id).join(',')}`,
          ];

          await fs.appendFile(outputFile, outputs.join('\n') + '\n');
          console.log('✅ GitHub Actions outputs written to GITHUB_OUTPUT');
        }

        // Update version cache
        await this.updateVersionCache(result.currentVersions);
      } else {
        console.log(chalk.yellow('📅 All fonts are up to date'));

        if (process.env.GITHUB_ACTIONS && process.env.GITHUB_OUTPUT) {
          const fs = await import('fs/promises');
          const outputFile = process.env.GITHUB_OUTPUT;
          await fs.appendFile(outputFile, 'has-updates=false\n');
          console.log('✅ GitHub Actions outputs written to GITHUB_OUTPUT');
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
