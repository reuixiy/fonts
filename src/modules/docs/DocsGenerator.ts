// Documentation generation service
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { BaseService } from '@/core/base/BaseService.js';
import type {
  IDocsGenerator,
  DocsGenerationOptions,
} from '@/core/interfaces/IDocsGenerator.js';
import type { BuildConfig } from '@/types/config.js';
import type { LicenseData, FontLicenseData } from '@/modules/docs/types.js';
import { LicenseService } from '@/modules/docs/LicenseService.js';
import { LicenseGenerator } from '@/modules/docs/LicenseGenerator.js';
import { ReadmeGenerator } from '@/modules/docs/ReadmeGenerator.js';

export class DocsGenerator extends BaseService implements IDocsGenerator {
  private licenseService: LicenseService;
  private licenseGenerator: LicenseGenerator;
  private readmeGenerator: ReadmeGenerator;

  constructor(private buildConfig: BuildConfig) {
    super('DocsGenerator');
    this.licenseService = new LicenseService();
    this.licenseGenerator = new LicenseGenerator();
    this.readmeGenerator = new ReadmeGenerator();
  }

  /**
   * Generate documentation files (license files, README, etc.)
   */
  async generateDocumentation(
    options: DocsGenerationOptions = {}
  ): Promise<void> {
    await this.executeWithErrorHandling(async () => {
      this.log('Generating documentation files...');

      const {
        outputDir = this.buildConfig.outputDir,
        formats = ['markdown', 'json'],
        includeCompliance = true,
        validateLicenses = true,
        includeReadme = true,
        includeLicense = true,
      } = options;

      // Ensure output directory exists
      await mkdir(outputDir, { recursive: true });

      // Generate license files if requested
      if (includeLicense) {
        // Collect license information
        const fontLicenseData = await this.collectLicenseInfo();

        // Validate licenses if requested
        let complianceResult = { checked: false, issues: [] as string[] };
        if (validateLicenses || includeCompliance) {
          complianceResult = await this.validateLicenses(fontLicenseData);
        }

        // Build license data
        const licenseData: LicenseData = {
          generatedAt: new Date().toISOString(),
          generator: 'https://github.com/reuixiy/fonts',
          version: '3.0.0',
          fonts: fontLicenseData,
          compliance: complianceResult,
        };

        // Generate files in requested formats
        for (const format of formats) {
          await this.generateFormat(licenseData, format, outputDir);
        }
      }

      // Generate README if requested
      if (includeReadme) {
        await this.generateReadme(outputDir);
      }

      this.log(`Documentation files generated successfully in ${outputDir}`);
    }, 'documentation file generation');
  }

  /**
   * Collect license information for fonts
   */
  async collectLicenseInfo(
    fontIds?: string[]
  ): Promise<Record<string, FontLicenseData>> {
    return await this.executeWithErrorHandling(async () => {
      this.log('Collecting license information...');

      if (fontIds && fontIds.length > 0) {
        return await this.licenseService.collectSpecificLicenseInfo(fontIds);
      } else {
        return await this.licenseService.collectAllLicenseInfo();
      }
    }, 'license information collection');
  }

  /**
   * Validate licenses for compliance
   */
  async validateLicenses(
    fontLicenseData?: Record<string, FontLicenseData>
  ): Promise<{ checked: boolean; issues: string[] }> {
    return await this.executeWithErrorHandling(async () => {
      this.log('Validating license compliance...');

      const licenseData = fontLicenseData ?? (await this.collectLicenseInfo());
      return await this.licenseService.validateCompliance(licenseData);
    }, 'license validation');
  }

  /**
   * Generate license file in specific format
   */
  private async generateFormat(
    licenseData: LicenseData,
    format: string,
    outputDir: string
  ): Promise<void> {
    // Use .md extension for markdown format instead of .markdown
    const extension = format === 'markdown' ? 'md' : format;
    const fileName = `LICENSE.${extension}`;
    const filePath = join(outputDir, fileName);

    let content: string;

    switch (format) {
      case 'markdown':
      case 'md':
        content = await this.licenseGenerator.generate(licenseData);
        break;
      case 'json':
        content = await this.licenseGenerator.generateJson(licenseData);
        break;
      case 'txt':
        content = await this.licenseGenerator.generatePlainText(licenseData);
        break;
      case 'html':
        content = await this.licenseGenerator.generateHtml(licenseData);
        break;
      default:
        throw new Error(`Unsupported license format: ${format}`);
    }

    await writeFile(filePath, content, 'utf-8');
    this.log(`Generated ${fileName}`);
  }

  /**
   * Generate README file for the build directory
   */
  async generateReadme(outputDir: string): Promise<void> {
    await this.readmeGenerator.generateReadme(outputDir);
  }

  // ...existing code...
}
