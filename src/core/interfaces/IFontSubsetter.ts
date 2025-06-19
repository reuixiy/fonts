// Font subsetting interface

export interface IFontSubsetter {
  init(): Promise<void>;
  processAll(): Promise<void>;
  processSpecific(fontIds: string[]): Promise<void>;
  validateOutput(fontIds?: string[]): Promise<boolean>;
  cleanup(): Promise<void>;
}
