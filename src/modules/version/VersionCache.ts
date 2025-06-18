// Version cache management
import fs from 'fs-extra';
import path from 'path';
import { BaseService } from '@/core/base/BaseService.js';
import type { VersionCache } from '@/types/api.js';
import { GitHubVersionService } from '@/modules/version/GitHubVersionService.js';

export class VersionCacheService extends BaseService {
  private versionCachePath: string;
  private githubService: GitHubVersionService;

  constructor() {
    super('VersionCacheService');
    this.versionCachePath = path.join(process.cwd(), '.version-cache.json');
    this.githubService = new GitHubVersionService();
  }

  async loadCache(): Promise<VersionCache> {
    return this.executeWithErrorHandling(async () => {
      // In GitHub Actions, try to load from cache branch first
      if (process.env.GITHUB_ACTIONS) {
        try {
          const cache = await this.loadFromCacheBranch();
          if (cache) {
            this.log('Loaded version cache from cache branch');
            return cache;
          }
        } catch {
          this.log(
            'No cache branch found, checking environment variables...',
            'debug'
          );
        }

        // Fallback to environment variables (legacy support)
        const envCache = this.loadFromEnvironment();
        if (Object.keys(envCache).length > 0) {
          this.log('Loaded version cache from environment variables');
          return envCache;
        }
      }

      // Fallback to local file
      return await this.loadFromFile();
    }, 'load version cache');
  }

  private async loadFromCacheBranch(): Promise<VersionCache | null> {
    const owner = process.env.GITHUB_REPOSITORY_OWNER ?? 'reuixiy';
    const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'fonts';

    try {
      const content = await this.githubService.getContentFromBranch(
        owner,
        repo,
        'version-cache.json',
        'cache'
      );
      return JSON.parse(content) as VersionCache;
    } catch {
      return null;
    }
  }

  private loadFromEnvironment(): VersionCache {
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

    return cacheData;
  }

  private async loadFromFile(): Promise<VersionCache> {
    try {
      return (await fs.readJson(this.versionCachePath)) as VersionCache;
    } catch {
      this.log('No existing version cache found, starting fresh', 'debug');
      return {};
    }
  }

  async saveCache(cache: VersionCache): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      await fs.writeJson(this.versionCachePath, cache, { spaces: 2 });
      this.log('Version cache saved to file');
    }, 'save version cache');
  }

  async updateGitHubActionsOutput(cache: VersionCache): Promise<void> {
    if (!process.env.GITHUB_ACTIONS || !process.env.GITHUB_OUTPUT) {
      return;
    }

    return this.executeWithErrorHandling(async () => {
      this.log('Setting version environment variables for current workflow');

      const outputFile = process.env.GITHUB_OUTPUT!;
      const fsPromises = await import('fs/promises');
      const outputLines: string[] = [];

      Object.entries(cache).forEach(([fontId, { version }]) => {
        const envVarName = `font_${fontId}_version`;
        outputLines.push(`${envVarName}=${version}`);
        this.log(
          `  • FONT_${fontId.toUpperCase()}_VERSION=${version}`,
          'debug'
        );
      });

      if (outputLines.length > 0) {
        await fsPromises.appendFile(outputFile, outputLines.join('\n') + '\n');
        this.log('Version outputs written to GITHUB_OUTPUT');
      }
    }, 'update GitHub Actions output');
  }
}
