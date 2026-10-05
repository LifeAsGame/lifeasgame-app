import { spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Audited prose only: neither file is imported/read by application, build or tests.
// Contracts, runtime content, AGENTS, images and every unlisted path run full checks.
const guides = new Set(["README.md", "FRONTEND_GUIDE.md"]);
const sha = /^[a-f0-9]{40}$/;

export function docsOnlyDiff(buffer) {
  const tokens = buffer.toString("utf8").split("\0");
  if (tokens.pop() !== "" || !tokens.length) return false;
  for (let index = 0; index < tokens.length;) {
    const status = tokens[index++];
    const rename = /^R(?:100|[0-9]{1,2})$/.test(status);
    if (!rename && !/^[AMD]$/.test(status)) return false;
    // --name-status -z preserves arbitrary filenames; both rename paths matter.
    for (let count = 0; count < (rename ? 2 : 1); count++) {
      if (!guides.has(tokens[index++])) return false;
    }
  }
  return true;
}

function git(args, cwd) {
  const result = spawnSync("git", args, { cwd, maxBuffer: 16 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error("Git comparison unavailable");
  return result.stdout;
}

export function classifyPr(base, head, cwd = process.cwd()) {
  try {
    if (!sha.test(base ?? "") || !sha.test(head ?? "")) throw new Error("Missing PR commits");
    // Compare the whole PR, even when the last commit edits only documentation.
    const mergeBase = git(["merge-base", "--all", base, head], cwd).toString("utf8").trim();
    if (!sha.test(mergeBase)) throw new Error("Ambiguous or unavailable merge base");
    const diff = git(["diff", "--name-status", "-z", "--find-renames", mergeBase, head, "--"], cwd);
    return { docsOnly: docsOnlyDiff(diff), comparisonFailed: false };
  } catch {
    // Classification uncertainty selects the existing full verification path.
    return { docsOnly: false, comparisonFailed: true };
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = classifyPr(process.env.PR_BASE_SHA, process.env.PR_HEAD_SHA);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `docs_only=${result.docsOnly}\n`);
  const summary = result.docsOnly
    ? "Verified ordinary documentation only (README.md / FRONTEND_GUIDE.md across the whole PR). Skipped npm ci, Vitest, lint, TypeScript and production build. Classifier regression checks passed."
    : `Full verification: npm ci, all Vitest tests, lint, TypeScript and production build.${result.comparisonFailed ? " PR classification was unavailable; defaulted to all checks." : " At least one change is outside the ordinary-document allowlist, or the diff is empty."}`;
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### PR verification scope\n\n${summary}\n`);
}
