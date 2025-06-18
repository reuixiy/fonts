// API related types

export interface VersionCache {
  [fontId: string]: {
    version: string;
    publishedAt?: string | null;
  };
}

export interface GitHubReleaseInfo {
  version: string;
  publishedAt: string | null;
  downloadUrl: string | null;
}

export interface GitHubCommitInfo {
  version: string;
  publishedAt: string | null;
  message: string;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}
