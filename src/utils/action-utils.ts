import { convertToSarif } from "../nowsecure-sarif";
import { promises } from "fs";
import {
  convertToSnapshot,
  submitSnapshotData,
  ActionContext,
} from "../nowsecure-snapshot";
import type { PullReportResponse } from "../types/platform";

const { writeFile } = promises;

export async function outputToDependencies(
  report: PullReportResponse,
  context: ActionContext,
  githubCorrelator: string,
  githubToken: string
) {
  const deputy = report?.data?.auto?.assessments[0]?.deputy;
  if (deputy) {
    console.log("Converting NowSecure report to Snapshot format...");
    const snapshotData = convertToSnapshot(deputy, githubCorrelator, context);
    console.log("Uploading Snapshot data to GitHub...");
    return submitSnapshotData(snapshotData, context, githubToken);
  } else {
    console.warn(
      "NowSecure did not find dependencies information for this report"
    );
  }
}

export async function outputToSarif(
  report: PullReportResponse,
  labUrl: string
) {
  console.log("Converting NowSecure report to SARIF...");
  const sarif = await convertToSarif(report, labUrl);
  await writeFile("NowSecure.sarif", JSON.stringify(sarif));
}
