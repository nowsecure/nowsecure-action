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
import { ValueError } from "./errors";
import {
  DEFAULT_API_URL,
  DEFAULT_LAB_API_URL,
  DEFAULT_LAB_UI_URL,
} from "../nowsecure-client";

const { writeFile } = promises;

/** Promisified setTimeout */
export function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve, _reject) => {
    setTimeout(resolve, milliseconds);
  });
}

export class PlatformConfig {
  constructor(
    /** API token */
    public token: string,
    /** GraphQL server */
    public apiUrl: string = DEFAULT_API_URL,
    /** REST API (uploads) */
    public labApiUrl: string = DEFAULT_LAB_API_URL,
    /** UI address */
    public labUrl: string = DEFAULT_LAB_UI_URL,
    /** UI type */
    public rainier: boolean = true
  ) {}

  assessmentLink(assessment: Assessment, finding?: Finding) {
    return assessmentLink(this.labUrl, this.rainier, assessment, finding);
  }
}

export const assessmentLink = (
  labUrl: string,
  rainier: boolean,
  assessment: Assessment,
  finding?: Finding
) => {
  const rainierUrl = () => {
    const assessmentUrl = `${labUrl}/app/${assessment.applicationRef}/assessment/${assessment.ref}`;
    return finding?.checkId
      ? `${assessmentUrl}/findings#finding-${finding.checkId}`
      : assessmentUrl;
  };

  const classicUrl = () => {
    const assessmentUrl = `${labUrl}/app/${assessment.applicationRef}/assessment/${assessment.taskId}`;
    return finding?.checkId
      ? `${assessmentUrl}#finding-${finding.checkId}`
      : assessmentUrl;
  };

  return rainier ? rainierUrl() : classicUrl();
};

export function platformConfig(): PlatformConfig {
  const labUrl = core.getInput("lab_url");
  const uiType = core.getInput("lab_type").toLowerCase();
  let rainier = true;
  if (uiType) {
    if (["classic", "rainier"].includes(uiType)) {
      rainier = uiType === "rainier";
    } else {
      throw new ValueError('lab_type must be either "rainier" or "classic"');
    }
  }
  return new PlatformConfig(
    core.getInput("platform_token"),
    core.getInput("api_url"),
    core.getInput("lab_api_url"),
    labUrl,
    rainier
  );
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
  platform: PlatformConfig
) {
  console.log("Converting NowSecure report to SARIF...");
  const sarif = await convertToSarif(
    report,
    keyParams,
    filter,
    platform.labUrl,
    platform.rainier
  );
  await writeFile("NowSecure.sarif", JSON.stringify(sarif));
}
