// JSON license file generator
import { BaseService } from '@/core/base/BaseService.js';
import type { LicenseData, FontLicenseData } from '@/modules/license/types.js';

export class JsonGenerator extends BaseService {
  constructor() {
    super('JsonGenerator');
  }

  /**
   * Generate JSON license file
   */
  async generate(licenseData: LicenseData): Promise<string> {
    // Create a clean, formatted JSON structure
    const jsonOutput = {
      metadata: {
        generatedAt: licenseData.generatedAt,
        generator: licenseData.generator,
        version: licenseData.version,
        totalFonts: Object.keys(licenseData.fonts).length,
      },
      compliance: licenseData.compliance,
      fonts: this.formatFontsForJson(licenseData.fonts),
    };

    return JSON.stringify(jsonOutput, null, 2);
  }

  /**
   * Format fonts data for JSON output
   */
  private formatFontsForJson(
    fonts: Record<string, FontLicenseData>
  ): Record<string, unknown> {
    const formatted: Record<string, unknown> = {};

    for (const [fontId, fontData] of Object.entries(fonts)) {
      formatted[fontId] = {
        name: fontData.name,
        displayName: fontData.displayName,
        description: fontData.description,
        source: {
          type: fontData.source.type,
          repository: `${fontData.source.owner}/${fontData.source.repo}`,
          url: fontData.source.url,
        },
        license: {
          type: fontData.license.type,
          url: fontData.license.url,
          attribution: fontData.license.attribution,
          requirements: fontData.license.requirements ?? [],
          permissions: {
            webUse: this.checkPermission(fontData.license.type, 'web'),
            commercialUse: this.checkPermission(
              fontData.license.type,
              'commercial'
            ),
            modification: this.checkPermission(
              fontData.license.type,
              'modification'
            ),
          },
        },
      };
    }

    return formatted;
  }

  /**
   * Check specific license permissions
   */
  private checkPermission(
    licenseType: string,
    permission: 'web' | 'commercial' | 'modification'
  ): boolean {
    const type = licenseType.toLowerCase();

    const permissions = {
      web: [
        'sil open font license 1.1',
        'ofl-1.1',
        'apache license 2.0',
        'apache-2.0',
        'mit',
        'ipa font license agreement v1.0',
        'ipa',
      ],
      commercial: [
        'sil open font license 1.1',
        'ofl-1.1',
        'apache license 2.0',
        'apache-2.0',
        'mit',
      ],
      modification: [
        'sil open font license 1.1',
        'ofl-1.1',
        'apache license 2.0',
        'apache-2.0',
        'mit',
        'ipa font license agreement v1.0',
        'ipa',
      ],
    };

    return permissions[permission].includes(type);
  }
}
