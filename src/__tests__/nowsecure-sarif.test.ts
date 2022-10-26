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
import { HttpClientError } from "@actions/http-client";

const platformToken = "AAABBB";
const assessmentId = "CCCDDD";

// Silence warnings from configuration manager.
const consoleWarnMock = jest.spyOn(console, "warn").mockImplementation();

describe("SARIF conversion", () => {
  const ns = new NowSecure(platformToken);

  test("can perform conversion", async () => {
    const scope = nock(DEFAULT_API_URL)
      .get("/graphql")
      .query(true)
      .replyWithFile(
        200,
        path.join(__dirname, "resources", "response_200.json")
      );

    const report = await ns.pullReport(assessmentId);
    const sarif = await convertToSarif(report);
    expect(sarif).toMatchSnapshot();
  });

  test.each([1, 2, 3])(
    "performs retries for 502 errors (%d times)",
    async (times) => {
      const scope1 = nock(DEFAULT_API_URL)
        .get("/graphql")
        .query(true)
        .times(times)
        .reply(502);

      const scope2 = nock(DEFAULT_API_URL)
        .get("/graphql")
        .query(true)
        .replyWithFile(
          200,
          path.join(__dirname, "resources", "response_200.json")
        );

      const report = await ns.pullReport(assessmentId);
      const sarif = await convertToSarif(report);
      expect(sarif).toMatchSnapshot();
      expect(scope1.isDone());
      expect(scope2.isDone());
    }
  );

  test("request fails after 4 consequtive 502 errors", async () => {
    const scope1 = nock(DEFAULT_API_URL)
      .get("/graphql")
      .query(true)
      .times(4)
      .reply(502);

    expect(ns.pullReport(assessmentId)).rejects.toThrow(HttpClientError);
  });
});
