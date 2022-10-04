/*
 * Copyright © 2022 NowSecure Inc.
 *
 * SPDX-License-Identifier: MIT
 */

import fs from "fs";
import path from "path";
import { YAMLSyntaxError } from "yaml/util";

import { InvalidFilterError, KeyError, NsConfig, ValueError } from "../utils";

const CHECKS = [
  "check_1",
  "check_2",
  "check_3",
  "check_4",
  "check_5",
  "check_6",
];
describe("config file validation", () => {
  test("fails if the path doesn't exist", () => {
    expect(() => new NsConfig("not/a/path")).toThrowError();
  });

  test("fails if a directory without .nsconfig.yml is specified", () => {
    expect(() => new NsConfig(__dirname)).toThrowError();
  });

  test("default setting OK if file not present", () => {
    expect(new NsConfig("")).not.toBeNull();
  });

  test("fails if the yaml is invalid", () => {
    const invalidFile = path.join(
      __dirname,
      "resources",
      "config",
      "invalid-yaml.yml"
    );
    expect(() => new NsConfig(invalidFile)).toThrow(YAMLSyntaxError);
  });

  /**
   * Check that all the files in the specified directory throw the specific error
   * @param dirName
   * @param name
   * @param errorClass
   */
  const testDirectory = (
    dirName: string,
    name: string,
    errorClass: jest.Constructable
  ) => {
    const directory = path.join(__dirname, "resources", "config", dirName);
    fs.readdirSync(directory).forEach((fileName) => {
      const fullPath = path.resolve(directory, fileName);
      if (fs.statSync(fullPath).isFile()) {
        test(`${name}: ${fileName} throws ${errorClass.name}`, () => {
          expect(() => new NsConfig(fullPath, CHECKS)).toThrow(errorClass);
        });
      }
    });
  };

  testDirectory("keys", "Keys", KeyError);
  testDirectory("values", "Values", ValueError);
  testDirectory("types", "Types", TypeError);

  test("including and excluding a test fails", () => {
    const invalidFile = path.join(
      __dirname,
      "resources",
      "config",
      "include-and-exclude.yml"
    );
    expect(() => new NsConfig(invalidFile, CHECKS)).toThrow(InvalidFilterError);
  });

  test("parses a full config", () => {
    const validFile = path.join(
      __dirname,
      "resources",
      "config",
      "all-keys.yml"
    );
    const config = new NsConfig(validFile, CHECKS);
    const emptyConfig = config.getConfig("empty", "issues");
    const inlineConfig = config.getConfig("inline-filter", "issues");
    const refConfig = config.getConfig("reference-filter", "issues");
    const keyConfig1 = config.getConfig("key-params-1", "issues");
    const keyConfig2 = config.getConfig("key-params-2", "issues");

    expect(emptyConfig.filter.excludeChecks).toEqual(["check_1"]);
    expect(inlineConfig.filter.excludeChecks).toEqual(["check_5"]);
    expect(refConfig.filter.excludeChecks).toEqual(["check_3"]);

    expect(() => config.getConfig("not-present", "issues")).toThrow(ValueError);

    expect(keyConfig1.key.includePlatform).toBe(true);
    expect(keyConfig1.key.includePackage).toBe(false);
    expect(keyConfig1.key.v1platform).toEqual("ios");
    expect(keyConfig1.key.v1package).toEqual("com.example.app");

    expect(keyConfig2.key.includePlatform).toBe(false);
    expect(keyConfig2.key.includePackage).toBe(true);
    expect(keyConfig2.key.v1platform).toBeNull();
    expect(keyConfig2.key.v1package).toBeNull();
  });

  test("Parses labels config", () => {
    const labelsFile = path.join(
      __dirname,
      "resources",
      "config",
      "labels.yml"
    );
    const config = new NsConfig(labelsFile, CHECKS);

    const getLabels = (name: string) => config.getConfig(name, "issues").labels;

    expect(getLabels("empty")).toEqual({ always: ["NowSecure"] });
    expect(getLabels("valid_string")).toEqual({ always: ["one"] });
    expect(getLabels("valid_list")).toEqual({ always: ["one", "two"] });
    expect(getLabels("all_keys")).toEqual({
      always: ["always"],
      info: ["info"],
      warning: ["warning"],
      low: ["low"],
      medium: ["medium"],
      high: ["high"],
      critical: ["critical"],
    });

    const invalid = (name: string) => {
      return () => config.getConfig(name, "issues");
    };
    expect(invalid("invalid_type")).toThrow(TypeError);
    expect(invalid("invalid_list")).toThrow(TypeError);
    expect(invalid("invalid_keys")).toThrow(KeyError);
    expect(invalid("invalid_sev_list")).toThrow(TypeError);
  });
});
