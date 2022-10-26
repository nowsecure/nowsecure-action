import fs from "fs";
import path from "path";
import { findingLabels } from "../nowsecure-issues";
import { Finding } from "../types/platform";
import { NsConfig } from "../utils";

const FINDINGS: Finding[] = JSON.parse(
  fs.readFileSync(path.join(__dirname, "resources", "assessment.json"), "utf8")
).data.auto.assessments[0].report.findings;

function loadLabels() {
  const labelsFile = path.join(__dirname, "resources", "config", "labels.yml");
  const config = new NsConfig(labelsFile).getConfig("all_keys", "issues");
  return config.labels;
}

describe("Test labels", () => {
  test("generates the expected labels", () => {
    const labels = loadLabels();

    expect(FINDINGS[0].severity).toBe("critical");
    expect(FINDINGS[0].category).toBe("fs");
    expect(findingLabels(FINDINGS[0], labels).sort()).toEqual([
      "always",
      "critical",
      "fs",
    ]);

    expect(FINDINGS[1].severity).toBe("high");
    expect(FINDINGS[1].category).toBe("network");
    expect(findingLabels(FINDINGS[1], labels).sort()).toEqual([
      "always",
      "high",
      "network",
    ]);

    expect(FINDINGS[2].severity).toBe("medium");
    expect(FINDINGS[2].category).toBe("code");
    expect(findingLabels(FINDINGS[2], labels).sort()).toEqual([
      "always",
      "code",
      "medium",
    ]);

    expect(FINDINGS[3].severity).toBe("low");
    expect(FINDINGS[3].category).toBe("code");
    expect(findingLabels(FINDINGS[3], labels).sort()).toEqual([
      "always",
      "code",
      "low",
    ]);

    expect(FINDINGS[4].severity).toBe("info");
    expect(FINDINGS[4].check.issue.warn).toBe(true);
    expect(FINDINGS[4].category).toBe("network");
    expect(findingLabels(FINDINGS[4], labels).sort()).toEqual([
      "always",
      "network",
      "warning",
    ]);

    expect(FINDINGS[5].severity).toBe("info");
    expect(FINDINGS[5].check.issue.warn).toBe(false);
    expect(FINDINGS[5].category).toBe("permissions");
    expect(findingLabels(FINDINGS[5], labels).sort()).toEqual([
      "always",
      "info",
      "permissions",
    ]);

    expect(FINDINGS[6].severity).toBe("info");
    expect(FINDINGS[6].check.issue).toBe(null);
    expect(FINDINGS[6].category).toBe(undefined);
    expect(findingLabels(FINDINGS[6], labels).sort()).toEqual([
      "always",
      "info",
    ]);
  });

  test("category labels can be disabled", () => {
    const labels = loadLabels();

    labels.categoryLabels = false;

    expect(FINDINGS[0].severity).toBe("critical");
    expect(FINDINGS[0].category).toBe("fs");
    expect(findingLabels(FINDINGS[0], labels).sort()).toEqual([
      "always",
      "critical",
    ]);

    delete labels.categoryLabels;

    expect(FINDINGS[0].severity).toBe("critical");
    expect(FINDINGS[0].category).toBe("fs");
    expect(findingLabels(FINDINGS[0], labels).sort()).toEqual([
      "always",
      "critical",
    ]);
  });
});
