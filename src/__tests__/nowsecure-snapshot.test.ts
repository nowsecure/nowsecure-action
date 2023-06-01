/*
 * Copyright © 2022 NowSecure Inc.
 *
 * SPDX-License-Identifier: MIT
 */

import { promises } from "fs";
import { convertToSnapshot } from "../nowsecure-snapshot";
import type { Deputy } from "../types/deputy";
import { Context } from "@actions/github/lib/context";
import path from "path";

const { readFile } = promises;

jest.useFakeTimers().setSystemTime(new Date("2000-01-01"));

describe("Snapshot conversion", () => {
  const context = new Context();
  // Set in jest.config.js
  context.sha = process.env.GITHUB_SHA;
  context.ref = "exampleRef";
  context.job = "exampleJob";
  context.runId = 42;
  context.repo.owner = "exampleOwner";
  context.repo.repo = process.env.GITHUB_REPOSITORY;

  test("can perform conversion", async () => {
    const data = await readFile(
      path.join(__dirname, "resources", "deputy.json"),
      "utf8"
    );
    const parsed = JSON.parse(data);
    const snapshot = convertToSnapshot(parsed as Deputy, "", context);
    expect(snapshot).toMatchSnapshot({
      detector: {
        version: expect.any(String),
      },
      sha: expect.any(String),
    });
  });
});
