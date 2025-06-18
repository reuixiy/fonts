// Version checking interface
import type { VersionCheckResult } from '@/types/index.js';

export interface IVersionChecker {
  run(): Promise<VersionCheckResult>;
  checkSpecific(fontIds: string[]): Promise<VersionCheckResult>;
  updateCache(versions: Record<string, string>): Promise<void>;
  getCurrentVersions(): Promise<Record<string, string>>;
}
