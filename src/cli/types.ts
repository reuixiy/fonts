// CLI-specific types

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
