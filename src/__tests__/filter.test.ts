/*
 * Copyright © 2022 NowSecure Inc.
 *
 * SPDX-License-Identifier: MIT
 */

import fs from "fs";
import path from "path";
import { Finding } from "../types/platform";
import { JSONObject, parseFilter, findingMatchesFilter } from "../utils";

const findings: Finding[] = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "resources", "filter", "findings.json"),
    "utf8"
  )
);

describe("test filters", () => {
  function filterTest(filterDef: JSONObject) {
    const filter = parseFilter(filterDef);
    return findings
      .filter((finding) => findingMatchesFilter(finding, filter))
      .map((finding) => finding.key);
  }

  function severityTest(severity: string) {
    return filterTest({ "minimum-severity": severity });
  }

  test("handles severities", () => {
    expect(severityTest("critical")).toEqual(["check_1"]);
    expect(severityTest("high")).toEqual(["check_1", "check_2"]);
    expect(severityTest("medium")).toEqual(["check_1", "check_2", "check_3"]);
    expect(severityTest("low")).toEqual([
      "check_1",
      "check_2",
      "check_3",
      "check_4",
    ]);
    expect(severityTest("info")).toEqual([
      "check_1",
      "check_2",
      "check_3",
      "check_4",
      "check_5",
      "check_6",
      "check_7",
    ]);
  });

  test("handles warnings", () => {
    const FILTER = {
      "minimum-severity": "critical",
      "include-warnings": true,
    };

    expect(filterTest(FILTER)).toEqual(["check_1", "check_5"]);
  });

  test("exclusion list", () => {
    const FILTER = {
      "minimum-severity": "high",
      "exclude-checks": ["check_2"],
    };
    expect(filterTest(FILTER)).toEqual(["check_1"]);
  });

  test("inclusion list", () => {
    const FILTER = {
      "minimum-severity": "high",
      "include-checks": ["check_5"],
    };
    expect(filterTest(FILTER)).toEqual(["check_1", "check_2", "check_5"]);
  });
});
