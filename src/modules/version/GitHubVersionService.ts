// GitHub API service for version checking
import { Octokit } from '@octokit/rest';
import { BaseService } from '@/core/base/BaseService.js';
import type { VersionInfo, GitHubRelease, GitHubCommit } from '@/modules/version/types.js';

export class GitHubVersionService extends BaseService {
  private octokit: Octokit;

  constructor() {
    super('GitHubVersionService');
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });
  }

  async checkReleaseVersion(owner: string, repo: string): Promise<VersionInfo> {
    return this.executeWithErrorHandling(async () => {
      this.log(`Checking latest release for ${owner}/${repo}...`);

      const { data: releases } = await this.octokit.rest.repos.listReleases({
        owner,
        repo,
        per_page: 1,
      });

      if (releases.length === 0) {
        throw new Error('No releases found');
      }

      const latestRelease = releases[0] as GitHubRelease;
      return {
        version: latestRelease.tag_name,
        publishedAt: latestRelease.published_at,
        downloadUrl: latestRelease.assets[0]?.browser_download_url ?? null,
      };
    }, `check release version for ${owner}/${repo}`);
  }

  async checkRepoCommit(owner: string, repo: string): Promise<VersionInfo> {
    return this.executeWithErrorHandling(async () => {
      this.log(`Checking latest commit for ${owner}/${repo}...`);

      const { data: commits } = await this.octokit.rest.repos.listCommits({
        owner,
        repo,
        per_page: 1,
      });

      if (commits.length === 0) {
        throw new Error('No commits found');
      }

      const latestCommit = commits[0] as GitHubCommit;
      return {
        version: latestCommit.sha,
        publishedAt: latestCommit.commit.committer.date,
        message: latestCommit.commit.message,
      };
    }, `check commit for ${owner}/${repo}`);
  }

  async getContentFromBranch(
    owner: string,
    repo: string,
    path: string,
    ref: string
  ): Promise<string> {
    return this.executeWithErrorHandling(async () => {
      const { data } = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref,
      });

      if ('content' in data && data.content) {
        return Buffer.from(data.content, 'base64').toString('utf-8');
      }

      throw new Error('Content not found or not accessible');
    }, `get content from ${owner}/${repo}:${ref}/${path}`);
  }
}
