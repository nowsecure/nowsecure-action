/*
 * Copyright © 2022 NowSecure Inc.
 *
 * SPDX-License-Identifier: MIT
 */

import { NowSecure, DEFAULT_API_URL } from "../nowsecure-client";
import nock from "nock";
import fs from "fs";
import path from "path";
import { Filter, parseFilter } from "../utils";
import {
  IssueAction,
  IssueActionType,
  NO_ISSUE_ID,
  processFindingIssues,
} from "../nowsecure-issues";
import { Finding } from "../types/platform";

const platformToken = "AAABBB";
const assessmentId = "CCCDDD";

async function loadFindings(
  ns: NowSecure
): Promise<[Finding[], Finding[], Filter]> {
  const _scope = nock(DEFAULT_API_URL)
    .get("/graphql")
    .query(true)
    .replyWithFile(
      200,
      path.join(__dirname, "resources", "issues", "assessment.json")
    );

  const data = await ns.pullReport(assessmentId);
  const findings = data?.data?.auto?.assessments[0]?.report.findings;
  const filter = parseFilter({
    "minimum-severity": "low",
    "include-warnings": true,
  });
  const expected = findings.filter(
    (f) => f.affected && (f.severity !== "info" || f.check?.issue?.warn)
  );
  return [findings, expected, filter];
}

describe("create Issues", () => {
  const ns = new NowSecure(platformToken);

  test("can create issues", async () => {
    const [findings, expected, filter] = await loadFindings(ns);

    const existing = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "resources", "issues", "before-issues.json"),
        "utf8"
      )
    );
    const actions = processFindingIssues(findings, existing, filter);
    const expectedActions: IssueAction[] = expected.map((x) => {
      return {
        finding: x,
        existingId: NO_ISSUE_ID,
        action: IssueActionType.CREATE,
      };
    });
    expect(actions).toEqual(expectedActions);
  });

  test("can re-identify issues", async () => {
    const [findings, _expected, filter] = await loadFindings(ns);
    const postGeneration = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "resources", "issues", "after-issues.json"),
        "utf8"
      )
    );
    const actions = processFindingIssues(findings, postGeneration, filter);
    expect(actions).toEqual([]);
  });
});
