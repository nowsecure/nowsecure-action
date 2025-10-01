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
  errors?: {
    message: string;
  }[];
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
  applicationRef: string;
  deputy: Deputy | null;
  packageKey: string;
  platformType: string;
  ref: string;
  report: Report | null;
  score: number | null;
  taskId: string;
}

export interface Report {
  findings: Finding[];
}

export type FindingType = "static" | "dynamic";
export type Severity = "info" | "medium" | "low" | "high" | "critical";
export type ImpactType =
  | "artifact"
  | "indeterminate"
  | "pass"
  | "info"
  | "warn"
  | "medium"
  | "low"
  | "high"
  | "critical";

export interface ContextRow {
  [key: string]: unknown;
}
export interface Finding {
  kind: FindingType;
  key: string;
  checkId: string;
  title: string;
  summary: string | null;
  category: string;
  affected: boolean;
  severity: Severity;
  impactType: ImpactType;
  uniqueVulnerabilityId: string;
  cvss: number | null;
  cvssVector: string;
  context: {
    fields: {
      [key: string]: { title: string };
    };
    rows: ContextRow[];
  };
  check: {
    context: ContextInfo;
    issue: {
      warn: boolean;
      title: string;
      description: string | null;
      impactSummary: string | null;
      stepsToReproduce: string | null;
      recommendation: string | null;
      regulations: Regulation[] | null;
      category: string | null;
      cvss: number | null;
      cvssVector: string;
      cve: string | null;
      codeSamples: CodeSample[] | null;
      guidanceLinks: GuidanceLink[] | null;
    } | null;
  };
}

export interface CodeSample {
  syntax: string;
  caption: string;
  block: string;
  platform: string;
}

export interface GuidanceLink {
  caption: string;
  url: string;
  platform: string;
}

export interface RegulationLink {
  title: string;
  url: string | null;
}
export interface Regulation {
  label: string;
  links: RegulationLink[];
}

export interface ContextFieldInfo {
  key: string;
  title: string;
  format: string;
}

export interface ContextInfo {
  view: string;
  title: string;
  fields: ContextFieldInfo[];
}
