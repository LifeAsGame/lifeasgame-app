import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { classifyPr, docsOnlyDiff } from "./ci-docs-only.mjs";

const diff = (...tokens) => Buffer.from(tokens.join("\0") + "\0");
test("only exact audited guides may skip heavy checks, including additions and deletions", () => {
  assert.equal(docsOnlyDiff(diff("M", "README.md", "A", "FRONTEND_GUIDE.md")), true);
  assert.equal(docsOnlyDiff(diff("D", "README.md")), true);
  assert.equal(docsOnlyDiff(diff("M", "README.md", "M", "app/page.tsx")), false);
  for (const path of ["docs/contracts/social/contract.md", "AGENTS.md", "package-lock.json", "next.config.ts", ".github/workflows/pr-ci.yml", "scripts/ci-docs-only.mjs", "public/logo.svg", "unknown.md", "README.md\napp/page.tsx", "$(touch unsafe).md"]) {
    assert.equal(docsOnlyDiff(diff("A", path)), false, path);
  }
});
test("renames inspect old and new paths and reject malformed or unknown records", () => {
  assert.equal(docsOnlyDiff(diff("R100", "README.md", "FRONTEND_GUIDE.md")), true);
  assert.equal(docsOnlyDiff(diff("R090", "README.md", "app/page.tsx")), false);
  assert.equal(docsOnlyDiff(diff("R99", "app/page.tsx", "README.md")), false);
  assert.equal(docsOnlyDiff(diff("D", "app/page.tsx")), false);
  for (const value of [Buffer.alloc(0), Buffer.from("M\0README.md"), diff("R100", "README.md"), diff("M"), diff("T", "README.md"), diff("U", "README.md"), diff("R999", "README.md", "FRONTEND_GUIDE.md")]) {
    assert.equal(docsOnlyDiff(value), false);
  }
});
test("merge-base comparison covers earlier code, divergent base changes, actual renames and Git failure", () => {
  const cwd = mkdtempSync(join(tmpdir(), "lag-ci-classifier-"));
  const git = (...args) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  const commit = () => { git("add", "-A"); git("commit", "-qm", "fixture"); return git("rev-parse", "HEAD"); };
  try {
    git("init", "-q"); git("config", "user.email", "ci-test@example.invalid"); git("config", "user.name", "CI regression");
    writeFileSync(join(cwd, "README.md"), "base\n"); const base = commit();
    writeFileSync(join(cwd, "README.md"), "guide edit\n"); const docs = commit();
    assert.deepEqual(classifyPr(base, docs, cwd), { docsOnly: true, comparisonFailed: false });
    writeFileSync(join(cwd, "source.ts"), "export const changed = true;\n"); commit();
    writeFileSync(join(cwd, "README.md"), "last commit is documentation\n"); const mixed = commit();
    assert.equal(classifyPr(base, mixed, cwd).docsOnly, false);
    git("checkout", "-q", "--detach", base); writeFileSync(join(cwd, "base-only.ts"), "base branch moved\n"); const movedBase = commit();
    assert.equal(classifyPr(movedBase, docs, cwd).docsOnly, true);
    git("checkout", "-q", "--detach", docs); git("mv", "README.md", "renamed.ts"); const renamed = commit();
    assert.equal(classifyPr(base, renamed, cwd).docsOnly, false);
    assert.deepEqual(classifyPr("0".repeat(40), docs, cwd), { docsOnly: false, comparisonFailed: true });
    assert.deepEqual(classifyPr("--help", docs, cwd), { docsOnly: false, comparisonFailed: true });
  } finally { rmSync(cwd, { recursive: true, force: true }); }
});
