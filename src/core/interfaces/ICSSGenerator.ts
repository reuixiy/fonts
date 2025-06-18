// CSS generation interface

export interface ICSSGenerator {
  init(): Promise<void>;
  generateAll(): Promise<void>;
  generateSpecific(fontIds: string[]): Promise<void>;
  generateUnified(): Promise<void>;
  cleanup(): Promise<void>;
}
