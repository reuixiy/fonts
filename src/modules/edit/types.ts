// Edit module specific types

export interface EditResult {
  fontId: string;
  script: string;
  status: 'success' | 'error' | 'skipped';
  message?: string;
  outputPath?: string;
  executionTime?: number;
}

export interface EditResults {
  [fontId: string]: EditResult[];
}

export interface PythonScriptConfig {
  name: string;
  path: string;
  description?: string;
  requiredPackages?: string[];
  targetFonts?: string[] | 'all'; // Specific font IDs or 'all'
  enabled?: boolean;
}

export interface EditProcessConfig {
  scripts: PythonScriptConfig[];
  workingDirectory?: string;
  pythonExecutable?: string;
  enableLogging?: boolean;
  validateAfterEdit?: boolean;
}
