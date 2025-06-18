// Core workflow interface

export interface IWorkflow {
  runFullWorkflow(): Promise<void>;
  runBuildOnly(): Promise<void>;
  runSpecificFonts(fontIds: string[]): Promise<void>;
  getStatus(): WorkflowStatus;
}

export interface WorkflowStatus {
  isRunning: boolean;
  currentStep?: string;
  progress?: number;
  error?: string;
}
