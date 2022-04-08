/*
 * Copyright © 2022 NowSecure Inc.
 *
 * SPDX-License-Identifier: MIT
 */

import type { DependencySnapshot, Manifest } from "./types/dependency-snapshot";
import type { Deputy } from "./types/deputy";
import * as client from "@actions/http-client";
import { version } from "./nowsecure-version";
import { USER_AGENT } from "./nowsecure-client";

/**
 * Contains environmental information for conversion routines.
 */
export interface ActionContext {
  sha: string;
  ref: string;
  job: string;
  runId: number;
  repo: {
    owner: string;
    repo: string;
  };
}

/**
 * Upload URL for snapshots.
 */
const snapshotUrl = (owner: string, repo: string) =>
  `https://api.github.com/repos/${owner}/${repo}/dependency-graph/snapshots`;

function encodePurl(ecosystem: string, name: string, version?: string): string {
  let purl = `pkg:${ecosystem}/${name}`;
  if (version) {
    purl += `@${version}`;
  }

  return purl;
}

/**
 * Convert a Platform report to the Snapshot format.
 */
export function convertToSnapshot(
  deputy: Deputy,
  githubCorrelator: string,
  { ref, sha, job, runId }: ActionContext
): DependencySnapshot {
  const manifests = new Map<string, Manifest>();

  for (const component of deputy.components) {
    let source = component.source;
    if (source.startsWith("/")) {
      source = source.substr(1);
    }

    let manifest = manifests.get(source);
    if (!manifest) {
      manifest = {
        name: source,
        resolved: {},
      };
    }

    const purl = encodePurl(
      component.ecosystem.toLowerCase(),
      component.name,
      component.version
    );

    manifest.resolved[component.name] = {
      package_url: purl.toString(),
      relationship: "direct",
    };

    manifests.set(source, manifest);
  }

  const snapshot: DependencySnapshot = {
    version: 0,
    ref,
    sha,
    job: {
      correlator: githubCorrelator,
      id: `${runId}`,
    },
    detector: {
      name: "NowSecure",
      url: "https://www.nowsecure.com/",
      version,
    },
    scanned: new Date().toISOString(),
    manifests: Object.fromEntries(manifests),
  };

  return snapshot;
}

/**
 * Submit a Snapshot to GitHub.
 *
 * NB: This code is meant to be temporary. Once GitHub releases an SBOM upload action a la
 * `upload-sarif`, this code will be removed and replaced with that.
 */
export async function submitSnapshotData(
  data: DependencySnapshot,
  { repo: { owner, repo } }: ActionContext,
  token: string
) {
  const httpClient = new client.HttpClient(USER_AGENT);
  const r = await httpClient.post(
    snapshotUrl(owner, repo),
    JSON.stringify(data),
    {
      Authorization: `token ${token}`,
    }
  );

  if (r.message.statusCode !== 201) {
    throw new Error(
      `Snapshot request failed with status ${r.message.statusCode}`
    );
  }
}
