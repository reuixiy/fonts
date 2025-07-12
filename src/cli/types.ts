// CLI-specific types

// Standard options interface used across commands
export interface StandardOptions {
  fontIds: string[]; // Specific font IDs to process
  outputDir: string; // Output directory
  skipDownload: boolean; // Skip font download step
  skipEdit: boolean; // Skip font editing step
  skipSubset: boolean; // Skip font subsetting step
  skipCSS: boolean; // Skip CSS generation step
  skipDocs: boolean; // Skip documentation generation step
  force: boolean; // Force execution (skip version check)
}

// Extended options for docs command
export interface DocsOptions
  extends Pick<StandardOptions, 'outputDir' | 'force'> {
  includeLicense: boolean; // Generate license files
  includeReadme: boolean; // Generate README files
  validateLicenses: boolean; // Validate license compliance
  includeCompliance: boolean; // Include compliance information
}

// Extended options for clean command
export interface CleanOptions extends Pick<StandardOptions, 'force'> {
  cleanBuild: boolean; // Clean build directory
  cleanDownloads: boolean; // Clean downloads directory
  cleanCache: boolean; // Clean cache files
  cleanDeps: boolean; // Clean dependencies
}

// Type for commands that only need basic options
export type BasicOptions = Pick<
  StandardOptions,
  'fontIds' | 'outputDir' | 'force'
>;

export interface CLICommand {
  name: string;
  description: string;
  aliases?: string[];
  execute(args: CLIArgs): Promise<void>;
}

export interface CLIArgs {
  command?: string;
  flags: Record<string, boolean>;
  options: Record<string, string>;
  positional: string[];
  raw: string[];
}

export interface CLIConfig {
  name: string;
  version: string;
  description: string;
  commands: CLICommand[];
}

export interface HelpSection {
  title: string;
  content: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
