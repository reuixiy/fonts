// License compliance validator
import { URL } from 'node:url';
import { BaseService } from '@/core/base/BaseService.js';
import type { FontLicenseData } from '@/modules/license/types.js';

export class ComplianceValidator extends BaseService {
  constructor() {
    super('ComplianceValidator');
  }

  /**
   * Validate license compliance for all fonts
   */
  async validateCompliance(
    fonts: Record<string, FontLicenseData>
  ): Promise<{ checked: boolean; issues: string[] }> {
    const issues: string[] = [];

    for (const [fontId, fontData] of Object.entries(fonts)) {
      const fontIssues = this.validateFontCompliance(fontId, fontData);
      issues.push(...fontIssues);
    }

    return {
      checked: true,
      issues,
    };
  }

  /**
   * Validate compliance for a single font
   */
  private validateFontCompliance(
    fontId: string,
    fontData: FontLicenseData
  ): string[] {
    const issues: string[] = [];
    const { license } = fontData;

    // Check if license type is recognized
    if (!this.isKnownLicense(license.type)) {
      issues.push(`Unknown license type for ${fontId}: ${license.type}`);
    }

    // Check if license URL is accessible
    if (!license.url || !this.isValidUrl(license.url)) {
      issues.push(`Invalid or missing license URL for ${fontId}`);
    }

    // Check for restrictive licenses
    if (this.hasRestrictions(license.type)) {
      const restrictions = this.getRestrictions(license.type);
      issues.push(
        `${fontId} has usage restrictions: ${restrictions.join(', ')}`
      );
    }

    // Check for attribution requirements
    if (this.requiresAttribution(license.type) && !license.attribution) {
      issues.push(`${fontId} requires attribution but none specified`);
    }

    return issues;
  }

  /**
   * Check if license type is known/recognized
   */
  private isKnownLicense(licenseType: string): boolean {
    const knownLicenses = [
      'sil open font license 1.1',
      'ofl-1.1',
      'apache license 2.0',
      'apache-2.0',
      'mit',
      'ipa font license agreement v1.0',
      'ipa',
      'bsd',
      'gpl',
      'lgpl',
    ];

    return knownLicenses.includes(licenseType.toLowerCase());
  }

  /**
   * Check if URL is valid
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if license has usage restrictions
   */
  private hasRestrictions(licenseType: string): boolean {
    const restrictiveLicenses = [
      'ipa font license agreement v1.0',
      'ipa',
      'gpl',
      'lgpl',
    ];

    return restrictiveLicenses.includes(licenseType.toLowerCase());
  }

  /**
   * Get specific restrictions for a license
   */
  private getRestrictions(licenseType: string): string[] {
    const type = licenseType.toLowerCase();

    switch (type) {
      case 'ipa font license agreement v1.0':
      case 'ipa':
        return ['requires specific name format', 'profit restrictions'];
      case 'gpl':
        return ['copyleft requirements', 'source code disclosure'];
      case 'lgpl':
        return ['limited copyleft requirements'];
      default:
        return ['unknown restrictions'];
    }
  }

  /**
   * Check if license requires attribution
   */
  private requiresAttribution(licenseType: string): boolean {
    const attributionRequired = [
      'sil open font license 1.1',
      'ofl-1.1',
      'apache license 2.0',
      'apache-2.0',
      'mit',
      'ipa font license agreement v1.0',
      'ipa',
      'bsd',
    ];

    return attributionRequired.includes(licenseType.toLowerCase());
  }

  /**
   * Check if font can be used for web purposes
   */
  canUseForWeb(licenseType: string): boolean {
    const webCompatible = [
      'sil open font license 1.1',
      'ofl-1.1',
      'apache license 2.0',
      'apache-2.0',
      'mit',
      'ipa font license agreement v1.0',
      'ipa',
    ];

    return webCompatible.includes(licenseType.toLowerCase());
  }

  /**
   * Check if font can be used commercially
   */
  canUseCommercially(licenseType: string): boolean {
    const commercialFriendly = [
      'sil open font license 1.1',
      'ofl-1.1',
      'apache license 2.0',
      'apache-2.0',
      'mit',
    ];

    return commercialFriendly.includes(licenseType.toLowerCase());
  }
}
