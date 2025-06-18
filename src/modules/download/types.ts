// Download module specific types
export interface DownloadResult {
  path: string;
  version: string;
  originalName: string;
}

export interface DownloadResults {
  [fontId: string]: DownloadResult | { error: string };
}

export interface GitHubAsset {
  name: string;
  size: number;
  browser_download_url: string;
}

export interface GitHubRelease {
  tag_name: string;
  assets: GitHubAsset[];
}

export interface FileDownloadInfo {
  path: string;
  style?: string;
  outputPath: string;
}
