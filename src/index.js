import { provision, teardown } from "./workspace.js";
import { runAgent } from "./agent.js";

// Pricing per million tokens
const PRICING = {
  "claude-sonnet-4-6":        { input: 3,    output: 15 },
  "claude-haiku-4-5-20251001": { input: 0.80, output: 4 },
  "claude-opus-4-6":          { input: 15,   output: 75 },
};

/**
 * Usage:
 *   node src/index.js                                          # defaults
 *   node src/index.js batch-001.json acme-corp                 # explicit
 *   node src/index.js batch-001.json acme-corp haiku           # model shorthand
 *   node src/index.js batch-001.json acme-corp claude-sonnet-4-6  # full model id
 */
function resolveModel(input) {
  const shortcuts = {
    haiku:  "claude-haiku-4-5-20251001",
    sonnet: "claude-sonnet-4-6",
    opus:   "claude-opus-4-6",
  };
  return shortcuts[input] || input || "claude-sonnet-4-6";
}

async function main() {
  const batchFile = process.argv[2] || "batch-001.json";
  const customerId = process.argv[3] || "acme-corp";
  const model = resolveModel(process.argv[4]);
  const pricing = PRICING[model] || { input: 3, output: 15 };

  console.log(`\nProcessing batch: ${batchFile} | customer: ${customerId} | model: ${model}`);
  console.log("─".repeat(70));

  // 1. Provision
  console.log("\n1. Provisioning workspace...");
  const { workspaceDir, batchId } = await provision(batchFile, customerId);
  console.log(`   Workspace: ${workspaceDir}`);

  // 2. Run agent
  console.log("\n2. Running agent...");
  const { totalInputTokens, totalOutputTokens } = await runAgent(workspaceDir, model);

  // 3. Teardown — read output, sync customer context back
  console.log("\n3. Reading output and syncing customer context...");
  const findings = await teardown(workspaceDir, customerId);

  // 4. Display results
  console.log("\n" + "─".repeat(70));
  if (findings) {
    console.log("FINDINGS:\n");
    for (const f of findings.findings) {
      console.log(`  ${f.event_id} (${f.event_type})`);
      console.log(`    Classification: ${f.classification}`);
      console.log(`    Confidence:     ${f.confidence}`);
      console.log(`    Reasoning:      ${f.reasoning}`);
      if (f.flags?.length) {
        console.log(`    Flags:          ${f.flags.join(", ")}`);
      }
      if (f.recommended_actions?.length) {
        console.log(`    Actions:        ${f.recommended_actions.join(", ")}`);
      }
      console.log();
    }
    if (findings.customer_insights) {
      console.log(`  Customer insights: ${findings.customer_insights}`);
    }
  } else {
    console.log("No structured findings produced.");
  }

  console.log("\n" + "─".repeat(70));
  console.log(`Total tokens — input: ${totalInputTokens}, output: ${totalOutputTokens}`);
  const cost =
    (totalInputTokens / 1_000_000) * pricing.input +
    (totalOutputTokens / 1_000_000) * pricing.output;
  console.log(`Estimated cost: ~$${cost.toFixed(4)} (${model})`);
  console.log();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
