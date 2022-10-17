import fs from "fs";
import path from "path";

import { cloneDeep } from "lodash";
import { Assessment } from "../types/platform";

import { KeyParams, findingKey } from "../utils";

const ASSESSMENT: Assessment = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "resources", "issues", "assessment.json"),
    "utf8"
  )
).data.auto.assessments[0];

describe("key derivation", () => {
  test("handles key parameters", () => {
    const allKey: KeyParams = {
      includePackage: true,
      includePlatform: true,
      v1package: null,
      v1platform: null,
    };
    const noPlatform: KeyParams = {
      includePackage: true,
      includePlatform: false,
      v1package: null,
      v1platform: null,
    };
    const noPackage: KeyParams = {
      includePackage: false,
      includePlatform: true,
      v1package: null,
      v1platform: null,
    };
    const keyOnly: KeyParams = {
      includePackage: false,
      includePlatform: false,
      v1package: null,
      v1platform: null,
    };
    const v1: KeyParams = {
      includePackage: true,
      includePlatform: true,
      v1package: "com.example.app",
      v1platform: "android",
    };

    function getKey(
      platform: string,
      packageName: string,
      keyParams: KeyParams
    ) {
      const clone = cloneDeep(ASSESSMENT);
      if (platform) {
        clone.platformType = platform;
      }
      if (packageName) {
        clone.packageKey = packageName;
      }
      return findingKey(clone, clone.report.findings[0], keyParams);
    }

    expect(ASSESSMENT.platformType).toEqual("android");
    expect(ASSESSMENT.packageKey).toEqual("com.example.app");

    const all = findingKey(ASSESSMENT, ASSESSMENT.report.findings[0], allKey);

    // Check that the key is used
    expect(
      findingKey(ASSESSMENT, ASSESSMENT.report.findings[1], allKey)
    ).not.toEqual(all);

    // key, platform and package
    expect(getKey(null, null, allKey)).toEqual(all);
    expect(getKey("ios", null, allKey)).not.toEqual(all);
    expect(getKey(null, "another.package", allKey)).not.toEqual(all);

    // key and package
    const noPlat = findingKey(
      ASSESSMENT,
      ASSESSMENT.report.findings[0],
      noPlatform
    );
    expect(getKey(null, null, noPlatform)).toEqual(noPlat);
    expect(getKey("ios", null, noPlatform)).toEqual(noPlat);
    expect(getKey(null, "another.package", noPlatform)).not.toEqual(noPlat);

    // key and platform
    const noPkg = findingKey(
      ASSESSMENT,
      ASSESSMENT.report.findings[0],
      noPackage
    );
    expect(getKey(null, null, noPackage)).toEqual(noPkg);
    expect(getKey("ios", null, noPackage)).not.toEqual(noPkg);
    expect(getKey(null, "another.package", noPackage)).toEqual(noPkg);

    // key only
    const justKey = findingKey(
      ASSESSMENT,
      ASSESSMENT.report.findings[0],
      keyOnly
    );
    expect(getKey(null, null, keyOnly)).toEqual(justKey);
    expect(getKey("ios", null, keyOnly)).toEqual(justKey);
    expect(getKey(null, "another.package", keyOnly)).toEqual(justKey);

    // v1 override
    expect(getKey(null, null, v1)).toEqual(justKey);
    expect(getKey("ios", null, v1)).not.toEqual(justKey);
    expect(getKey(null, "another.package", v1)).not.toEqual(justKey);
  });
});
