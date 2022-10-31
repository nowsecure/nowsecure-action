import { APPLICATION_TEMPLATE } from "./application";
import { DESCRIPTION_TEMPLATE } from "./description";
import { IMPACT_TEMPLATE } from "./impact";
import { RECOMMENDATION_TEMPLATE } from "./recommendation";
import { REPRODUCTION_TEMPLATE } from "./reproduction";
import { RISK_TEMPLATE } from "./risk";
import { EVIDENCE_TMPLATE } from "./evidence";

export { renderFinding } from "./render_finding";

const TITLE_TEMPLATE = "NowSecure {{kind}} analysis: {{title}}";

export interface Templates {
  title: string;
  header: string;
  description: string;
  reproduction: string;
  recommendation: string;
  evidence: string;
  impact: string;
  risk: string;
  application: string;
  footer: string;
}

export const TEMPLATES: Templates = {
  title: TITLE_TEMPLATE,
  header: "",
  description: DESCRIPTION_TEMPLATE,
  reproduction: REPRODUCTION_TEMPLATE,
  recommendation: RECOMMENDATION_TEMPLATE,
  evidence: EVIDENCE_TMPLATE,
  impact: IMPACT_TEMPLATE,
  risk: RISK_TEMPLATE,
  application: APPLICATION_TEMPLATE,
  footer: "",
};

export type SectionName = keyof Templates;
export type SectionList = SectionName[];

/** All section names, in default order. Note this does not include "title" */
export const SECTIONS: SectionList = [
  "header",
  "description",
  "reproduction",
  "recommendation",
  "evidence",
  "impact",
  "risk",
  "application",
  "footer",
];
