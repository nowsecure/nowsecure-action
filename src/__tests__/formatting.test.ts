import fs from "fs";
import path from "path";
import { Assessment } from "../types/platform";
import { Templates, renderFinding, SectionList } from "../issue-templates";
import { FindingRenderOptions } from "../issue-templates/render_finding";

const assessment: Assessment = JSON.parse(
  fs.readFileSync(path.join(__dirname, "resources", "assessment.json"), "utf8")
).data.auto.assessments[0];

const finding = assessment.report.findings[0];

const templates: Templates = {
  title: "title_section",
  header: "header_section",
  footer: "footer_section",
  description: "description_section",
  reproduction: "reproduction_section",
  recommendation: "recommendation_section",
  evidence: "evidence_section",
  impact: "impact_section",
  risk: "risk_section",
  application: "application_section",
};

describe("test formatting", () => {
  test("generates the expected format", () => {
    const options: FindingRenderOptions = {
      maxRows: 10,
      separator: "\n",
      templates,
    };
    const { title, body } = renderFinding(
      assessment,
      finding,
      "",
      "http://localhost",
      options
    );
    expect(title).toEqual("title_section");
    expect(body).toEqual(
      [
        "header_section",
        "description_section",
        "reproduction_section",
        "recommendation_section",
        "evidence_section",
        "impact_section",
        "risk_section",
        "application_section",
        "footer_section",
      ].join("\n")
    );
  });

  test("reorders and omits sections", () => {
    const sections: SectionList = ["footer", "impact", "description", "header"];
    const options: FindingRenderOptions = {
      maxRows: 10,
      separator: "\n",
      templates,
      sections,
    };
    const { title, body } = renderFinding(
      assessment,
      finding,
      "",
      "http://localhost",
      options
    );
    expect(title).toEqual("title_section");
    expect(body).toEqual(
      [
        "footer_section",
        "impact_section",
        "description_section",
        "header_section",
      ].join("\n")
    );
  });
});
