/*
 * Copyright © 2022 NowSecure Inc.
 *
 * SPDX-License-Identifier: MIT
 */

import {
  Snapshot,
  Manifest,
  Package,
} from "@github/dependency-submission-toolkit";
import type { Deputy } from "./types/deputy";
import type { Context } from "@actions/github/lib/context";
import * as client from "@actions/http-client";
import { version } from "./nowsecure-version";
import { USER_AGENT } from "./nowsecure-client";

function encodePurl(ecosystem: string, name: string, version?: string): string {
  let purl = `pkg:${ecosystem}/${name}`;
  if (version) {
    purl += `@${encodeURIComponent(version)}`;
  }

  return purl;
}

/**
 * Convert a Platform report to the Snapshot format.
 */
export function convertToSnapshot(
  deputy: Deputy,
  githubCorrelator: string,
  context: Context
): Snapshot {
  const manifests: Record<string, Manifest> = {};

  for (const component of deputy.components) {
    let source = component.source;
    if (source.startsWith("/")) {
      source = source.substr(1);
    }

    let manifest = manifests[source];
    if (!manifest) {
      manifest = new Manifest(source);
    }

    // We need to translate our ecosystem into a proper PURL type.
    // See https://github.com/package-url/purl-spec/blob/master/PURL-TYPES.rst for supported PURL
    // types.
    let ecosystem = component.ecosystem.toLowerCase();
    switch (component.ecosystem) {
      case "Commercial":
      case "Native":
        // Fallback to "generic" which is reserved for this purpose.
        ecosystem = "generic";
        break;
      case "CocoaPods":
      case "Maven":
      case "npm":
      case "NuGet":
        break;
      // We purposefully omit default because the typings include a union here so if new types are
      // added the TypeScript compiler will emit an error.
    }

    const purl = encodePurl(ecosystem, component.name, component.version);

    manifest.addDirectDependency(new Package(purl));
    manifests[source] = manifest;
  }

  const snapshot = new Snapshot(
    {
      version,
      name: "NowSecure",
      url: "https://www.nowsecure.com/",
    },
    context
  );
  snapshot.manifests = manifests;
  return snapshot;
}
