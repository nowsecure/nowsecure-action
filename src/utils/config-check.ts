/*
 * Copyright © 2022 NowSecure Inc.
 *
 * SPDX-License-Identifier: MIT
 */

import fs from "fs";
import path from "path";
import YAML from "yaml";
import { severity, checkIds, configLayout } from "./config-types";

/**
 * Validate user inputed checkIds
 */
function isValidCheck(checkInputs: string[], listName: string) {
  const filteredChecks = [
    ...new Set(checkInputs.map((check) => check.toLowerCase())),
  ];

  const isValid = filteredChecks.every((check: string) =>
    checkIds.includes(check.toLowerCase())
  );
  if (!isValid)
    throw new Error(
      `The following checkId(s): [${filteredChecks.filter(
        (check) => !checkIds.includes(check)
      )}] within the ${listName} list are not valid.`
    );

  return filteredChecks;
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

/**
 * Normalize user inputed config file
 */
export function getConfig(configPath: string) {
  try {
    const checkedConfig = {
      severityFilter: ["critical", "high", "medium"],
    } as configLayout;

    let customConfig;
    try {
      customConfig = YAML.parse(
        fs.readFileSync(path.join(configPath, ".nsconfig.yml"), "utf8")
      );
    } catch (e) {
      const error = e as Error;
      console.warn(
        `Did not find a valid .nsconfig.yml file, ignoring...: ${error.message}`
      );
      return checkedConfig;
    }

    const include: string[] = customConfig["include-checks"];
    const exclude: string[] = customConfig["exclude-checks"];
    const severityInput: string = customConfig["minimum-severity"];

    // prefer user defined severity filter; default is medium
    if (severityInput) {
      if (!severity.includes(severityInput.toLowerCase()))
        throw new Error(`${severityInput} is not a valid severity filter type`);

      checkedConfig.severityFilter = severityToSarif(severityInput);
    }

    if (include) {
      checkedConfig.includeChecks = isValidCheck(include, "include");
    }
    if (exclude) {
      checkedConfig.excludeChecks = isValidCheck(exclude, "exclude");
    }

    // throw an error if checkId is found in both lists
    if (checkedConfig.includeChecks && checkedConfig.excludeChecks) {
      const combinedChecks = [
        ...checkedConfig.includeChecks,
        ...checkedConfig.excludeChecks,
      ].filter((check, idx, arr) => arr.indexOf(check) !== idx);

      if (combinedChecks.length)
        throw new Error(
          `Unique checkId(s) must be limited to either the exclude or include list. 
         The following checkId(s) were found in both: ${combinedChecks}`
        );
    }
    return checkedConfig;
  } catch (e) {
    console.error(e);
  }
}
