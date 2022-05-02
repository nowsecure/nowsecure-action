/*
 * Copyright © 2022 NowSecure Inc.
 *
 * SPDX-License-Identifier: MIT
 */

export interface Deputy {
  /**
   * The version of Deputy.
   */
  deputy: string;
  /**
   * Name of the executable that was scanned.
   */
  package: string;
  packageType: "iOS" | "STANDARD-APK" | "BUNDLE-APK";
  /**
   * SHA256 of the application package.
   */
  sha256: string;
  timestamp: number;
  components: Component[];
  success: boolean;
}

export interface Component {
  ecosystem: "CocoaPods" | "Maven" | "Native" | "npm" | "NuGet" | "Commercial";
  /**
   * Name of package, or Java package namespace.
   */
  name: string;
  homepage: string | null;
  description: string | null;
  mainVersion: string | null;
  shortVersion: string | null;
  version: string | null;
  latest: string | null;
  license?: string | null;
  vulnerabilities: Vulnerability[];
  vulnerabilitiesFound: number;
  referenceUrl: string | null;
  coordinates: string | null;
  internal: boolean;
  source: string | null;
}

export interface Vulnerability {
  id: string;
  title: string;
  description: string;
  cvssScore: string;
  cvssVector: string;
  cwe: string;
  reference: string;
}
