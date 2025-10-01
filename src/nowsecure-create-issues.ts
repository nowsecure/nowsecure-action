/*
 * Copyright © 2021-2022 NowSecure Inc.
 *
 * SPDX-License-Identifier: MIT
 */

import * as core from "@actions/core";
import { NowSecure } from "./nowsecure-client";
import { Assessment, Finding } from "./types/platform";
import { NsConfig, CustomError, platformConfig } from "./utils";
import { GitHubRepo } from "./utils/github-issues";
import {
  IssueActionType,
  nsIssueTag,
  processFindingIssues,
} from "./nowsecure-issues";
import * as github from "@actions/github";
import GitHub from "./types/github";
import { renderFinding } from "./issue-templates";
import { FindingRenderOptions } from "./issue-templates/render_finding";
import {
  FindingToIssueMap,
  githubJobSummary,
  githubWriteJobSummary,
} from "./nowsecure-summary";

/** Rate limit will not permit that many calls. Wait until the reset data */
class InsufficientRateLimitAvailableError extends CustomError {
  constructor(
    requiredCalls: number,
    limit: GitHub.RateLimitInfo,
    message?: string
  ) {
    const limitResets = new Date(limit.reset);
    message =
      message ||
      `Failed from rate limit: ${requiredCalls} required, ${limit.remaining} remaining. Limit will reset at ${limitResets}`;

    super(message);
    this.requiredCalls = requiredCalls;
    this.limit = limit;
    this.limitResets = limitResets;
  }

  public requiredCalls: number;
  public limit: GitHub.RateLimitInfo;
  public limitResets: Date;
}

const getRepo = () => {
  const repoName = core.getInput("repo") || github.context.repo.repo;
  const repoOwner = core.getInput("repo_owner") || github.context.repo.owner;

  return new GitHubRepo(repoOwner, repoName, core.getInput("github_token"));
};

export async function run() {
  const config = new NsConfig(core.getInput("config_path"));
  const configName = core.getInput("config");

  const repo = getRepo();
  const platform = platformConfig();
  const ns = new NowSecure(platform);

  const minimumScore = parseInt(core.getInput("minimum_score"), 10);
  const reportId = core.getInput("report_id");
  console.log(`Fetching NowSecure report with ID: ${reportId}`);

  const jobConfig = config.getConfig(configName, "issues");

  let pollInterval = 60000;

  // Poll Platform to resolve the report ID to a report.
  // GitHub Actions will handle the timeout for us in the event something goes awry.
  const data = await ns.pollForReport(reportId, pollInterval);

  const assessment = data?.data?.auto?.assessments[0];
  const report = assessment?.report;
  const score = assessment?.score;
  if (!report) {
    throw new Error("No report data");
  }

  console.log(
    `Total number of findings in report ${reportId}: ${report.findings.length}`
  );

  const createIssue = (finding: Finding) => {
    const linkBlock = `

---

\`NowSecure finding identifier: Do not delete.
${nsIssueTag(assessment, finding, jobConfig.key)}
\``;

    const options: FindingRenderOptions = {
      maxRows: jobConfig.maxRows,
    };

    const { title, body } = renderFinding(
      assessment,
      finding,
      linkBlock,
      platform,
      options
    );
    return repo.createIssue({ title, body });
  };

  // pull all the issues we have to determine dupes and to re-open issues.
  const existingIssues = await repo.existingIssues();
  console.log(`${existingIssues.length} issues found for the repository`);

  const actionList = processFindingIssues(
    assessment,
    report.findings,
    existingIssues,
    jobConfig.filter,
    jobConfig.key
  );

  if (!actionList.length) {
    return;
  }

  // Check that we have sufficient resources available before trying to add the new issues.
  // Better to fail completely than to do a partial job.
  const { core: coreRateLimit } = await repo.rateLimit();
  if (coreRateLimit.remaining < actionList.length) {
    throw new InsufficientRateLimitAvailableError(
      actionList.length,
      coreRateLimit
    );
  }

  const issueMap: FindingToIssueMap = {};

  // Process the required actions, updating the finding key -> action mapping
  for (const action of actionList) {
    const finding = action.finding;
    issueMap[action.finding.key] = action;
    switch (action.action) {
      case IssueActionType.CREATE:
        const { data } = await createIssue(finding);
        action.existingIssue = data;
        break;

      case IssueActionType.REOPEN:
        await repo.reopenIssue(action.existingIssue.number);
        break;
    }
  }

  if (jobConfig.summary !== "none") {
    githubJobSummary(jobConfig.summary, platform, assessment, issueMap);
    await githubWriteJobSummary();
  }

  if (minimumScore > 0) {
    if (score < minimumScore) {
      throw new Error(
        `Score: ${score} is less than minimum_score: ${minimumScore}`
      );
    }
  }
}

run();
