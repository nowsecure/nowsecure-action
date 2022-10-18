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

    expect(emptyConfig.filter.excludeChecks).toEqual(["check_1"]);
    expect(inlineConfig.filter.excludeChecks).toEqual(["check_5"]);
    expect(refConfig.filter.excludeChecks).toEqual(["check_3"]);

    expect(() => config.getConfig("not-present", "issues")).toThrow(ValueError);
  });
});
