/*
 * Copyright © 2021-2022 NowSecure Inc.
 *
 * SPDX-License-Identifier: MIT
 */

import * as core from "@actions/core";
import fs, { promises } from "fs";
import { convertToSarif } from "./nowsecure-sarif";
import { NowSecure } from "./nowsecure-client";
import { promisify } from "util";
import {
  convertToSnapshot,
  submitSnapshotData,
  ActionContext,
} from "./nowsecure-snapshot";
import type { PullReportResponse } from "./types/platform";
import * as github from "@actions/github";

const { writeFile } = promises;
const sleep = promisify(setTimeout);

async function run() {
  try {
    const apiUrl = core.getInput("api_url");
    const labApiUrl = core.getInput("lab_api_url");
    const labUrl = core.getInput("lab_url");
    const platformToken = core.getInput("token");

    const enableSarif = core.getBooleanInput("enable_sarif");
    const enableDependencies = core.getBooleanInput("enable_dependencies");
    const githubToken = core.getInput("github_token");
    const githubCorrelator = core.getInput("github_correlator");
    const ns = new NowSecure(platformToken, apiUrl, labApiUrl);

    let reportId = core.getInput("report_id");
    if (reportId) {
      const report = await ns.pullReport(reportId);
      if (enableDependencies) {
        await outputToDependencies(
          report,
          github.context,
          githubCorrelator,
          githubToken
        );
      }

      if (enableSarif) {
        await outputToSarif(report, labUrl);
      }
      return;
    }

    const groupId = core.getInput("group_id");
    const appFile = core.getInput("app_file");
    const headstart = parseInt(core.getInput("headstart_ms"), 10);
    const pollInterval = parseInt(core.getInput("poll_interval_ms"), 10);

    const details = await ns.submitBin(fs.createReadStream(appFile), groupId);
    reportId = details.ref;

    if (reportId === undefined) {
      throw new Error(
        `NowSecure assessment submission failed: ${JSON.stringify(details)}`
      );
    }

    console.log(`NowSecure assessment started. Report ID: ${reportId}`);

    // Give Platform a head start.
    await sleep(headstart);

    // Poll Platform to resolve the report ID to a report.
    // GitHub Actions will handle the timeout for us in the event something goes awry.
    let report = null;
    for (;;) {
      console.log("Checking for NowSecure report...");
      report = await ns.pullReport(reportId);
      // NOTE: No optional chaining on Node.js 12 in GitHub Actions.
      try {
        if (report.data.auto.assessments[0].report) {
          break;
        }
      } catch {
        // No report data.
      }

      await sleep(pollInterval);
    }

    if (enableDependencies) {
      await outputToDependencies(
        report,
        github.context,
        githubCorrelator,
        githubToken
      );
    }

    if (enableSarif) {
      await outputToSarif(report, labUrl);
    }

    console.log("Done.");
  } catch (e) {
    console.error(e);
    core.setFailed((e as Error).message);
  }
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
  labUrl: string
) {
  console.log("Converting NowSecure report to SARIF...");
  const log = await convertToSarif(report, labUrl);
  await writeFile("NowSecure.sarif", JSON.stringify(log));
}

run();
