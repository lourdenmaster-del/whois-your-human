#!/usr/bin/env node
/**
 * Vercel deployment verification for ligs.io stance layer.
 * Run: VERCEL_TOKEN=<token> node scripts/vercel-deployment-verify.mjs
 *
 * Requires VERCEL_TOKEN from https://vercel.com/account/tokens
 */

const PROJECT_ID = "prj_SlTmSjvlWeynKLd1ijFVupKhtBIV";
const TEAM_ID = "team_QpDVRMI50nzdlFZ2A6BO2FpW";
const TARGET_COMMIT = "9db49d0";
const BASE = "https://api.vercel.com";

async function api(path, opts = {}) {
  const token = process.env.VERCEL_TOKEN || process.env.VERCEL_AUTH_TOKEN;
  if (!token) {
    console.error("Set VERCEL_TOKEN or VERCEL_AUTH_TOKEN");
    process.exit(1);
  }
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...opts.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || res.statusText);
  return data;
}

async function main() {
  console.log("=== Vercel deployment verification for ligs.io ===\n");

  // 1. Project details (git repo, branch)
  let project;
  try {
    project = await api(`/v9/projects/${PROJECT_ID}?teamId=${TEAM_ID}`);
  } catch (e) {
    console.error("Project fetch failed:", e.message);
    process.exit(1);
  }

  const link = project.link;
  const repo = link
    ? `${link.type}/${link.org}/${link.repo}`
    : "none (not linked)";
  const prodBranch =
    project.targets?.production?.branch ?? project.productionBranch ?? "?";

  console.log("1. Vercel project config:");
  console.log("   Project:", project.name);
  console.log("   Repo:", repo);
  console.log("   Production branch:", prodBranch);
  console.log("   Root directory:", project.rootDirectory || "(empty)");
  console.log("");

  // 2. Latest deployments
  let deployments;
  try {
    deployments = await api(
      `/v6/deployments?projectId=${PROJECT_ID}&teamId=${TEAM_ID}&limit=10`
    );
  } catch (e) {
    console.error("Deployments fetch failed:", e.message);
    process.exit(1);
  }

  const deploys = deployments.deployments || [];
  const prod = deploys.find((d) => d.target === "production") || deploys[0];
  const meta = prod?.meta || {};
  const commit =
    meta.githubCommitSha || meta.gitSource?.sha || meta.commitMessage || "?";

  console.log("2. Latest production deployment:");
  console.log("   UID:", prod?.uid);
  console.log("   State:", prod?.readyState || prod?.state);
  console.log("   Commit:", commit);
  console.log("   URL:", prod?.url);
  console.log("   Created:", prod?.createdAt ? new Date(prod.createdAt).toISOString() : "?");
  console.log("");

  const has9db49d0 =
    typeof commit === "string" &&
    (commit.startsWith("9db49d0") || commit.includes("9db49d0"));

  console.log("3. Stance layer (9db49d0) on production?");
  console.log("   ", has9db49d0 ? "YES" : "NO");
  if (!has9db49d0) {
    console.log("   Expected: commit 9db49d0 (stance endpoint)");
  }
  console.log("");

  // 4. Diagnosis
  console.log("4. Diagnosis:");
  if (!link) {
    console.log("   - Project is NOT linked to a Git repo.");
    console.log("   - Fix: Vercel Dashboard → Project → Settings → Git → Connect Git Repository");
  } else {
    const expectRepo = "github/lourdenmaster-del/nextjs-boilerplate";
    const actualRepo = `${link.type}/${link.org}/${link.repo}`.toLowerCase();
    if (!actualRepo.includes("nextjs-boilerplate")) {
      console.log("   - Repo mismatch: production may deploy from", actualRepo);
      console.log("   - Stance code is in nextjs-boilerplate. Fix: connect to nextjs-boilerplate repo.");
    }
    if (prodBranch !== "main") {
      console.log("   - Production branch is", prodBranch, "(expected: main)");
      console.log("   - Fix: Vercel Dashboard → Settings → Git → Production Branch → set to main");
    }
  }
  if (!has9db49d0 && link) {
    console.log("   - Latest prod deployment does not include 9db49d0.");
    console.log("   - Try: Redeploy from main in Vercel Dashboard.");
  }
  console.log("");

  // 5. Next steps
  console.log("5. Next steps:");
  if (!has9db49d0) {
    console.log("   - Redeploy: Vercel Dashboard → Project → Deployments → ⋮ → Redeploy");
    console.log("   - Or push an empty commit to main to trigger auto-deploy");
  }
  console.log("");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
