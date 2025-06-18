// Font processing interface

export interface IFontProcessor {
  init(): Promise<void>;
  processAll(): Promise<void>;
  processSpecific(fontIds: string[]): Promise<void>;
  validateOutput(fontIds?: string[]): Promise<boolean>;
  cleanup(): Promise<void>;
}
