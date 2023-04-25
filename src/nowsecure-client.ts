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
import { PlatformConfig, sleep } from "./utils";

export const USER_AGENT = `NowSecure GitHub Action/${version}`;
export const DEFAULT_API_URL = "https://api.nowsecure.com";
export const DEFAULT_LAB_API_URL = "https://lab-api.nowsecure.com";
export const DEFAULT_LAB_UI_URL = "https://app.nowsecure.com";

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
      platformType
      packageKey
      taskId
      applicationRef
      ref
      report {
        findings {
          kind
          key
          checkId
          title
          summary
          category
          affected
          severity
          impactType
          uniqueVulnerabilityId
          cvss
          context {
            fields
            rows
          }
          check {
            context {
              view
              title
              fields {
                key
                title
                format
              }
            }
            issue {
              title
              warn
              description
              impactSummary
              stepsToReproduce
              recommendation
              category
              cvss
              cve
              codeSamples {
                platform
                syntax
                caption
                block
              }
              guidanceLinks {
                platform
                caption
                url
              }
              regulations {
                label
                links {
                  title
                  url
                }
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

  constructor(platform: PlatformConfig);
  constructor(platformToken: string, apiUrl?: string, labApiUrl?: string);
  constructor(
    platformOrToken: string | PlatformConfig,
    apiUrl: string = DEFAULT_API_URL,
    labApiUrl: string = DEFAULT_LAB_API_URL
  ) {
    let platformToken: string;
    if (typeof platformOrToken == "object") {
      platformToken = platformOrToken.token;
      apiUrl = platformOrToken.apiUrl;
      labApiUrl = platformOrToken.labApiUrl;
    }

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
   * Poll Platform to resolve the report ID to a report.
   * GitHub Actions will handle the timeout for us in the event something goes awry.
   */
  async pollForReport(
    reportId: string,
    pollInterval: number
  ): Promise<PullReportResponse | null> {
    let report = null;
    for (;;) {
      console.log("Checking for NowSecure report... ", reportId);
      report = await this.pullReport(reportId);
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
    return report;
  }

  /**
   * Upload an application binary stream to NowSecure Platform and return job
   * details. Throws an exception if an error occurs.
   */
  async submitBin(
    stream: NodeJS.ReadableStream,
    groupId: string,
    version?: string,
    analysisType?: string
  ): Promise<UploadApplicationResponse> {
    const params: string[] = ["group=" + encodeURIComponent(groupId)];

    if (version) {
      params.push("version=" + encodeURIComponent(version));
    }

    if (analysisType) {
      switch (analysisType) {
        case "full":
          break;
        case "static":
          params.push("analysisType=static");
          break;
        case "dependencies":
          params.push("analysisType=sbom");
          break;
        default:
          throw new Error(`Unknown analysis type "${analysisType}"`);
      }
    }

    const url = `${this.#labApiUrl}/build/?${params.join("&")}`;
    const r = await this.#client.sendStream("POST", url, stream, {});

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

    if (r.result.errors) {
      const error = r.result.errors[0];
      throw new Error(`Report request failed with error: ${error}`);
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
