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
  try {
    const config = new NsConfig(core.getInput("config_path"));
    const jobConfig = config.getConfig(core.getInput("config"), "sarif");

    const platform = platformConfig();

    let pollInterval = parseInt(core.getInput("poll_interval_ms"), 10);
    if (isNaN(pollInterval)) {
      pollInterval = 60000;
    }

    const minimumScore = parseInt(core.getInput("minimum_score"), 10);
    const enableSarif = core.getBooleanInput("enable_sarif");
    const enableDependencies = core.getBooleanInput("enable_dependencies");
    const githubToken = core.getInput("github_token");
    const githubCorrelator = core.getInput("github_correlator");
    const ns = new NowSecure(platform);

    const report = await ns.pollForReport(reportId, pollInterval);
    const score = report.data.auto.assessments[0]?.score;
    const assessment = report.data.auto.assessments[0];
    const status = assessment?.analysis?.status;

    if (status === "failed") {
      const error = assessment?.assessmentError;
      const title = error?.title || error?.code || "Unknown Error";
      const description = error?.description || "An unknown error occurred.";
      throw new Error(`${title}: ${description}`);
    }

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

    if (minimumScore > 0) {
      if (score < minimumScore) {
        throw new Error(
          `Score: ${score} is less than minimum_score: ${minimumScore}`
        );
      }
    }
  } catch (e) {
    console.error(e);
    core.setFailed((e as Error).message);
  }
}

run();
