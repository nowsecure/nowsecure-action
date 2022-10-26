/*
 * Copyright © 2021-2022 NowSecure Inc.
 *
 * SPDX-License-Identifier: MIT
 */
import { Assessment, Finding } from "./types/platform";
import {
  Filter,
  findingKey,
  findingMatchesFilter,
  KeyParams,
  Labels,
} from "./utils";
import GitHub from "./types/github";

export enum IssueActionType {
  CREATE,
  REOPEN,
}

export interface IssueAction {
  finding: Finding;
  existingId: number;
  action: IssueActionType;
}

export const NO_ISSUE_ID = 0;

/** Generate unique tag for finding, used to re-identify existing issues we created */
export function nsIssueTag(
  assessment: Assessment,
  finding: Finding,
  keyParams: KeyParams
) {
  return "nowsecure_unique_id=" + findingKey(assessment, finding, keyParams);
}

/**
 * Determines what to do for each finding in a list.
 *
 * @param findings List of findings to process
 * @param existingIssues List of existing issues returned from GitHub
 * @param filter Filter to apply to the findings list
 * @returns List of IssueActions for each finding that requires processing
 */
export function processFindingIssues(
  assessment: Assessment,
  findings: Finding[],
  existingIssues: GitHub.Issue[],
  filter: Filter,
  keyParams: KeyParams
): IssueAction[] {
  const actionList: IssueAction[] = [];

  // Note:  if there are pull requests open OR closed, they will have been returned
  // in the result set of the /issues API call.
  const hasExisting = existingIssues && existingIssues.length;
  console.log(
    hasExisting
      ? `${existingIssues.length} issues found`
      : "No existing issues found"
  );

  for (var finding of findings) {
    if (findingMatchesFilter(finding, filter)) {
      let issueToUpdate = hasExisting
        ? findExistingIssue(assessment, finding, existingIssues, keyParams)
        : null;

      if (!issueToUpdate) {
        console.log(
          `Finding ${finding.key}: Creating a new issue, ${finding.title} / ${finding.severity}`
        );
        actionList.push({
          finding,
          existingId: NO_ISSUE_ID,
          action: IssueActionType.CREATE,
        });
      } else if (issueToUpdate.state === "open") {
        console.log(
          `Finding ${finding.key}: Found open issue ${issueToUpdate.number}, no action required`
        );
      } else if (issueToUpdate.state === "closed") {
        console.log(
          `Finding ${finding.key}: Re-open issue ${issueToUpdate.number}`
        );
        actionList.push({
          finding,
          existingId: issueToUpdate.number,
          action: IssueActionType.REOPEN,
        });
      } else {
        console.log(
          `Issue ${issueToUpdate.number} has unexpected state ${issueToUpdate.state}`
        );
      }
    }
  }
  return actionList;
}

/**
 * Scans the list of existing findings to find a previously created finding
 * @param finding: Finding from the NS report to locate
 * @param existing: List of GitHub issues for the target repository
 * @returns Matching GitHub issue, or null
 */
function findExistingIssue(
  assessment: Assessment,
  finding: Finding,
  existing: GitHub.Issue[],
  keyParams: KeyParams
): GitHub.Issue | null {
  const tag = nsIssueTag(assessment, finding, keyParams);
  const issueMatchesFinding = (issue: GitHub.Issue) =>
    issue.body && issue.body.indexOf(tag) >= 0;

  // list of matching issues in descending id order (i.e. newest first)
  const candidates = existing
    .filter(issueMatchesFinding)
    .sort((a, b) => b.number - a.number);

  // Return the newest open issue; if none, return the newest (closed) issue
  if (candidates.length == 0) {
    return null;
  }
  const open = candidates.find((x) => x.state === "open");
  if (open) {
    return open;
  }
  return candidates[0];
}

/**
 * Return the list of labels to apply to a new issue
 */
export function findingLabels(finding: Finding, labelConfig: Labels) {
  const rawSeverity = finding.severity || "info";
  const severity =
    rawSeverity === "info" && finding.check?.issue?.warn
      ? "warning"
      : rawSeverity;

  // pick the labels from 'always' and the finding's severity
  const labels = (labelConfig.always || []).concat(labelConfig[severity] || []);

  // add the finding category in if appropriate
  if (labelConfig.categoryLabels && finding.category) {
    labels.push(finding.category);
  }

  // de-dedup.
  return [...new Set(labels)];
}
