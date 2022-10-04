import fs from "fs";
import path from "path";
import { findingLabels } from "../nowsecure-issues";
import { Finding } from "../types/platform";
import { NsConfig } from "../utils";

const FINDINGS: Finding[] = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "resources", "issues", "assessment.json"),
    "utf8"
  )
).data.auto.assessments[0].report.findings;

describe("Test labels", () => {
  test("generates the expected labels", () => {
    const labelsFile = path.join(
      __dirname,
      "resources",
      "config",
      "labels.yml"
    );
    const config = new NsConfig(labelsFile).getConfig("all_keys", "issues");
    const labels = config.labels;

    expect(FINDINGS[0].severity).toBe("critical");
    expect(findingLabels(FINDINGS[0], labels).sort()).toEqual([
      "always",
      "critical",
    ]);

    expect(FINDINGS[1].severity).toBe("high");
    expect(findingLabels(FINDINGS[1], labels).sort()).toEqual([
      "always",
      "high",
    ]);

    expect(FINDINGS[2].severity).toBe("medium");
    expect(findingLabels(FINDINGS[2], labels).sort()).toEqual([
      "always",
      "medium",
    ]);

    expect(FINDINGS[3].severity).toBe("low");
    expect(findingLabels(FINDINGS[3], labels).sort()).toEqual([
      "always",
      "low",
    ]);

    expect(FINDINGS[4].severity).toBe("info");
    expect(FINDINGS[4].check.issue.warn).toBe(true);
    expect(findingLabels(FINDINGS[4], labels).sort()).toEqual([
      "always",
      "warning",
    ]);

    expect(FINDINGS[5].severity).toBe("info");
    expect(FINDINGS[5].check.issue.warn).toBe(false);
    expect(findingLabels(FINDINGS[5], labels).sort()).toEqual([
      "always",
      "info",
    ]);
  });
});
