/*
 * Copyright © 2022 NowSecure Inc.
 *
 * SPDX-License-Identifier: MIT
 */

import { NowSecure, DEFAULT_API_URL } from "../nowsecure-client";
import nock from "nock";
import fs from "fs";
import path from "path";
import { DEFAULT_KEY_PARAMS, Filter, parseFilter } from "../utils";
import {
  IssueAction,
  IssueActionType,
  NO_ISSUE_ID,
  processFindingIssues,
} from "../nowsecure-issues";
import { Assessment, Finding } from "../types/platform";

const platformToken = "AAABBB";
const assessmentId = "CCCDDD";

async function loadFindings(
  ns: NowSecure
): Promise<[Assessment, Finding[], Finding[], Filter]> {
  const _scope = nock(DEFAULT_API_URL)
    .get("/graphql")
    .query(true)
    .replyWithFile(
      200,
      path.join(__dirname, "resources", "issues", "assessment.json")
    );

  const data = await ns.pullReport(assessmentId);
  const assessment = data?.data?.auto?.assessments[0];
  const findings = assessment?.report.findings;
  const filter = parseFilter({
    "minimum-severity": "low",
    "include-warnings": true,
  });
  const expected = findings.filter(
    (f) => f.affected && (f.severity !== "info" || f.check?.issue?.warn)
  );
  return [assessment, findings, expected, filter];
}

describe("create Issues", () => {
  const ns = new NowSecure(platformToken);

  test("can create issues", async () => {
    const [assessment, findings, expected, filter] = await loadFindings(ns);

    const existing = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "resources", "issues", "before-issues.json"),
        "utf8"
      )
    );

    const actions = processFindingIssues(
      assessment,
      findings,
      existing,
      filter,
      DEFAULT_KEY_PARAMS
    );
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
    const [assessment, findings, _expected, filter] = await loadFindings(ns);
    const postGeneration = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "resources", "issues", "after-issues.json"),
        "utf8"
      )
    );
    const actions = processFindingIssues(
      assessment,
      findings,
      postGeneration,
      filter,
      DEFAULT_KEY_PARAMS
    );
    expect(actions).toEqual([]);
  });
});
