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

const { writeFile } = promises;
const sleep = promisify(setTimeout);

async function run() {
  try {
    const apiUrl = core.getInput("api_url");
    const labApiUrl = core.getInput("lab_api_url");
    const labUrl = core.getInput("lab_url");
    const platformToken = core.getInput("token");
    const ns = new NowSecure(apiUrl, labApiUrl, platformToken);

    let reportId = core.getInput("report_id");
    if (reportId) {
      const report = await ns.pullReport(reportId);
      const log = await convertToSarif(report, labUrl);
      await writeFile("NowSecure.sarif", JSON.stringify(log));
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

    console.log("Found NowSecure report, converting to SARIF...");

    const log = await convertToSarif(report, labUrl);
    await writeFile("NowSecure.sarif", JSON.stringify(log));

    console.log("Done.");
  } catch (e) {
    console.error(e);
    core.setFailed((e as Error).message);
  }
}

run();
