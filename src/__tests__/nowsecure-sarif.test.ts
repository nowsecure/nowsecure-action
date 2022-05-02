/*
 * Copyright © 2022 NowSecure Inc.
 *
 * SPDX-License-Identifier: MIT
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import { convertToSarif } from "../nowsecure-sarif";
import { NowSecure, DEFAULT_API_URL } from "../nowsecure-client";
import nock from "nock";
import path from "path";

const platformToken = "AAABBB";
const assessmentId = "CCCDDD";

// Silence warnings from configuration manager.
const consoleWarnMock = jest.spyOn(console, "warn").mockImplementation();

describe("SARIF conversion", () => {
  const ns = new NowSecure(platformToken);

  test("can perform conversion", async () => {
    const scope = nock(DEFAULT_API_URL)
      .post("/graphql")
      .replyWithFile(
        200,
        path.join(__dirname, "resources", "response_200.json")
      );

    const report = await ns.pullReport(assessmentId);
    const sarif = await convertToSarif(report);
    expect(sarif).toMatchSnapshot();
  });
});
