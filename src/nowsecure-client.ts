/*
 * Copyright © 2021-2022 NowSecure Inc.
 *
 * SPDX-License-Identifier: MIT
 */

import * as http from "@actions/http-client";
import type {
  UploadApplicationResponse,
  PullReportResponse,
} from "./nowsecure-types";
import { version } from "./nowsecure-version";

/**
 * GraphQL request for Platform.
 *
 * NOTE: Must be kept in sync with `PullReportResponse`.
 */
const platformGql = (reportId: string): string => `query {
  auto {
    assessments(scope:"*" refs:["${reportId.replace(/[^0-9a-z-]/gi, "")}"]) {
      packageKey
      taskId
      applicationRef
      ref
      report {
        findings {
          kind
          key
          title
          summary
          affected
          severity
          context {
            fields
            rows
          }
          check {
            issue {
              title
              description
              impactSummary
              stepsToReproduce
              recommendation
              category
              cvss
              codeSamples {
                syntax
                caption
                block
              }
              guidanceLinks {
                caption
                url
              }
            }
          }
        }
      }
    }
  }
}`;

export class NowSecure {
  #client: http.HttpClient;
  #apiUrl: string;
  #labApiUrl: string;

  constructor(apiUrl: string, labApiUrl: string, platformToken: string) {
    this.#apiUrl = apiUrl;
    this.#labApiUrl = labApiUrl;
    this.#client = new http.HttpClient(
      `NowSecure GitHub Action/${version}`,
      undefined,
      {
        allowRetries: true,
        maxRetries: 3,
        headers: {
          Authorization: `Bearer ${platformToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    );
  }

  /**
   * Pulls a report from NowSecure. Throws an exception if an error occurs.
   */
  async pullReport(reportId: string): Promise<PullReportResponse> {
    const r = await this.#client.postJson<PullReportResponse>(
      `${this.#apiUrl}/graphql`,
      {
        operationName: null,
        variables: {},
        query: platformGql(reportId),
      }
    );

    if (r.statusCode !== 200) {
      throw new Error(`Report request failed with status ${r.statusCode}`);
    }

    return r.result;
  }

  /**
   * Upload an application binary stream to NowSecure Platform and return job
   * details. Throws an exception if an error occurs.
   */
  async submitBin(
    stream: NodeJS.ReadableStream,
    groupId: string
  ): Promise<UploadApplicationResponse> {
    const r = await this.#client.sendStream(
      "POST",
      `${this.#labApiUrl}/build/?group=${groupId}`,
      stream,
      {}
    );

    if (r.message.statusCode !== 200) {
      throw new Error(
        `Application upload failed with status ${r.message.statusCode}`
      );
    }

    const body = await r.readBody();
    return JSON.parse(body);
  }
}
