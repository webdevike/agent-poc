import fs from "fs/promises";
import path from "path";

const ROOT = path.resolve(import.meta.dirname, "..");

/**
 * Provision a workspace for a batch run.
 *
 * In production, this would:
 *   - brain/     → mounted from EFS or synced from git
 *   - customer/  → pulled from S3
 *   - batch/     → materialized from your data lake
 *   - scratch/   → empty temp dir
 *   - output/    → empty temp dir
 *
 * For the POC, we symlink brain/ and customer/, and copy the batch file.
 * This mirrors the prod behavior: brain is shared read-only,
 * customer is per-customer read-write, batch is ephemeral input.
 */
export async function provision(batchFile, customerId) {
  const batchId = path.basename(batchFile, ".json");
  const workspaceDir = path.join(ROOT, "workspaces", `${customerId}-${batchId}-${Date.now()}`);

  // Create workspace structure
  await fs.mkdir(path.join(workspaceDir, "scratch"), { recursive: true });
  await fs.mkdir(path.join(workspaceDir, "output"), { recursive: true });
  await fs.mkdir(path.join(workspaceDir, "batch"), { recursive: true });

  // Symlink brain (read-only shared knowledge — same for all customers)
  await fs.symlink(path.join(ROOT, "brain"), path.join(workspaceDir, "brain"));

  // Copy customer dir (read-write — agent will update patterns.md etc.)
  // In prod this would be: download from S3, work locally, upload back
  const customerSrc = path.join(ROOT, "customers", customerId);
  const customerDst = path.join(workspaceDir, "customer");
  await copyDir(customerSrc, customerDst);

  // Copy batch events into workspace
  const events = await fs.readFile(path.join(ROOT, "sample-events", batchFile), "utf-8");
  await fs.writeFile(path.join(workspaceDir, "batch", "events.json"), events);

  return { workspaceDir, batchId, customerId };
}

/**
 * After the agent finishes:
 * 1. Read structured output
 * 2. Sync updated customer context back to persistent storage
 * 3. Archive workspace (in prod → S3)
 */
export async function teardown(workspaceDir, customerId) {
  const ROOT = path.resolve(import.meta.dirname, "..");

  // Read findings
  let findings = null;
  try {
    const raw = await fs.readFile(path.join(workspaceDir, "output", "findings.json"), "utf-8");
    findings = JSON.parse(raw);
  } catch {
    console.warn("  No findings.json produced by agent");
  }

  // Sync customer context back (in prod → upload to S3)
  const customerSrc = path.join(workspaceDir, "customer");
  const customerDst = path.join(ROOT, "customers", customerId);
  await copyDir(customerSrc, customerDst);

  // In prod you'd archive the workspace to S3 here
  // await archiveToS3(`workspaces/${customerId}/${batchId}/`, workspaceDir)

  return findings;
}

async function copyDir(src, dst) {
  await fs.mkdir(dst, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, dstPath);
    } else {
      await fs.copyFile(srcPath, dstPath);
    }
  }
}
