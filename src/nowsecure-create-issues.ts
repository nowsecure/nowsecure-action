/*
 * Copyright © 2021-2022 NowSecure Inc.
 *
 * SPDX-License-Identifier: MIT
 */

import * as core from "@actions/core";
import { NowSecure } from "./nowsecure-client";
import { Assessment, Finding } from "./types/platform";
import {
  NsConfig,
  CustomError,
  platformConfig,
  findingKey,
  KeyParams,
} from "./utils";
import { GitHubRepo } from "./utils/github-issues";
import {
  IssueActionType,
  nsIssueTag,
  processFindingIssues,
  findingLabels,
} from "./nowsecure-issues";
import * as github from "@actions/github";
import GitHub from "./types/github";

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

const getNowSecure = () => {
  const platform = platformConfig();
  return new NowSecure(platform.token, platform.apiUrl, platform.labApiUrl);
};

export async function run() {
  const config = new NsConfig(core.getInput("config_path"));
  const configName = core.getInput("config");

  const repo = getRepo();
  const ns = getNowSecure();

  const reportId = core.getInput("report_id");
  console.log(`Fetching NowSecure report with ID: ${reportId}`);

  const jobConfig = config.getConfig(configName, "issues");

  let pollInterval = 60000;

  // Poll Platform to resolve the report ID to a report.
  // GitHub Actions will handle the timeout for us in the event something goes awry.
  const data = await ns.pollForReport(reportId, pollInterval);

  const assessment = data?.data?.auto?.assessments[0];
  const report = assessment?.report;
  if (!report) {
    throw new Error("No report data");
  }

  console.log(
    `Total number of findings in report ${reportId}: ${report.findings.length}`
  );

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

  for (const action of actionList) {
    const finding = action.finding;
    switch (action.action) {
      case IssueActionType.CREATE:
        await repo.createIssue({
          title: finding.title,
          body: buildBody(assessment, finding, jobConfig.key),
          labels: findingLabels(finding, jobConfig.labels),
        });
        break;

      case IssueActionType.REOPEN:
        await repo.reopenIssue(action.existingId);
        break;
    }
  }
}

export function buildBody(
  assessment: Assessment,
  finding: Finding,
  keyParams: KeyParams
) {
  let result;
  let severity = finding.severity;
  let issue = finding.check.issue;
  result = nsIssueTag(assessment, finding, keyParams);
  result += "<h3>Severity</h3>";
  result += severity ? severity : "N/A";
  result += "<h3>Description:</h3>";
  result += issue && issue.description ? issue.description : "N/A";
  result += "<h3>Impact Summary:</h3>";
  result += issue && issue.impactSummary ? issue.impactSummary : "N/A";
  result += "<h3>Steps to reproduce:</h3>";
  result += issue && issue.stepsToReproduce ? issue.stepsToReproduce : "N/A";
  result += "<h3>Recommendations:</h3></p>";
  result += issue && issue.recommendation ? issue.recommendation : "N/A";

  return result;
}

run();
