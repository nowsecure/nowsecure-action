/*
 * Copyright © 2021-2022 NowSecure Inc.
 *
 * SPDX-License-Identifier: MIT
 */

import type { Deputy } from "./deputy";

export type ApplicationState = "pending" | "processing" | "completed";

/**
 * Response from Upload Application.
 *
 * # References
 * * <https://docs.nowsecure.com/auto/api/spec/#api-Applications-submitBuild>
 */
export interface UploadApplicationResponse {
  ref: string;
  application: string;
  group: string;
  account: string;
  platform: string;
  package: string;
  task: number;
  creator: string;
  created: string;
  binary: string;
  config: unknown;
  status: {
    static: {
      state: ApplicationState;
    };
    dynamic: {
      state: ApplicationState;
    };
  };
  cancelled: boolean;
  task_status: ApplicationState;
  events: unknown;
}

/**
 * Response from a report pull GraphQL.
 *
 * NOTE: This matches the fields in the GraphQL query defined in `nowsecure-client.ts`
 * and must be kept in sync.
 */
export interface PullReportResponse {
  data: {
    auto: {
      assessments: Assessment[];
    };
    my: {
      user: {
        organization: {
          usage: {
            assessment: {
              limit: number;
              total: number;
              reached: boolean;
            };
            baseline: {
              reached: boolean;
            };
          };
        };
      };
    };
  };
}

export interface Assessment {
  packageKey: string;
  taskId: string;
  applicationRef: string;
  ref: string;
  report: Report | null;
  deputy: Deputy | null;
}

export interface Report {
  findings: Finding[];
}

type FindingType = "static" | "dynamic";
type Severity = "info" | "medium" | "low" | "high" | "critical";

export interface Finding {
  kind: FindingType;
  key: string;
  title: string;
  summary: string | null;
  affected: boolean;
  severity: Severity;
  context: {
    fields: {
      [key: string]: { title: string };
    };
    rows: {
      [key: string]: unknown;
    }[];
  };
  check: {
    issue: {
      title: string;
      description: string | null;
      impactSummary: string | null;
      stepsToReproduce: string | null;
      recommendation: string | null;
      category: string | null;
      cvss: number | null;
      codeSamples: CodeSample[] | null;
      guidanceLinks: GuidanceLink[] | null;
    } | null;
  };
}

export interface CodeSample {
  syntax: string;
  caption: string;
  block: string;
}

export interface GuidanceLink {
  caption: string;
  url: string;
}
