#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { searchCommand } from "./commands/search.js";
import { downloadCommand } from "./commands/download.js";
import { scanCommand } from "./commands/scan.js";
import { configCommand } from "./commands/config.js";
import { listCommand } from "./commands/list.js";

const program = new Command();

program
  .name("svg-api")
  .description("CLI tool for SVG API - search, download, and manage icons")
  .version("1.0.0")
  .option("-k, --api-key <key>", "API key for authentication")
  .option("-b, --base-url <url>", "Base URL for API", "https://svg-api.org")
  .option("-v, --verbose", "Enable verbose output")
  .hook("preAction", (thisCommand) => {
    const options = thisCommand.opts();
    if (options.verbose) {
      process.env.SVG_API_VERBOSE = "true";
    }
  });

program
  .command("search")
  .alias("s")
  .description("Search for icons")
  .argument("<query>", "Search query")
  .option("-s, --source <source>", "Filter by source")
  .option("-c, --category <category>", "Filter by category")
  .option("-l, --limit <number>", "Limit results", "20")
  .option("--json", "Output as JSON")
  .action(searchCommand);

program
  .command("download")
  .alias("d")
  .description("Download icons")
  .argument("<icons...", "Icon names to download (format: name or source:name)")
  .option("-o, --output <dir>", "Output directory", "./icons")
  .option("-s, --size <size>", "Icon size")
  .option("-c, --color <color>", "Icon color")
  .option("--stroke <width>", "Stroke width")
  .option("--format <format>", "Output format (svg|json)", "svg")
  .option("--flat", "Don't create subdirectories for sources")
  .action(downloadCommand);

program
  .command("scan")
  .description("Scan project for icon usage and suggest replacements")
  .argument("[path]", "Project path to scan", ".")
  .option("-e, --extensions <ext>", "File extensions to scan", "tsx,jsx,vue,svelte,html")
  .option("--fix", "Automatically replace icons with optimized versions")
  .option("--dry-run", "Show changes without applying them")
  .action(scanCommand);

program
  .command("list")
  .alias("ls")
  .description("List available sources or categories")
  .argument("<type>", "What to list: sources|categories")
  .option("--source <source>", "Filter categories by source")
  .action(listCommand);

program
  .command("config")
  .description("Manage CLI configuration")
  .option("--get <key>", "Get configuration value")
  .option("--set <key=value>", "Set configuration value")
  .option("--list", "List all configuration")
  .action(configCommand);

program.parse();
