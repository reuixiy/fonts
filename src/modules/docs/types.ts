// License module types

export interface LicenseInfo {
  type: string;
  url: string;
  attribution?: string;
  requirements?: string[];
}

export interface FontLicenseData {
  fontId: string;
  name: string;
  displayName: string;
  source: {
    type: string;
    owner: string;
    repo: string;
    url: string;
  };
  license: LicenseInfo;
  description?: string;
  version?: string;
}

export interface LicenseData {
  generatedAt: string;
  generator: string;
  version: string;
  fonts: Record<string, FontLicenseData>;
  compliance: {
    checked: boolean;
    issues: string[];
  };
}

export interface LicenseGenerationOptions {
  outputDir?: string;
  formats?: LicenseFormat[];
  includeCompliance?: boolean;
  validateLicenses?: boolean;
}

export type LicenseFormat = 'markdown' | 'json' | 'txt' | 'html';

export interface LicenseTemplate {
  header: string;
  fontSection: string;
  footer: string;
  compliance: string;
}

export interface ComplianceCheck {
  fontId: string;
  issues: string[];
  warnings: string[];
  valid: boolean;
}

export interface LicenseValidationResult {
  valid: boolean;
  issues: ComplianceCheck[];
  summary: {
    totalFonts: number;
    validFonts: number;
    issuesCount: number;
    warningsCount: number;
  };
}
