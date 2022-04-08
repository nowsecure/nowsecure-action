/**
 * GitHub dep snapshot.
 */
export interface DependencySnapshot {
  version: 0;
  job: Job;
  /**
   * SHA of the git commit.
   */
  sha: string;
  /**
   * Ref of the git commit. For example, "refs/heads/main".
   */
  ref: string;
  detector?: DetectorMetadata;
  metadata?: Metadata;
  manifests?: Manifests;
  scanned: ISO8601Date;
}

export interface Job {
  correlator: string;
  id: string;
  html_url?: string;
}

export interface DetectorMetadata {
  name: string;
  url: string;
  version: string;
}

export interface Manifests {
  [key: string]: Manifest;
}

/**
 * A collection of related dependencies, either declared in a file, or
 * representing a logical group of dependencies.
 */
export interface Manifest {
  name: string;
  file?: FileInfo;
  metadata?: Metadata;
  resolved?: DependencyGraph;
}

export interface FileInfo {
  source_location?: string;
}

/**
 * A notation of whether a dependency is requested directly by this manifest,
 * or is a dependency of another dependency.
 */
export type DependencyRelationship = "direct" | "indirect";

/**
 * A notation of whether the dependency is required for the primary build
 * artifact (runtime), or is only used for development. Future versions of this
 * specification may allow for more granular scopes, like `runtime:server`,
 * `runtime:shipped`, `development:test`, `development:benchmark`.
 */
export type DependencyScope = "runtime" | "development";

export interface DependencyNode {
  package_url?: string;
  metadata?: Metadata;
  relationship?: DependencyRelationship;
  scope?: DependencyScope;
  dependencies?: string[];
}

export interface DependencyGraph {
  [key: string]: DependencyNode;
}

export type ISO8601Date = string;

export type Scalar = null | boolean | string | number;

export interface Metadata {
  [key: string]: Scalar;
}
