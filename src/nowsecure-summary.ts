import * as core from "@actions/core";
import { Finding, Assessment } from "./types/platform";
import { SummaryTableRow } from "@actions/core/lib/summary";
import { assessmentLink } from "./utils";
import { IssueAction, IssueActionType } from "./nowsecure-issues";
import { find } from "lodash";

export type FindingToIssueMap = {
  [index: string]: IssueAction;
};

export type SummaryType = "short" | "long" | string;

export function githubJobSummary(
  which: SummaryType,
  labUrl: string,
  assessment: Assessment,
  findingToIssueMap: FindingToIssueMap
) {
  switch (which) {
    case "short":
      return githubJobSummaryShort(labUrl, assessment, findingToIssueMap);
    case "long":
      return githubJobSummaryLong(labUrl, assessment, findingToIssueMap);
  }
}

export function githubJobSummaryLong(
  labUrl: string,
  assessment: Assessment,
  findingToIssueMap: FindingToIssueMap
) {
  const findingsTable = getFindingsTable(labUrl, assessment, findingToIssueMap);
  const dependenciesTable = getDependenciesTable(assessment);

  return core.summary
    .addImage(
      "https://www.nowsecure.com/wp-content/uploads/2022/03/Logo-Nowsecure.png",
      "NowSecure Logo"
    )
    .addHeading("Security Test Results")
    .addTable(findingsTable)
    .addSeparator()
    .addRaw(
      `<details${
        dependenciesTable.length <= 11 ? " open" : ""
      }><summary>Dependencies (click to expand)</summary>`,
      true
    )
    .addTable(dependenciesTable)
    .addRaw("</details>", true)
    .addLink("View NowSecure Report", assessmentLink(labUrl, assessment));
}

function riskLine(
  labUrl: string,
  assessment: Assessment,
  finding: Finding,
  findingToIssueMap: FindingToIssueMap
) {
  const { key, title } = finding;
  const findingUrl = assessmentLink(labUrl, assessment, finding);
  let line = `- ${key} - <a href="${findingUrl}">${title}</a>`;
  const issue = findingToIssueMap?.[key]?.existingIssue;
  if (issue) {
    line += ` - Issue <a href="${
      issue.html_url
    }">${issue.number.toString()}</a>`;
  }
  return line;
}

export function githubJobSummaryShort(
  labUrl: string,
  assessment: Assessment,
  findingToIssueMap: FindingToIssueMap
) {
  type Grouping = { pass: Finding[]; fail: Finding[] };
  const grouping: Grouping = { pass: [], fail: [] };
  const findingsGroupedBy = assessment.report.findings.reduce<Grouping>(
    (acc, finding) => {
      const { check, affected } = finding;
      if (affected && check.issue?.cvss > 0) {
        acc.fail.push(finding);
      } else {
        acc.pass.push(finding);
      }
      return acc;
    },
    grouping
  );

  const testResultHeader = [
    { data: "Test Result", header: true },
    { data: "Count", header: true },
  ];

  const results = [
    [":white_check_mark: Pass", findingsGroupedBy.pass.length.toString()],
    [":red_circle: Fail", findingsGroupedBy.fail.length.toString()],
    [":bricks: Dependencies", assessment.deputy.components.length.toString()],
  ];

  const formatDetail = (findings: Finding[]) =>
    findings
      .map((finding) =>
        riskLine(labUrl, assessment, finding, findingToIssueMap)
      )
      .join("<br>");

  return core.summary
    .addImage(
      "https://www.nowsecure.com/wp-content/uploads/2022/03/Logo-Nowsecure.png",
      "NowSecure Logo"
    )
    .addHeading("Security Test Results")
    .addTable([testResultHeader, ...results])
    .addDetails("Risks", formatDetail(findingsGroupedBy.fail))
    .addSeparator()
    .addLink("View NowSecure Report", assessmentLink(labUrl, assessment));
}

export async function githubWriteJobSummary(): Promise<void> {
  if (process.env.GITHUB_STEP_SUMMARY) {
    await core.summary.write();
  }
}

export function getDependenciesTable(
  assessment: Assessment
): SummaryTableRow[] {
  const header: SummaryTableRow = [
    { data: "Dependency", header: true },
    { data: "Version", header: true },
    { data: "File", header: true },
  ];
  const deps = assessment.deputy.components
    .filter(({ version }) => version)
    .map<SummaryTableRow>(({ source: file, name, version }) => {
      return [name ?? "name", version ?? "version", file ?? "file"];
    });
  return [header, ...deps];
}

function issueStatus(finding: Finding, findingToIssueMap: FindingToIssueMap) {
  const action = findingToIssueMap[finding.key];
  if (!action) {
    return "";
  }

  const issue = action.existingIssue;
  let text: string;
  switch (action.action) {
    case IssueActionType.CREATE:
      text = "Created ";
      break;
    case IssueActionType.REOPEN:
      text = "Reopened ";
      break;
    case IssueActionType.NO_ACTION:
      text = "";
      break;
  }
  return `${text}<a href="${issue.html_url}">${issue.number.toString()}</a>`;
}

export function getFindingsTable(
  labUrl: string,
  assessment: Assessment,
  findingToIssueMap: FindingToIssueMap
): SummaryTableRow[] {
  const header: SummaryTableRow = [
    { data: "Checks", header: true },
    { data: "Pass", header: true },
    { data: "Category", header: true },
    { data: "Summary", header: true },
  ];
  if (findingToIssueMap) {
    header.push("Issue");
  }

  const checks = assessment.report.findings
    .filter(({ affected, check }) => affected && check.issue?.cvss > 0)
    .map<SummaryTableRow>((finding) => {
      const {
        check,
        key,
        affected,
        title: findingTitle,
        category: findingCategory,
      } = finding;
      const mark = affected ? ":red_circle:" : ":white_check_mark:";
      const category = check.issue?.category ?? findingCategory ?? "misc";
      const titleText =
        check.issue?.title ?? findingTitle ?? "See report for details";
      const findingLink = assessmentLink(labUrl, assessment, finding);
      const title = `<a href="${findingLink}">${titleText}</a>`;
      const row = [key, mark, category, title];
      if (findingToIssueMap) {
        row.push(issueStatus(finding, findingToIssueMap));
      }
      return row;
    });
  return [header, ...checks];
}
