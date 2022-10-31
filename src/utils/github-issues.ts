/*
 * Copyright © 2022 NowSecure Inc.
 *
 * SPDX-License-Identifier: MIT
 */

import { Octokit } from "@octokit/action";

import GitHub from "../types/github";

/**
 * Class to handle required interactions with a GitHub repo
 */

export class GitHubRepo {
  /**
   *
   * @param repoOwner owner of the repo
   * @param repoName name of the repo
   * @param auth auth token (GitHub token or private token)
   */
  constructor(public repoOwner: string, public repoName: string, auth: string) {
    this.octokit = new Octokit({ auth });
  }

  /**
   * List all existing issues
   * @returns
   */
  async existingIssues(): Promise<GitHub.Issue[]> {
    // note, per_page is hardcoded to 3000 here.  Ask Keegan.
    const existing = await this.octokit.paginate(
      this.octokit.rest.issues.listForRepo,
      {
        owner: this.repoOwner,
        repo: this.repoName,
        state: "all",
        sort: "created",
        per_page: 3000,
      }
    );
    return existing;
  }

  async createIssue(issue: GitHub.CreateIssueParams) {
    return await this.octokit.request("POST /repos/{owner}/{repo}/issues", {
      owner: this.repoOwner,
      repo: this.repoName,
      ...issue,
    });
  }

  async closeIssue(issueId: number) {
    return await this.octokit.request(
      "PATCH /repos/{owner}/{repo}/issues/{issue_number}",
      {
        owner: this.repoOwner,
        repo: this.repoName,
        issue_number: issueId,
        state: "closed",
      }
    );
  }

  async reopenIssue(issueId: number) {
    return await this.octokit.request(
      "PATCH /repos/{owner}/{repo}/issues/{issue_number}",
      {
        owner: this.repoOwner,
        repo: this.repoName,
        issue_number: issueId,
        state: "open",
      }
    );
  }

  private octokit: Octokit;
  static issueInterval = 1000;

  async rateLimit(): Promise<GitHub.RateLimitResources> {
    return (await this.octokit.request("GET /rate_limit")).data.resources;
  }
}
