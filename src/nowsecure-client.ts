/*
 * Copyright © 2021-2022 NowSecure Inc.
 *
 * SPDX-License-Identifier: MIT
 */

import * as http from "@actions/http-client";
import type {
  UploadApplicationResponse,
  PullReportResponse,
} from "./types/platform";
import { version } from "./nowsecure-version";

export const USER_AGENT = `NowSecure GitHub Action/${version}`;
export const DEFAULT_API_URL = "https://api.nowsecure.com";
export const DEFAULT_LAB_API_URL = "https://lab-api.nowsecure.com";

/**
 * GraphQL request to check if baseline limit has been reached.
 *
 * NOTE: Must be wrapped in a `query` tag for bare requests!
 */
const LICENSE_GQL = `my {
  user {
    organization {
      usage {
        assessment {
          limit
          reached
          total
        }
      }
    }
  }
}`;

/**
 * GraphQL request for Platform.
 *
 * NOTE: Must be kept in sync with `PullReportResponse`.
 */
const platformGql = (reportId: string): string => `{
  ${LICENSE_GQL}
  auto {
    assessments(scope:"*" refs:["${reportId.replace(/[^0-9a-z-]/gi, "")}"]) {
      deputy: _raw(path: "yaap.complete.results[0].deputy.deputy.data[0].results")
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

  constructor(
    platformToken: string,
    apiUrl: string = DEFAULT_API_URL,
    labApiUrl: string = DEFAULT_LAB_API_URL
  ) {
    this.#apiUrl = apiUrl;
    this.#labApiUrl = labApiUrl;
    this.#client = new http.HttpClient(USER_AGENT, undefined, {
      allowRetries: true,
      maxRetries: 3,
      headers: {
        Authorization: `Bearer ${platformToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Pulls a report from NowSecure. Throws an exception if an error occurs.
   */
  async pullReport(reportId: string): Promise<PullReportResponse> {
    const r = await this.#client.getJson<PullReportResponse>(
      `${this.#apiUrl}/graphql?query=${platformGql(reportId)}`
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

  /**
   * Checks if the assessment limit has been reached. Throws an exception if
   * an error occurs.
   */
  async isLicenseValid(licenseWorkaround: boolean): Promise<boolean> {
    const r = await this.#client.getJson<PullReportResponse>(
      `${this.#apiUrl}/graphql?query={${LICENSE_GQL}}`
    );

    if (r.statusCode !== 200) {
      throw new Error(`Report request failed with status ${r.statusCode}`);
    }

    const { total, limit, reached } =
      r.result.data.my.user.organization.usage.assessment;

    let limitReached = reached;
    if (licenseWorkaround) {
      // FIXME: Workaround platform license counting issue.
      limitReached = limit !== -1 && total + 1 >= limit;
    }

    return !limitReached;
  }
}
