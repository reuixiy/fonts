import { Octokit } from '@octokit/rest';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';

import type { FontsConfig, UpdatedFont, VersionCheckResult } from '@/types.js';

interface VersionInfo {
  version: string;
  publishedAt: string | null;
  downloadUrl?: string | null;
  message?: string;
}

interface VersionCache {
  [fontId: string]: {
    version: string;
  };
}

interface GitHubRelease {
  tag_name: string;
  published_at: string | null;
  assets: Array<{
    browser_download_url?: string;
  }>;
}

interface GitHubCommit {
  sha: string;
  commit: {
    committer: {
      date: string | null;
    };
    message: string;
  };
}

class VersionChecker {
  private octokit: Octokit;
  private configPath: string;
  private versionCachePath: string;

  constructor() {
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });
    this.configPath = path.join(process.cwd(), 'src/config/fonts.json');
    this.versionCachePath = path.join(process.cwd(), '.version-cache.json');
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

  async loadVersionCache(): Promise<VersionCache> {
    try {
      // In GitHub Actions, try to load from cache branch first
      if (process.env.GITHUB_ACTIONS) {
        try {
          const owner = process.env.GITHUB_REPOSITORY_OWNER ?? 'reuixiy';
          const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'fonts';

          const { data } = await this.octokit.rest.repos.getContent({
            owner,
            repo,
            path: 'version-cache.json',
            ref: 'cache',
          });

          if ('content' in data && data.content) {
            const content = Buffer.from(data.content, 'base64').toString(
              'utf-8'
            );
            const parsedCache = JSON.parse(content) as VersionCache;
            console.log(
              chalk.blue('📋 Loaded version cache from cache branch')
            );
            return parsedCache;
          }
        } catch (_error) {
          console.log(
            chalk.gray(
              '📋 No cache branch found, checking environment variables...'
            )
          );
        }

        // Fallback to environment variables (legacy support)
        const cacheData: VersionCache = {};
        if (process.env.FONT_IMINGCP_VERSION) {
          cacheData.imingcp = { version: process.env.FONT_IMINGCP_VERSION };
        }
        if (process.env.FONT_LXGWWENKAITC_VERSION) {
          cacheData.lxgwwenkaitc = {
            version: process.env.FONT_LXGWWENKAITC_VERSION,
          };
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
      return (await fs.readJson(this.versionCachePath)) as VersionCache;
    } catch (_error) {
      // File doesn't exist, return empty cache
      console.log(
        chalk.gray('📋 No existing version cache found, starting fresh')
      );
      return {};
    }
  }

  async saveVersionCache(cache: VersionCache): Promise<void> {
    await fs.writeJson(this.versionCachePath, cache, { spaces: 2 });
  }

  async checkGitHubReleaseVersion(
    owner: string,
    repo: string
  ): Promise<VersionInfo> {
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

      const latestRelease = releases[0] as GitHubRelease;
      return {
        version: latestRelease.tag_name,
        publishedAt: latestRelease.published_at,
        downloadUrl: latestRelease.assets[0]?.browser_download_url ?? null,
      };
    } catch (error) {
      console.error(
        chalk.red(`Failed to check version for ${owner}/${repo}:`),
        (error as Error).message
      );
      throw error;
    }
  }

  async checkGitHubRepoCommit(
    owner: string,
    repo: string
  ): Promise<VersionInfo> {
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

      const latestCommit = commits[0] as GitHubCommit;
      return {
        version: latestCommit.sha,
        publishedAt: latestCommit.commit.committer.date,
        message: latestCommit.commit.message,
      };
    } catch (error) {
      console.error(
        chalk.red(`Failed to check commit for ${owner}/${repo}:`),
        (error as Error).message
      );
      throw error;
    }
  }

  async checkAllVersions(): Promise<VersionCheckResult> {
    const config = await this.loadConfig();
    const versionCache = await this.loadVersionCache();
    const updatedFonts: UpdatedFont[] = [];
    const currentVersions: Record<string, VersionInfo> = {};

    console.log(chalk.yellow('🔍 Checking font versions...\\n'));

    for (const [fontId, fontConfig] of Object.entries(config.fonts)) {
      console.log(chalk.cyan(`Checking ${fontConfig.displayName}...`));

      try {
        let versionInfo: VersionInfo;

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
        } else {
          throw new Error(`Unsupported source type: ${fontConfig.source.type}`);
        }

        currentVersions[fontId] = versionInfo;

        // Compare with cached version
        const cachedVersion = versionCache[fontId]?.version;
        const currentVersion = versionInfo.version;

        if (!cachedVersion || cachedVersion !== currentVersion) {
          console.log(
            chalk.green(
              `  ✅ Update found: ${
                cachedVersion ?? 'none'
              } → ${currentVersion}`
            )
          );
          updatedFonts.push({
            id: fontId,
            name: fontConfig.displayName,
            oldVersion: cachedVersion ?? 'none',
            newVersion: currentVersion,
            publishedAt: versionInfo.publishedAt,
          });
        } else {
          console.log(chalk.gray(`  ✓ No update: ${currentVersion}`));
        }
      } catch (error) {
        console.error(
          chalk.red(`  ❌ Error checking ${fontConfig.displayName}:`),
          (error as Error).message
        );
      }

      console.log(''); // Empty line for readability
    }

    return {
      updatedFonts,
      currentVersions: Object.fromEntries(
        Object.entries(currentVersions).map(([key, value]) => [
          key,
          value.version,
        ])
      ),
      hasUpdates: updatedFonts.length > 0,
    };
  }

  async updateVersionCache(
    currentVersions: Record<string, VersionInfo>
  ): Promise<void> {
    const cacheData: VersionCache = Object.fromEntries(
      Object.entries(currentVersions).map(([key, value]) => [
        key,
        { version: value.version },
      ])
    );

    await this.saveVersionCache(cacheData);

    // In GitHub Actions, output as environment variables for current workflow run
    if (process.env.GITHUB_ACTIONS && process.env.GITHUB_OUTPUT) {
      console.log(
        chalk.blue(
          '📋 Setting version environment variables for current workflow:'
        )
      );

      const outputFile = process.env.GITHUB_OUTPUT;
      const fsPromises = await import('fs/promises');
      const outputLines: string[] = [];

      if (currentVersions.imingcp) {
        outputLines.push(
          `font_imingcp_version=${currentVersions.imingcp.version}`
        );
        console.log(
          chalk.gray(
            `  • FONT_IMINGCP_VERSION=${currentVersions.imingcp.version}`
          )
        );
      }
      if (currentVersions.lxgwwenkaitc) {
        outputLines.push(
          `font_lxgwwenkaitc_version=${currentVersions.lxgwwenkaitc.version}`
        );
        console.log(
          chalk.gray(
            `  • FONT_LXGWWENKAITC_VERSION=${currentVersions.lxgwwenkaitc.version}`
          )
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
        await fsPromises.appendFile(outputFile, outputLines.join('\n') + '\n');
        console.log(chalk.green('📝 Version outputs written to GITHUB_OUTPUT'));
      }
    }

    console.log(chalk.green('✅ Version cache updated'));
  }

  async run(): Promise<VersionCheckResult> {
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
          const fsPromises = await import('fs/promises');
          const outputFile = process.env.GITHUB_OUTPUT;

          const outputs = [
            `has-updates=true`,
            `updated-fonts=${result.updatedFonts.map((f) => f.id).join(',')}`,
          ];

          await fsPromises.appendFile(outputFile, outputs.join('\n') + '\n');
          console.log('✅ GitHub Actions outputs written to GITHUB_OUTPUT');
        }

        // Update version cache
        const versionInfos: Record<string, VersionInfo> = {};
        for (const [fontId, version] of Object.entries(
          result.currentVersions
        )) {
          versionInfos[fontId] = {
            version,
            publishedAt: null, // We don't have this info in the result
          };
        }
        await this.updateVersionCache(versionInfos);
      } else {
        console.log(chalk.yellow('📅 All fonts are up to date'));

        if (process.env.GITHUB_ACTIONS && process.env.GITHUB_OUTPUT) {
          const fsPromises = await import('fs/promises');
          const outputFile = process.env.GITHUB_OUTPUT;
          await fsPromises.appendFile(outputFile, 'has-updates=false\n');
          console.log('✅ GitHub Actions outputs written to GITHUB_OUTPUT');
        }
      }

      return result;
    } catch (error) {
      console.error(
        chalk.red('❌ Version check failed:'),
        (error as Error).message
      );
      process.exit(1);
    }
  }
}

// Run if called directly
if (import.meta.url === new URL(process.argv[1] ?? '', 'file:').href) {
  const checker = new VersionChecker();
  checker.run();
}

export default VersionChecker;
