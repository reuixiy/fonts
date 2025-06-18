// License data collection service
import { BaseService } from '@/core/base/BaseService.js';
import { ConfigManager } from '@/config/index.js';
import type { FontConfig } from '@/types/config.js';
import type { FontLicenseData, LicenseInfo } from '@/modules/license/types.js';

export class LicenseCollector extends BaseService {
  constructor() {
    super('LicenseCollector');
  }

  /**
   * Collect license information for all fonts
   */
  async collectAllLicenseInfo(): Promise<Record<string, FontLicenseData>> {
    const fontConfigs = ConfigManager.load().fonts;
    const licenseData: Record<string, FontLicenseData> = {};

    for (const [fontId, fontConfig] of Object.entries(fontConfigs)) {
      licenseData[fontId] = await this.collectFontLicenseInfo(
        fontId,
        fontConfig
      );
    }

    return licenseData;
  }

  /**
   * Collect license information for specific fonts
   */
  async collectSpecificLicenseInfo(
    fontIds: string[]
  ): Promise<Record<string, FontLicenseData>> {
    const fontConfigs = ConfigManager.load().fonts;
    const licenseData: Record<string, FontLicenseData> = {};

    for (const fontId of fontIds) {
      const fontConfig = fontConfigs[fontId];
      if (fontConfig) {
        licenseData[fontId] = await this.collectFontLicenseInfo(
          fontId,
          fontConfig
        );
      } else {
        this.log(`Font config not found for: ${fontId}`, 'warn');
      }
    }

    return licenseData;
  }

  /**
   * Collect license information for a single font
   */
  private async collectFontLicenseInfo(
    fontId: string,
    fontConfig: FontConfig
  ): Promise<FontLicenseData> {
    return {
      fontId,
      name: fontConfig.name,
      displayName: fontConfig.displayName,
      source: {
        type: fontConfig.source.type,
        owner: fontConfig.source.owner,
        repo: fontConfig.source.repo,
        url: fontConfig.source.url,
      },
      license: this.processlicenseInfo(fontConfig.license),
      description: this.getDescription(fontConfig),
    };
  }

  /**
   * Process license information and add additional details
   */
  private processlicenseInfo(licenseInfo: {
    type: string;
    url: string;
  }): LicenseInfo {
    const processedLicense: LicenseInfo = {
      type: licenseInfo.type,
      url: licenseInfo.url,
    };

    // Add specific requirements based on license type
    switch (licenseInfo.type.toLowerCase()) {
      case 'sil open font license 1.1':
      case 'ofl-1.1':
        processedLicense.attribution = 'Required when redistributing';
        processedLicense.requirements = [
          'Include original copyright notice',
          'Include license text when redistributing',
          'Font name must be changed if modified',
          'Cannot be sold by itself',
        ];
        break;

      case 'ipa font license agreement v1.0':
      case 'ipa':
        processedLicense.attribution = 'Required with specific format';
        processedLicense.requirements = [
          'Include IPA font license agreement',
          'Include original copyright notice',
          'Derived fonts must include "IPA" in the name',
          'Cannot be redistributed for profit without permission',
        ];
        break;

      case 'apache license 2.0':
      case 'apache-2.0':
        processedLicense.attribution = 'Required in documentation';
        processedLicense.requirements = [
          'Include Apache license text',
          'Include original copyright notice',
          'List modifications if any',
          'Include NOTICE file if present',
        ];
        break;

      case 'mit':
        processedLicense.attribution = 'Required in source';
        processedLicense.requirements = [
          'Include MIT license text',
          'Include original copyright notice',
        ];
        break;

      default:
        processedLicense.attribution = 'Check license requirements';
        processedLicense.requirements = ['Refer to original license terms'];
    }

    return processedLicense;
  }

  /**
   * Get description for a font
   */
  private getDescription(fontConfig: FontConfig): string {
    const descriptions: Record<string, string> = {
      imingcp:
        'A high-quality Traditional Chinese serif font based on Mincho style',
      lxgwwenkaitc:
        'A handwriting-style Traditional Chinese font with elegant strokes',
      amstelvar: 'A parametric variable font with multiple design axes',
      'noto-sans-tc': 'Google Noto Sans Traditional Chinese font family',
      'source-han-sans': 'Adobe Source Han Sans pan-CJK font family',
    };

    // Try to match by font ID or name
    const key = fontConfig.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return (
      descriptions[key] ??
      descriptions[
        fontConfig.displayName.toLowerCase().replace(/[^a-z0-9]/g, '')
      ] ??
      'A beautiful font for web typography'
    );
  }

  /**
   * Check if font license allows web use
   */
  canUseForWeb(licenseType: string): boolean {
    const webCompatibleLicenses = [
      'sil open font license 1.1',
      'ofl-1.1',
      'apache license 2.0',
      'apache-2.0',
      'mit',
      'ipa font license agreement v1.0',
      'ipa',
    ];

    return webCompatibleLicenses.includes(licenseType.toLowerCase());
  }

  /**
   * Check if font license allows commercial use
   */
  canUseCommercially(licenseType: string): boolean {
    const commercialLicenses = [
      'sil open font license 1.1',
      'ofl-1.1',
      'apache license 2.0',
      'apache-2.0',
      'mit',
    ];

    return commercialLicenses.includes(licenseType.toLowerCase());
  }

  /**
   * Check if font license allows modification
   */
  canModify(licenseType: string): boolean {
    const modifiableLicenses = [
      'sil open font license 1.1',
      'ofl-1.1',
      'apache license 2.0',
      'apache-2.0',
      'mit',
      'ipa font license agreement v1.0',
      'ipa',
    ];

    return modifiableLicenses.includes(licenseType.toLowerCase());
  }
}
