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
import type {
  Assessment,
  Finding,
  PullReportResponse,
} from "../types/platform";
import { Filter, KeyParams } from "./config-types";

const { writeFile } = promises;

/** Promisified setTimeout */
export function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve, _reject) => {
    setTimeout(resolve, milliseconds);
  });
}

export interface PlatformConfig {
  /** API token */
  token: string;

  /** GraphQL server */
  apiUrl: string;

  /** REST API (uploads) */
  labApiUrl: string;

  /** UI address */
  labUrl: string;
}

export const assessmentLink = (
  labUrl: string,
  assessment: Assessment,
  finding?: Finding
) => {
  const assessmentUrl = `${labUrl}/app/${assessment.applicationRef}/assessment/${assessment.taskId}`;
  return finding?.checkId
    ? assessmentUrl + `#finding-${finding.checkId}`
    : assessmentUrl;
};

export function platformConfig(): PlatformConfig {
  return {
    token: core.getInput("platform_token"),
    apiUrl: core.getInput("api_url"),
    labApiUrl: core.getInput("lab_api_url"),
    labUrl: core.getInput("lab_url"),
  };
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
  keyParams: KeyParams,
  filter: Filter,
  labUrl: string
) {
  console.log("Converting NowSecure report to SARIF...");
  const sarif = await convertToSarif(report, keyParams, filter, labUrl);
  await writeFile("NowSecure.sarif", JSON.stringify(sarif));
}
