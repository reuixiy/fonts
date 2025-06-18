// License generation interface

export interface LicenseGenerationOptions {
  outputDir?: string;
  formats?: string[];
  includeCompliance?: boolean;
  validateLicenses?: boolean;
}

export interface ILicenseGenerator {
  generateLicenseFile(options?: LicenseGenerationOptions): Promise<void>;
  collectLicenseInfo(fontIds?: string[]): Promise<Record<string, unknown>>;
  validateLicenses(
    fontLicenseData?: Record<string, unknown>
  ): Promise<{ checked: boolean; issues: string[] }>;
}
