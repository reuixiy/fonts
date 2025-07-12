// Font editing interface

export interface IFontEditor {
  editAll(): Promise<void>;
  editSpecific(fontIds: string[]): Promise<void>;
  validateEdits(fontIds?: string[]): Promise<boolean>;
  cleanup(): Promise<void>;
}
