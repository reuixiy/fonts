// Font downloading interface

export interface IFontDownloader {
  downloadAll(): Promise<void>;
  downloadSpecific(fontIds: string[]): Promise<void>;
  validateDownloads(fontIds?: string[]): Promise<boolean>;
  cleanup(): Promise<void>;
}
