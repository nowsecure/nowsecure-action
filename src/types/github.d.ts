import oktypes from "@octokit/openapi-types/types";

export type Issue = oktypes.components["schemas"]["issue"];
export type RateLimitInfo = oktypes.components["schemas"]["rate-limit"];
export type RateLimitResources =
  oktypes.components["schemas"]["rate-limit-overview"]["resources"];
export type CreateIssueParams =
  oktypes.operations["issues/create"]["requestBody"]["content"]["application/json"];
