/*
 * Copyright © 2022 NowSecure Inc.
 *
 * SPDX-License-Identifier: MIT
 */

import { promises } from "fs";
import * as core from "@actions/core";
import { convertToSarif } from "../nowsecure-sarif";
import {
  convertToSnapshot,
  submitSnapshotData,
  ActionContext,
} from "../nowsecure-snapshot";
import type { PullReportResponse } from "../types/platform";
import { Filter } from "./config-types";

const { writeFile } = promises;

/** Promisified setTimeout */
export function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve, _reject) => {
    setTimeout(resolve, milliseconds);
  });
}

export function getPlatformToken() {
  const token = core.getInput("token");
  const platformToken = core.getInput("platform_token");
  if (token) {
    if (platformToken) {
      throw new Error(
        "token and platform_token specified. Use platform_token only"
      );
    }

    console.log(
      '"token" is deprecated and will be removed in a future release. Use "platform_token" instead'
    );
    return token;
  }

  if (!platformToken) {
    throw new Error("platform_token must be specified");
  }
  return platformToken;
}

export async function outputToDependencies(
  report: PullReportResponse,
  context: ActionContext,
  githubCorrelator: string,
  githubToken: string
) {
  const deputy = report?.data?.auto?.assessments[0]?.deputy;
  if (deputy) {
    console.log("Converting NowSecure report to Snapshot format...");
    const snapshotData = convertToSnapshot(deputy, githubCorrelator, context);
    console.log("Uploading Snapshot data to GitHub...");
    return submitSnapshotData(snapshotData, context, githubToken);
  } else {
    console.warn(
      "NowSecure did not find dependencies information for this report"
    );
  }
}

export async function outputToSarif(
  report: PullReportResponse,
  labUrl: string,
  filter: Filter
) {
  console.log("Converting NowSecure report to SARIF...");
  const sarif = await convertToSarif(report, labUrl, filter);
  await writeFile("NowSecure.sarif", JSON.stringify(sarif));
}
