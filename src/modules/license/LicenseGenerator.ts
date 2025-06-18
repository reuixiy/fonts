// License generation service
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { BaseService } from '@/core/base/BaseService.js';
import type {
  ILicenseGenerator,
  LicenseGenerationOptions,
} from '@/core/interfaces/ILicenseGenerator.js';
import type { BuildConfig } from '@/types/config.js';
import type { LicenseData, FontLicenseData } from './types.js';
import { LicenseCollector } from './LicenseCollector.js';
import { MarkdownGenerator } from './MarkdownGenerator.js';
import { JsonGenerator } from './JsonGenerator.js';
import { ComplianceValidator } from './ComplianceValidator.js';

export class LicenseGenerator extends BaseService implements ILicenseGenerator {
  private collector: LicenseCollector;
  private markdownGenerator: MarkdownGenerator;
  private jsonGenerator: JsonGenerator;
  private complianceValidator: ComplianceValidator;

  constructor(private buildConfig: BuildConfig) {
    super('LicenseGenerator');
    this.collector = new LicenseCollector();
    this.markdownGenerator = new MarkdownGenerator();
    this.jsonGenerator = new JsonGenerator();
    this.complianceValidator = new ComplianceValidator();
  }

  /**
   * Generate license files
   */
  async generateLicenseFile(
    options: LicenseGenerationOptions = {}
  ): Promise<void> {
    await this.executeWithErrorHandling(async () => {
      this.log('Generating license files...');

      const {
        outputDir = this.buildConfig.outputDir,
        formats = ['markdown', 'json'],
        includeCompliance = true,
        validateLicenses = true,
      } = options;

      // Ensure output directory exists
      await mkdir(outputDir, { recursive: true });

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
        generator: 'Font Auto-Subsetting Workflow v3.0',
        version: '3.0.0',
        fonts: fontLicenseData,
        compliance: complianceResult,
      };

      // Generate files in requested formats
      for (const format of formats) {
        await this.generateFormat(licenseData, format, outputDir);
      }

      this.log(`License files generated successfully in ${outputDir}`);
    }, 'license file generation');
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
        return await this.collector.collectSpecificLicenseInfo(fontIds);
      } else {
        return await this.collector.collectAllLicenseInfo();
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
      return await this.complianceValidator.validateCompliance(licenseData);
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
    const fileName = `LICENSE.${format}`;
    const filePath = join(outputDir, fileName);

    let content: string;

    switch (format) {
      case 'markdown':
        content = await this.markdownGenerator.generate(licenseData);
        break;
      case 'json':
        content = await this.jsonGenerator.generate(licenseData);
        break;
      case 'txt':
        content = await this.markdownGenerator.generatePlainText(licenseData);
        break;
      case 'html':
        content = await this.markdownGenerator.generateHtml(licenseData);
        break;
      default:
        throw new Error(`Unsupported license format: ${format}`);
    }

    await writeFile(filePath, content, 'utf-8');
    this.log(`Generated ${fileName}`);
  }
}
