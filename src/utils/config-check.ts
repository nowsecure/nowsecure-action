/*
 * Copyright © 2022 NowSecure Inc.
 *
 * SPDX-License-Identifier: MIT
 *
 * Parsing and validation of the .nsconfig.yml file
 */

import fs from "fs";
import path from "path";
import YAML from "yaml";
import { isArray, cloneDeep } from "lodash";
import {
  Filter,
  JobType,
  JobConfig,
  JSONType,
  JSONObject,
  IssuesJobConfig,
  SarifJobConfig,
  KeyParams,
  Labels,
  LabelLists,
  SummaryLevel,
  summaryLevels,
} from "./config-types";
import { ValueError, KeyError } from "./errors";
import {
  parseFilter,
  DEFAULT_ISSUES_FILTER,
  DEFAULT_SARIF_FILTER,
  isStringArray,
  DEFAULT_FILTER,
} from "./filter";
import { DEFAULT_KEY_PARAMS, parseKeyConfig } from "./key";

/** Keys for filter objects */
const FILTER_KEYS: string[] = [
  "exclude-checks",
  "include-checks",
  "minimum-severity",
  "include-warnings",
];

const KEY_KEYS: string[] = ["package", "platform", "v1-key"];

const ISSUE_CONFIG_KEYS: string[] = ["filter", "key", "labels", "summary"];

const SARIF_CONFIG_KEYS: string[] = ["filter", "key", "summary"];

const LABEL_LIST_KEYS: (keyof LabelLists)[] = [
  "always",
  "info",
  "warning",
  "low",
  "medium",
  "high",
  "critical",
];

const LABEL_KEYS: string[] = [...LABEL_LIST_KEYS, "category-labels"];

interface PartiallyParsedConfig {
  filter: Filter;
  key: KeyParams;
  summary: SummaryLevel;

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  [index: string]: any;
}

const ALL_CONFIG_KEYS: string[] = Array.from(
  new Set(ISSUE_CONFIG_KEYS.concat(SARIF_CONFIG_KEYS))
);

/** Keys valid at the outer level */
const OUTER_KEYS = FILTER_KEYS.concat([
  "filters",
  "configs",
  "key",
  "summary",
  "labels",
]);

export const DEFAULT_MAX_ROWS = 20;

export const DEFAULT_LABELS: Labels = {
  always: ["NowSecure"],
  critical: [],
  high: [],
  medium: [],
  low: [],
  warning: [],
  info: [],
  categoryLabels: false,
};

/**
 * Loads the data from the .nsconfig.yml file
 *
 * @param configPath Path to the config file. May be a directory, in which ${configPath}/.nsconfig.yml is loaded
 * @returns parsed YAML
 */
function loadRawConfig(configPath: string) {
  // if no config path specified it's ok for the file not to exist
  if (!configPath) {
    configPath = ".nsconfig.yml";
    if (!fs.existsSync(configPath)) {
      // only warn in real world, avoids spamming the test logs
      if (process.env.NODE_ENV !== "test") {
        console.warn(`No .nsconfig.yml found, ignoring`);
      }
      return {};
    }
  }

  // Fail if the path is not found
  const stat = fs.statSync(configPath);
  if (stat.isDirectory()) {
    configPath = path.join(configPath, ".nsconfig.yml");
  }

  return YAML.parse(fs.readFileSync(configPath, "utf8"));
}

/**
 * Checks that what's passed in is an object with only the permitted keys present.
 *
 * Returning true allows the function to be used as a type guard (at the cost of
 * an unneccessary `if` statement).
 *
 * @param test Value to check
 * @param allowedKeys Permitted keys
 * @param what Name of what we're checking, used when logging errors.
 * @returns true, always. If the test parameter does not pass the check an exception is thrown
 */
function checkObject(
  test: JSONType,
  allowedKeys: string[],
  what: string
): test is JSONObject {
  if (typeof test !== "object" || isArray(test)) {
    throw new TypeError(`${what} must be an object`);
  }

  for (const k in test) {
    if (allowedKeys.indexOf(k) < 0) {
      throw new KeyError(`${k} is not permitted in ${what}`);
    }
  }

  return true;
}

/**
 * Handler class for the .nsconfig.yml file
 */
export class NsConfig {
  /**
   * loads and parses the config file. Will raise an exception if it's not valid
   *
   * @param configPath relative path (directory or full file name)
   */
  constructor(configPath: string, checkIds: string[] = null) {
    const rawConfig = loadRawConfig(configPath);
    if (!rawConfig) {
      return;
    }

    checkObject(rawConfig, OUTER_KEYS, "config");
    this.keyParams = this.parseKeys(rawConfig) || { ...DEFAULT_KEY_PARAMS };
    this.summary = this.parseSummary(rawConfig);
    this.parseFilters(rawConfig, checkIds);
    this.parseConfigs(rawConfig);
    this.labels = this.parseLabels(rawConfig.labels, DEFAULT_LABELS);
  }

  private parseFilters(rawConfig: JSONObject, checkIds: string[] = null) {
    this.outerFilter = parseFilter(rawConfig, checkIds);

    if ("filters" in rawConfig) {
      const filters = rawConfig.filters;
      if (typeof filters !== "object" || isArray(filters)) {
        throw new TypeError(`filters must be an object`);
      }
      for (const filterName in filters) {
        const filterConfig = filters[filterName];
        if (checkObject(filterConfig, FILTER_KEYS, "Filter")) {
          this.filters[filterName] = parseFilter(filterConfig, checkIds);
        }
      }
    }
  }

  private parseConfigs(rawConfig: JSONObject) {
    if ("configs" in rawConfig) {
      const configs = rawConfig.configs;
      if (typeof configs !== "object" || isArray(configs)) {
        throw new TypeError(`configs must be an object`);
      }
      for (const configName in configs) {
        const cfg = configs[configName];
        if (checkObject(cfg, ALL_CONFIG_KEYS, "Config")) {
          this.configs[configName] = this.parseConfig(cfg);
        }
      }
    }
  }

  /**
   * Parses and validates the config as far as is possible without knowing
   * the type of the config.
   *
   * @param config raw config data
   * @returns Partially parsed object. The filter is populated with the relevant
   * unmerged filter which can then be merged with the relevant default when getConfig
   * is called.
   */
  private parseConfig(config: JSONObject): PartiallyParsedConfig {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const cfg: any = { ...config };

    if ("filter" in cfg) {
      if (typeof cfg.filter === "string") {
        cfg.filter = this.getRawFilter(cfg.filter);
      } else {
        if (checkObject(cfg.filter, FILTER_KEYS, "Filter")) {
          cfg.filter = parseFilter(cfg.filter);
        }
      }
    } else {
      cfg.filter = this.outerFilter;
    }

    cfg.key = this.parseKeys(cfg);
    cfg.summary = this.parseSummary(config, this.summary);
    return cfg;
  }

  private parseSummary(
    cfg: JSONObject,
    defaultValue: SummaryLevel = "short"
  ): SummaryLevel {
    if ("summary" in cfg) {
      const summary = cfg.summary;
      if (typeof summary !== "string" || summaryLevels.indexOf(summary) < 0) {
        throw new TypeError('summary must be one of "none", "short" or "long"');
      }
      return summary as SummaryLevel;
    }

    return defaultValue;
  }

  private parseKeys(cfg: JSONObject): KeyParams {
    if ("key" in cfg) {
      if (checkObject(cfg.key, KEY_KEYS, "key settings")) {
        return parseKeyConfig(cfg.key);
      }
    }
    return null;
  }

  /**
   * Returns the named filter or the outer filter if filterName is falsy
   * @param filterName Name of filter to retrieve
   * @returns
   */
  private getRawFilter(filterName: string): Filter {
    if (!filterName) {
      return this.outerFilter;
    }
    if (!(filterName in this.filters)) {
      throw new ValueError(`Filter ${filterName} is not defined`);
    }
    return this.filters[filterName];
  }

  /** Return the full filter from the default any specified fields */
  private mergeFilters(defaultFilter: Filter, update: Filter) {
    return {
      ...cloneDeep(defaultFilter),
      ...cloneDeep(update),
    };
  }

  getConfig(configName: string, configType: "issues"): IssuesJobConfig;
  getConfig(configName: string, configType: "sarif"): SarifJobConfig;
  getConfig(configName: string, configType: JobType): JobConfig {
    let raw = undefined;
    if (configName) {
      if (!(configName in this.configs)) {
        throw new ValueError(`Config ${configName} is not defined`);
      }
      raw = this.configs[configName];
    }

    switch (configType) {
      case "issues":
        return this.parseIssuesConfig(raw);
        break;

      case "sarif":
        return this.parseSarifConfig(raw);
        break;
    }
  }

  private parseIssuesConfig(
    rawConfig?: PartiallyParsedConfig
  ): IssuesJobConfig {
    rawConfig = rawConfig || {
      filter: this.outerFilter,
      summary: this.summary,
      key: null,
    };
    checkObject(rawConfig, ISSUE_CONFIG_KEYS, "Issues job configuration");
    const config: IssuesJobConfig = {
      filter: this.mergeFilters(DEFAULT_ISSUES_FILTER, rawConfig.filter),
      key: rawConfig.key || { ...this.keyParams },
      labels: this.parseLabels(rawConfig.labels, this.labels),
      maxRows: this.parseMaxRows(rawConfig.maxRows),
      summary: rawConfig.summary,
    };
    return config;
  }

  private parseSarifConfig(rawConfig?: PartiallyParsedConfig): SarifJobConfig {
    rawConfig = rawConfig || {
      filter: this.outerFilter,
      summary: this.summary,
      key: null,
    };
    checkObject(rawConfig, SARIF_CONFIG_KEYS, "Sarif job configuration");
    const config: SarifJobConfig = {
      filter: this.mergeFilters(DEFAULT_SARIF_FILTER, rawConfig.filter),
      key: rawConfig.key || { ...this.keyParams },
      summary: rawConfig.summary,
    };
    return config;
  }

  private parseLabels(labels: JSONObject, defaultValue: Labels): Labels {
    const checkList = (test: JSONType, listName: string): string[] => {
      if (test === undefined) {
        return [];
      } else if (typeof test === "string") {
        return [test];
      }
      if (!isStringArray(test)) {
        throw new TypeError(
          `${listName} must be a string or a list of strings`
        );
      }
      return test;
    };

    if (labels === undefined) {
      return cloneDeep(defaultValue);
    }

    if (typeof labels === "string") {
      return { ...cloneDeep(DEFAULT_LABELS), always: [labels] };
    }

    if (isArray(labels)) {
      if (!isStringArray(labels)) {
        throw new TypeError(
          `labels must be a string, a list of strings or a Labels object`
        );
      }
      return { ...cloneDeep(DEFAULT_LABELS), always: labels };
    }

    checkObject(labels, LABEL_KEYS, "labels");
    const ret: Labels = cloneDeep(DEFAULT_LABELS);
    for (const key of LABEL_LIST_KEYS) {
      if (key in labels) {
        ret[key] = checkList(labels[key], key);
      }
    }
    if ("category-labels" in labels) {
      const categoryLabels = labels["category-labels"];
      if (typeof categoryLabels !== "boolean") {
        throw new TypeError("category-labels must be a boolean");
      }
      ret.categoryLabels = categoryLabels;
    }
    return ret;
  }

  private parseMaxRows(rows: JSONType) {
    if (rows === undefined) {
      return DEFAULT_MAX_ROWS;
    }
    if (typeof rows !== "number") {
      throw new TypeError("max-rows must be a number");
    }
    if (rows < 0) {
      throw new ValueError("max-rows must be >= 0");
    }
    if (Math.floor(rows) != rows) {
      throw new ValueError("max-rows must be an integer");
    }
    return rows;
  }

  /** Partially checked configs. Full validation is done on read since we don't know the type before we access it */
  private configs: { [index: string]: PartiallyParsedConfig } = {};

  /** named filters */
  private filters: { [index: string]: Filter } = {};

  /** filter constructed from the outermost fields (backward compatibility) */
  private outerFilter: Filter = cloneDeep(DEFAULT_FILTER);

  private keyParams: KeyParams = cloneDeep(DEFAULT_KEY_PARAMS);

  private summary: SummaryLevel = "short";

  private labels: Labels = cloneDeep(DEFAULT_LABELS);
}
