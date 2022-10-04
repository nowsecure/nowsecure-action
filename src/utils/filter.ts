/*
 * Copyright © 2022 NowSecure Inc.
 *
 * SPDX-License-Identifier: MIT
 */

import type { Finding } from "../types/platform";
import { severity, Filter, JSONObject, JSONType } from "./config-types";
import { ValueError, CustomError } from "./errors";

/** Fields are all valid but the overall filter doesn't make sense */
export class InvalidFilterError extends CustomError {}

/** Returns true if the finding fulfills the requirements of the filter */
export function findingMatchesFilter(
  finding: Finding,
  filter: Filter
): boolean {
  if (!finding.affected) {
    return false;
  }

  if (filter.includeChecks && filter.includeChecks.includes(finding.key)) {
    return true;
  }

  if (filter.excludeChecks && filter.excludeChecks.includes(finding.key)) {
    return false;
  }

  if (
    filter.severityFilter &&
    filter.severityFilter.includes(finding.severity)
  ) {
    return true;
  }

  if (filter.includeWarnings && finding.check?.issue?.warn) {
    return true;
  }

  return false;
}

/**
 * Severities to include in report based off user input
 */
function severityToSarif(input: string): Array<string> {
  const severityLevels: Array<string> = [
    "critical",
    "high",
    "medium",
    "low",
    "info",
  ];

  return severityLevels.slice(0, severityLevels.indexOf(input) + 1);
}

/** Returns true if the test parameter is a (possibly empty) array of strings */
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export function isStringArray(test: any): test is string[] {
  return (
    Array.isArray(test) && test.findIndex((x) => typeof x !== "string") == -1
  );
}

/**
 * Validate user inputed checkIds
 */
function isValidCheck(
  checkInputs: JSONType,
  listName: string,
  checkIds: string[] = null
) {
  if (!isStringArray(checkInputs)) {
    throw new TypeError(`${listName} must be a list of strings`);
  }

  const filteredChecks = [
    ...new Set(checkInputs.map((check) => check.toLowerCase())),
  ];

  if (checkIds) {
    const isValid = filteredChecks.every((check: string) =>
      checkIds.includes(check.toLowerCase())
    );
    if (!isValid)
      throw new ValueError(
        `The following checkId(s): [${filteredChecks.filter(
          (check) => !checkIds.includes(check)
        )}] within the ${listName} list are not valid.`
      );
  }

  return filteredChecks;
}

/**
 * Parses and validates a single filter configuration
 *
 * @param filterConfig
 * @returns
 */
export function parseFilter(
  filterConfig: JSONObject,
  checkIds: string[] = null
): Filter {
  // We do not call checkObject here as the outermost level may have
  // keys other than the filter keys
  const checkedConfig: Filter = {};
  const include = filterConfig["include-checks"];
  const exclude = filterConfig["exclude-checks"];
  const severityInput = filterConfig["minimum-severity"];
  const includeWarnings = filterConfig["include-warnings"];

  if (severityInput !== undefined) {
    if (typeof severityInput !== "string") {
      throw new TypeError("minimum-severity must be a string");
    }

    if (!severity.includes(severityInput.toLowerCase())) {
      throw new ValueError(
        `${severityInput} is not a valid severity filter type`
      );
    }

    checkedConfig.severityFilter = severityToSarif(severityInput);
  }

  if (include) {
    checkedConfig.includeChecks = isValidCheck(include, "include", checkIds);
  }
  if (exclude) {
    checkedConfig.excludeChecks = isValidCheck(exclude, "exclude", checkIds);
  }

  if (includeWarnings !== undefined) {
    if (typeof includeWarnings !== "boolean") {
      throw new TypeError(
        "include-warnings must be a boolean value if specified"
      );
    }
    checkedConfig.includeWarnings = includeWarnings;
  }

  // throw an error if checkId is found in both lists
  if (checkedConfig.includeChecks && checkedConfig.excludeChecks) {
    const combinedChecks = [
      ...checkedConfig.includeChecks,
      ...checkedConfig.excludeChecks,
    ].filter((check, idx, arr) => arr.indexOf(check) !== idx);

    if (combinedChecks.length)
      throw new InvalidFilterError(
        `Unique checkId(s) must be limited to either the exclude or include list. 
        The following checkId(s) were found in both: ${combinedChecks}`
      );
  }
  return checkedConfig;
}

export const DEFAULT_SARIF_FILTER: Filter = {
  severityFilter: ["critical", "high", "medium"],
};

export const DEFAULT_ISSUES_FILTER: Filter = {
  severityFilter: ["critical", "high", "medium"],
};
