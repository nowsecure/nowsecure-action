import { Liquid } from "liquidjs";
import {
  Assessment,
  CodeSample,
  ContextFieldInfo,
  Finding,
  GuidanceLink,
  Regulation,
  Severity,
} from "../types/platform";
import { assessmentLink } from "../utils";
import { SectionList, SECTIONS, TEMPLATES, Templates } from "./index";

const MD_ESCAPE = /([`|\\])/g;
const escapeMarkdown = (text: string) =>
  text ? text.replace(MD_ESCAPE, "\\$&") : "";

/**
 * Returns true if the code sample or guidance link applies to the platform,
 * or if the item doesn't specify a platform
 */
const matchesPlatform = (item: CodeSample | GuidanceLink, platform: string) =>
  item.platform === platform || !item.platform;

interface Risks {
  severity: Severity;
  cvss: number;
  cvssVector: string;
  cve: string;
  regulations: {
    items: Regulation[];
  };
}

/** Gets the risk object */
function getRisk(finding: Finding) {
  const regulations = finding.check.issue?.regulations || [];

  const regulatory: Risks = {
    severity: finding.severity,
    cvss: finding.cvss,
    cvssVector: finding.cvssVector,
    cve: finding.check.issue?.cve,
    regulations: regulations.length ? { items: regulations } : null,
  };

  let key: keyof Risks;
  for (key in regulatory) {
    if (regulatory[key]) {
      return regulatory;
    }
  }

  return null;
}

/**
 * Truncates a list of strings to ensure the total size is <= maxSize.
 * trimTable will always return the first row, even if that row is > maxSize.
 * If the table meets the size requirement the original table is returned (slice is not called)
 */
function trimTable(table: string[], maxSize: number): string[] {
  if (table.length > 1) {
    let size = table[0].length;
    for (let index = 1; index < table.length; ++index) {
      size += table[index].length;
      if (size > maxSize) {
        return table.slice(0, index);
      }
    }
  }

  return table;
}

/** Format NowSecure evidence in a Markdown table, when possible. */
function getEvidence(finding: Finding, maxRows: number) {
  const context = finding.context;
  const contextInfo = finding.check?.context;
  const contextFields = contextInfo?.fields;

  if (context?.rows?.length && contextFields) {
    /**
     * Return a table row by calling the passed function for each field.
     */
    const tableRow = (
      fieldFunc: (field: ContextFieldInfo) => string,
      header: boolean
    ) => {
      const delim = header ? "" : "`";
      const fields = contextFields.map(
        (field) => delim + escapeMarkdown(fieldFunc(field)) + delim
      );
      return "|" + fields.join("|") + "|\n";
    };

    const markdownHeader = tableRow((field) => field.title || "", true);
    const markdownDivider = "|-".repeat(contextFields.length) + "|\n";

    const rowSet = maxRows > 0 ? context.rows.slice(0, maxRows) : context.rows;

    const rows = rowSet.map((row) => {
      return tableRow((field) => {
        const data = row[field.key];
        return typeof data === "string" ? data : JSON.stringify(data);
      }, false);
    });

    // GitHub has a body limit of 64K characters. Trimming the table to 32K
    // retains at 32K for the rest of the issue text.
    const sizeLimitedTable = trimTable(rows, 32 * 1024);
    const rowCount = sizeLimitedTable.length;

    const table = [markdownHeader, markdownDivider, ...sizeLimitedTable].join(
      ""
    );
    const fullCount = context.rows.length;
    return {
      title: contextInfo.title || "table",
      rowCount,
      fullCount,
      truncated: rowCount < fullCount,
      table,
    };
  }

  return null;
}

export const LINE_SEPARATOR = "\n\n---\n\n";
export const PLAIN_SEPARATOR = "\n\n";
export interface FindingRenderOptions {
  /** Maximum number of rows to show in an evidence table. 0 means all. */
  maxRows?: number;

  /** Separator between sections. Default is the standard Markdown separator */
  separator?: string;

  /** list defining which sections to show in what order. Used in test suite */
  sections?: SectionList;

  /** Templates to use. Used in test suite. */
  templates?: Templates;
}

export function renderFinding(
  assessment: Assessment,
  finding: Finding,
  linkBlock: string,
  baseUrl: string,
  options?: FindingRenderOptions
) {
  const {
    maxRows = 0,
    separator = LINE_SEPARATOR,
    sections = SECTIONS,
    templates = TEMPLATES,
  } = options || {};
  const engine = new Liquid({ jsTruthy: true });
  const renderList = sections.filter((x) => x !== "title");

  const platform = assessment.platformType;

  const codeSamples = (finding.check?.issue?.codeSamples || []).filter(
    (sample) => matchesPlatform(sample, platform)
  );

  const guidanceLinks = (finding.check?.issue?.guidanceLinks || []).filter(
    (link) => matchesPlatform(link, platform)
  );

  const asmtLink = assessmentLink(baseUrl, assessment, finding);

  const values = {
    platform: assessment.platformType,
    package: assessment.packageKey,
    assessmentLink: asmtLink,
    kind: finding.kind,
    title: finding.title,
    category: finding.category,
    description: finding.check?.issue?.description || finding.summary,
    reproduction: finding.check?.issue?.stepsToReproduce,
    recommendation: finding.check?.issue?.recommendation,
    impact: finding.check?.issue?.impactSummary,
    impactType: finding.impactType,
    codeSamples: codeSamples.length ? { samples: codeSamples } : null,
    guidanceLinks: guidanceLinks.length ? { links: guidanceLinks } : null,
    hasFix: !!(codeSamples.length || guidanceLinks.length),
    risk: getRisk(finding),
    evidence: getEvidence(finding, maxRows),
  };

  const title = engine.parseAndRenderSync(templates.title, values);
  const body =
    renderList
      .map((section) => engine.parseAndRenderSync(templates[section], values))
      .filter((section) => !!section.trim()) // remove blanks
      .join(separator) + linkBlock;

  return { title, body };
}
