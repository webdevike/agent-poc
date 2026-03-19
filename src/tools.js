import fs from "fs/promises";
import path from "path";
import { execSync } from "child_process";

/**
 * Tool definitions sent to the Claude API.
 * These mirror what Claude Code has — read, write, list, search.
 */
export const toolDefinitions = [
  {
    name: "read_file",
    description:
      "Read a file from the workspace. Use paths relative to workspace root (e.g. 'brain/system.md', 'customer/profile.md').",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Relative path within the workspace",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description:
      "Write a file to the workspace. You can write to 'customer/', 'scratch/', and 'output/' directories. 'brain/' and 'batch/' are read-only.",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Relative path within the workspace",
        },
        content: { type: "string", description: "File content to write" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "list_directory",
    description:
      "List files and directories at the given path. Returns entries with type indicators (d=directory, f=file).",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            "Relative path within the workspace. Use '' or '.' for root.",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "search_files",
    description:
      "Search for a text pattern across files in the workspace. Returns matching lines with file paths.",
    input_schema: {
      type: "object",
      properties: {
        pattern: { type: "string", description: "Text or regex to search for" },
        path: {
          type: "string",
          description:
            "Directory to search in (relative to workspace root). Defaults to entire workspace.",
        },
      },
      required: ["pattern"],
    },
  },
];

/**
 * Execute a tool call within the sandboxed workspace.
 * All paths are resolved relative to workspaceRoot and cannot escape it.
 */
export async function handleTool(name, input, workspaceRoot) {
  const resolveSafe = (relativePath) => {
    const resolved = path.resolve(workspaceRoot, relativePath || ".");
    if (!resolved.startsWith(workspaceRoot)) {
      throw new Error(`Path traversal blocked: ${relativePath}`);
    }
    return resolved;
  };

  switch (name) {
    case "read_file": {
      const filePath = resolveSafe(input.path);
      try {
        const content = await fs.readFile(filePath, "utf-8");
        // Cap at 50k chars to avoid blowing context
        return content.slice(0, 50_000);
      } catch (e) {
        return `Error reading file: ${e.message}`;
      }
    }

    case "write_file": {
      const filePath = resolveSafe(input.path);
      // Enforce read-only directories
      const relative = path.relative(workspaceRoot, filePath);
      if (relative.startsWith("brain/") || relative.startsWith("batch/")) {
        return `Error: ${relative.split("/")[0]}/ is read-only`;
      }
      try {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, input.content, "utf-8");
        return `Wrote ${input.content.length} bytes to ${input.path}`;
      } catch (e) {
        return `Error writing file: ${e.message}`;
      }
    }

    case "list_directory": {
      const dirPath = resolveSafe(input.path);
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        return entries
          .map((e) => `${e.isDirectory() ? "d" : "f"}  ${e.name}`)
          .join("\n");
      } catch (e) {
        return `Error listing directory: ${e.message}`;
      }
    }

    case "search_files": {
      const searchPath = resolveSafe(input.path || ".");
      try {
        const result = execSync(
          `grep -r -n --include="*.md" --include="*.json" ${JSON.stringify(input.pattern)} ${JSON.stringify(searchPath)}`,
          { encoding: "utf-8", timeout: 5000 }
        );
        // Make paths relative to workspace for readability
        return result.replaceAll(workspaceRoot + "/", "");
      } catch (e) {
        if (e.status === 1) return "No matches found";
        return `Error searching: ${e.message}`;
      }
    }

    default:
      return `Unknown tool: ${name}`;
  }
}
