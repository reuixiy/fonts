// Main version checker implementation
import { BaseService } from '@/core/base/BaseService.js';
import type { IVersionChecker } from '@/core/interfaces/IVersionChecker.js';
import type { VersionCheckResult } from '@/types/workflow.js';
import type { UpdatedFont } from '@/types/common.js';
import type { FontConfig } from '@/types/config.js';
import { ConfigManager } from '@/config/index.js';
import { GitHubVersionService } from './GitHubVersionService.js';
import { VersionCacheService } from './VersionCache.js';
import type { VersionInfo } from './types.js';

export class VersionChecker extends BaseService implements IVersionChecker {
  private githubService: GitHubVersionService;
  private cacheService: VersionCacheService;

  constructor() {
    super('VersionChecker');
    this.githubService = new GitHubVersionService();
    this.cacheService = new VersionCacheService();
  }

  async run(): Promise<VersionCheckResult> {
    return this.executeWithErrorHandling(async () => {
      this.log('🚀 Font Version Checker');

      const result = await this.checkVersions();

      if (result.hasUpdates) {
        this.log(
          `🎉 Found ${result.updatedFonts.length} font updates:`,
          'info'
        );
        result.updatedFonts.forEach((font) => {
          this.log(
            `  • ${font.name}: ${font.oldVersion} → ${font.newVersion}`,
            'info'
          );
        });

        await this.updateGitHubActionsOutputs(result);
        await this.updateCache(result.currentVersions);
      } else {
        this.log('📅 All fonts are up to date', 'info');
        await this.setNoUpdatesOutput();
      }

      return result;
    }, 'run version check');
  }

  async checkSpecific(fontIds: string[]): Promise<VersionCheckResult> {
    return this.executeWithErrorHandling(async () => {
      this.log(
        `🔍 Checking versions for specific fonts: ${fontIds.join(', ')}`
      );

      const validationResult = ConfigManager.validateFontIds(fontIds);
      if (validationResult.invalid.length > 0) {
        throw new Error(
          `Invalid font IDs: ${validationResult.invalid.join(', ')}`
        );
      }

      return this.checkVersionsForFonts(validationResult.valid);
    }, 'check specific font versions');
  }

  private async checkVersions(): Promise<VersionCheckResult> {
    const fontIds = ConfigManager.getFontIds();
    return this.checkVersionsForFonts(fontIds);
  }

  private async checkVersionsForFonts(
    fontIds: string[]
  ): Promise<VersionCheckResult> {
    const versionCache = await this.cacheService.loadCache();
    const updatedFonts: UpdatedFont[] = [];
    const currentVersions: Record<string, string> = {};

    this.log('🔍 Checking font versions...');

    for (const fontId of fontIds) {
      try {
        const fontConfig = ConfigManager.getFontConfig(fontId);
        this.log(`Checking ${fontConfig.displayName}...`);

        const versionInfo = await this.getVersionInfo(fontConfig);
        currentVersions[fontId] = versionInfo.version;

        const cachedVersion = versionCache[fontId]?.version;
        const currentVersion = versionInfo.version;

        if (!cachedVersion || cachedVersion !== currentVersion) {
          this.log(
            `  ✅ Update found: ${cachedVersion ?? 'none'} → ${currentVersion}`
          );
          updatedFonts.push({
            id: fontId,
            name: fontConfig.displayName,
            oldVersion: cachedVersion ?? 'none',
            newVersion: currentVersion,
            publishedAt: versionInfo.publishedAt,
          });
        } else {
          this.log(`  ✓ No update: ${currentVersion}`, 'debug');
        }
      } catch (error) {
        this.log(
          `  ❌ Error checking ${fontId}: ${(error as Error).message}`,
          'error'
        );
      }
    }

    return {
      updatedFonts,
      currentVersions,
      hasUpdates: updatedFonts.length > 0,
    };
  }

  private async getVersionInfo(fontConfig: FontConfig): Promise<VersionInfo> {
    const { source } = fontConfig;

    switch (source.type) {
      case 'github-release':
        return this.githubService.checkReleaseVersion(
          source.owner,
          source.repo
        );
      case 'github-repo':
        return this.githubService.checkRepoCommit(source.owner, source.repo);
      default:
        throw new Error(`Unsupported source type: ${source.type}`);
    }
  }

  async updateCache(versions: Record<string, string>): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      const cache = Object.fromEntries(
        Object.entries(versions).map(([fontId, version]) => [
          fontId,
          { version },
        ])
      );

      await this.cacheService.saveCache(cache);
      await this.cacheService.updateGitHubActionsOutput(cache);
    }, 'update version cache');
  }

  async getCurrentVersions(): Promise<Record<string, string>> {
    return this.executeWithErrorHandling(async () => {
      const cache = await this.cacheService.loadCache();
      return Object.fromEntries(
        Object.entries(cache).map(([fontId, { version }]) => [fontId, version])
      );
    }, 'get current versions');
  }

  private async updateGitHubActionsOutputs(
    result: VersionCheckResult
  ): Promise<void> {
    if (!process.env.GITHUB_ACTIONS || !process.env.GITHUB_OUTPUT) {
      return;
    }

    return this.executeWithErrorHandling(async () => {
      const fsPromises = await import('fs/promises');
      const outputFile = process.env.GITHUB_OUTPUT!;

      const outputs = [
        'has-updates=true',
        `updated-fonts=${result.updatedFonts.map((f) => f.id).join(',')}`,
      ];

      await fsPromises.appendFile(outputFile, outputs.join('\n') + '\n');
      this.log('✅ GitHub Actions outputs written to GITHUB_OUTPUT');
    }, 'update GitHub Actions outputs');
  }

  private async setNoUpdatesOutput(): Promise<void> {
    if (!process.env.GITHUB_ACTIONS || !process.env.GITHUB_OUTPUT) {
      return;
    }

    return this.executeWithErrorHandling(async () => {
      const fsPromises = await import('fs/promises');
      const outputFile = process.env.GITHUB_OUTPUT!;
      await fsPromises.appendFile(outputFile, 'has-updates=false\n');
      this.log('✅ GitHub Actions outputs written to GITHUB_OUTPUT');
    }, 'set no updates output');
  }
}
