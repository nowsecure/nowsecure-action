/*
 * Copyright © 2021-2022 NowSecure Inc.
 *
 * SPDX-License-Identifier: MIT
 */

import * as core from "@actions/core";
import { NowSecure } from "./nowsecure-client";
import * as github from "@actions/github";
import {
  outputToDependencies,
  outputToSarif,
  platformConfig,
} from "./utils/action-utils";
import { NsConfig } from "./utils";
import { githubJobSummary, githubWriteJobSummary } from "./nowsecure-summary";

async function run() {
  const reportId = core.getInput("report_id");
  console.log(`Processing report with ID: ${reportId}`);
  try {
    const config = new NsConfig(core.getInput("config_path"));
    const jobConfig = config.getConfig(core.getInput("config"), "sarif");

    const platform = platformConfig();

    let pollInterval = parseInt(core.getInput("poll_interval_ms"), 10);
    if (isNaN(pollInterval)) {
      pollInterval = 60000;
    }

    const enableSarif = core.getBooleanInput("enable_sarif");
    const enableDependencies = core.getBooleanInput("enable_dependencies");
    const githubToken = core.getInput("github_token");
    const githubCorrelator = core.getInput("github_correlator");
    const ns = new NowSecure(platform);

    const report = await ns.pollForReport(reportId, pollInterval);

    if (enableDependencies) {
      await outputToDependencies(report, github.context, githubCorrelator);
    }

    if (enableSarif) {
      await outputToSarif(report, jobConfig.key, jobConfig.filter, platform);
    }

    if (jobConfig.summary !== "none") {
      githubJobSummary(
        jobConfig.summary,
        platform,
        report.data.auto.assessments[0],
        null
      );
      await githubWriteJobSummary();
    }
  } catch (e) {
    console.error(e);
    core.setFailed((e as Error).message);
  }
}

run();
