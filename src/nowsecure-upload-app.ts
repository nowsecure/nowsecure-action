/*
 * Copyright © 2021-2022 NowSecure Inc.
 *
 * SPDX-License-Identifier: MIT
 */

import * as core from "@actions/core";
import fs from "fs";
import { NowSecure } from "./nowsecure-client";
import { platformConfig } from "./utils";

async function run() {
  try {
    const platform = platformConfig();
    const ns = new NowSecure(platform);
    const groupId = core.getInput("group_id");
    const appFile = core.getInput("app_file");
    const versionString = core.getInput("version_string");
    const licenseWorkaround = core.getBooleanInput("license_workaround");

    const licenseValid = await ns.isLicenseValid(licenseWorkaround);
    if (!licenseValid) {
      throw new Error("Assessment limit reached");
    }

    const details = await ns.submitBin(
      fs.createReadStream(appFile),
      groupId,
      versionString
    );
    const reportId = details.ref;
    console.log(`NowSecure assessment started. Report ID: ${reportId}`);
    core.setOutput("report_id", reportId);
  } catch (e) {
    console.error(e);
    core.setFailed((e as Error).message);
  }
}

run();
