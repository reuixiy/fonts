// Documentation generation interface

export interface DocsGenerationOptions {
  outputDir?: string;
  formats?: string[];
  includeCompliance?: boolean;
  validateLicenses?: boolean;
}

export interface IDocsGenerator {
  generateDocumentation(options?: DocsGenerationOptions): Promise<void>;
  collectLicenseInfo(fontIds?: string[]): Promise<Record<string, unknown>>;
  validateLicenses(
    fontLicenseData?: Record<string, unknown>
  ): Promise<{ checked: boolean; issues: string[] }>;
}
