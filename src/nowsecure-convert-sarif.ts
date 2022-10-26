/*
 * Copyright © 2021-2022 NowSecure Inc.
 *
 * SPDX-License-Identifier: MIT
 */

import * as core from "@actions/core";
import { NowSecure } from "./nowsecure-client";
import { promisify } from "util";
import * as github from "@actions/github";
import { outputToDependencies, outputToSarif } from "./utils/action-utils";

const sleep = promisify(setTimeout);

async function run() {
  const reportId = core.getInput("report_id");
  console.log(`Processing report with ID: ${reportId}`);
  try {
    const apiUrl = core.getInput("api_url");
    const labApiUrl = core.getInput("lab_api_url");
    const labUrl = core.getInput("lab_url");
    const platformToken = core.getInput("token");

    let pollInterval = parseInt(core.getInput("poll_interval_ms"), 10);
    if (isNaN(pollInterval)) {
      pollInterval = 60000;
    }

    const enableSarif = core.getBooleanInput("enable_sarif");
    const enableDependencies = core.getBooleanInput("enable_dependencies");
    const githubToken = core.getInput("github_token");
    const githubCorrelator = core.getInput("github_correlator");
    const ns = new NowSecure(platformToken, apiUrl, labApiUrl);

    // Poll Platform to resolve the report ID to a report.
    // GitHub Actions will handle the timeout for us in the event something goes awry.
    let report = null;
    for (;;) {
      console.log("Checking for NowSecure report... ", reportId);
      report = await ns.pullReport(reportId);
      // NOTE: No optional chaining on Node.js 12 in GitHub Actions.
      try {
        if (report.data.auto.assessments[0].report) {
          break;
        } else {
          await sleep(pollInterval);
        }
      } catch (e) {
        console.error(e);
        // No report data.
      }
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
  } catch (e) {
    console.error(e);
    core.setFailed((e as Error).message);
  }
}

run();
