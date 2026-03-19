import Anthropic from "@anthropic-ai/sdk";
import { toolDefinitions, handleTool } from "./tools.js";

const client = new Anthropic();
const MAX_TURNS = 30;

/**
 * Run the agent loop against a provisioned workspace.
 *
 * This is the core of the system — it's Claude exploring the workspace
 * exactly like Claude Code explores a project. The only difference is
 * the "project" is a workspace we provisioned with HR data.
 */
export async function runAgent(workspaceRoot, model = "claude-sonnet-4-6") {
  console.log(`  Agent starting... (model: ${model})`);

  const messages = [
    {
      role: "user",
      content:
        "Begin analysis. Start by reading brain/system.md, then explore the workspace and process the batch.",
    },
  ];

  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      system:
        "You are an HR data analyst agent. You work by reading and writing files in your workspace. Always start by reading your system instructions, then explore the data and follow the playbooks.",
      tools: toolDefinitions,
      messages,
    });

    totalInputTokens += response.usage.input_tokens;
    totalOutputTokens += response.usage.output_tokens;

    // Log any text the agent produces (its "thinking out loud")
    for (const block of response.content) {
      if (block.type === "text") {
        console.log(`  Agent [turn ${turn + 1}]: ${block.text.slice(0, 200)}`);
      }
    }

    // If the agent is done (no more tool calls), break
    if (response.stop_reason === "end_turn") {
      console.log(`  Agent finished after ${turn + 1} turns`);
      break;
    }

    // Process tool calls
    const toolResults = [];
    for (const block of response.content) {
      if (block.type === "tool_use") {
        console.log(`  Tool: ${block.name}(${JSON.stringify(block.input).slice(0, 100)})`);
        const result = await handleTool(block.name, block.input, workspaceRoot);
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result,
        });
      }
    }

    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: toolResults });
  }

  console.log(`  Tokens — input: ${totalInputTokens}, output: ${totalOutputTokens}`);
  return { totalInputTokens, totalOutputTokens };
}
