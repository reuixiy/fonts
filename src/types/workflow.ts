// Workflow related types
import type { UpdatedFont } from '@/types/common.js';

export interface VersionCheckResult {
  hasUpdates: boolean;
  updatedFonts: UpdatedFont[];
  currentVersions: Record<string, string>;
}

export interface WorkflowStatus {
  isRunning: boolean;
  currentStep?: string;
  progress?: number;
  error?: string;
}

export interface WorkflowResult {
  success: boolean;
  duration: number;
  processedFonts: string[];
  errors?: string[];
}
