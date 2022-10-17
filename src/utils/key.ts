import crypto from "crypto";

import { Assessment, Finding } from "../types/platform";
import { JSONObject, KeyParams } from "./config-types";
import { ValueError } from "./errors";

export const DEFAULT_KEY_PARAMS: KeyParams = {
  includePackage: true,
  includePlatform: true,
  v1package: null,
  v1platform: null,
};

/**
 * Take the SHA256 of an input string and output in hex.
 */
export function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

/**
 * Derive a key for a finding
 */
export function findingKey(
  assessment: Assessment,
  finding: Finding,
  keyParams: KeyParams
) {
  if (
    assessment.packageKey === keyParams.v1package &&
    assessment.platformType === keyParams.v1platform
  ) {
    return sha256(finding.key);
  }

  const keyInput = [finding.key];
  if (keyParams.includePlatform) {
    keyInput.push(assessment.platformType);
  }
  if (keyParams.includePackage) {
    keyInput.push(assessment.packageKey);
  }
  return sha256(keyInput.join("|"));
}

export function parseKeyConfig(keyData: JSONObject): KeyParams {
  const keyParams: KeyParams = { ...DEFAULT_KEY_PARAMS };

  if ("v1-key" in keyData) {
    const v1Key = keyData["v1-key"];
    if (typeof v1Key !== "string") {
      throw new TypeError("v1-key must be a string");
    }
    const parts = v1Key.split(/\s+/);
    if (parts.length !== 2) {
      throw new ValueError(
        "v1-key must be of the form <platform> <packageName>"
      );
    }
    if (parts[0] !== "android" && parts[0] !== "ios") {
      throw new ValueError(
        `v1-key: "${parts[0]}" is not a valid platform type`
      );
    }
    [keyParams.v1platform, keyParams.v1package] = parts;
  }

  if ("package" in keyData) {
    if (typeof keyData.package !== "boolean") {
      throw new TypeError("package must be a boolean");
    }
    keyParams.includePackage = keyData.package;
  }

  if ("platform" in keyData) {
    if (typeof keyData.platform !== "boolean") {
      throw new TypeError("platform must be a boolean");
    }
    keyParams.includePlatform = keyData.platform;
  }

  return keyParams;
}
