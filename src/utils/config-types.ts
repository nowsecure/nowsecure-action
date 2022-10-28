/*
 * Copyright © 2022 NowSecure Inc.
 *
 * SPDX-License-Identifier: MIT
 */

export type JobType =
  | "issues" // Create/Update issues from a NowSecure assessment
  | "sarif"; // Convert a NowSecure assessment to SARIF format & send to GHAS

export type JSONType =
  | string
  | number
  | boolean
  | null
  | { [index: string]: JSONType }
  | JSONType[];
export type JSONObject = { [index: string]: JSONType };
export type JSONArray = JSONType[];

export interface Filter {
  includeChecks?: string[];
  excludeChecks?: string[];
  severityFilter?: string[];
  includeWarnings?: boolean;
}

export interface KeyParams {
  includePackage: boolean;
  includePlatform: boolean;
  v1platform: "ios" | "android";
  v1package: string;
}

export interface LabelLists {
  always?: string[];
  info?: string[];
  warning?: string[];
  low?: string[];
  medium?: string[];
  high?: string[];
  critical?: string[];
}

export interface Labels extends LabelLists {
  categoryLabels?: boolean;
}

export interface IssuesJobConfig {
  filter: Filter;
  key: KeyParams;
  labels: Labels;
  maxRows: number;
}

export interface SarifJobConfig {
  filter: Filter;
  key: KeyParams;
}

export type JobConfig = IssuesJobConfig | SarifJobConfig;

export const severity: string[] = ["info", "medium", "low", "high", "critical"];
