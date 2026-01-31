import { SvgApi } from "@svg-api/sdk";
import chalk from "chalk";
import fs from "node:fs/promises";
import path from "node:path";
import { globby } from "globby";

interface ScanCommandOptions {
  extensions: string;
  fix?: boolean;
  dryRun?: boolean;
}

interface IconUsage {
  name: string;
  source?: string;
  file: string;
  line: number;
  column: number;
  context: string;
}

// Patterns to detect icon usage in code
const ICON_PATTERNS = [
  // React/JSX: <Icon name="home" /> or <HomeIcon />
  /\u003c([A-Z][a-zA-Z]*Icon)[^\u003e]*\/>/g,
  /\u003cIcon[^\u003e]*name=["']([^"']+)["'][^\u003e]*\/>/g,
  // Vue: <icon name="home" />
  /\u003cicon[^\u003e]*name=["']([^"']+)["'][^\u003e]*\/>/gi,
  // Svelte: <Icon name="home" />
  /\u003cIcon[^\u003e]*name=["']([^"']+)["'][^\u003e]*\/>/g,
  // HTML: data-icon="home" or class="icon-home"
  /data-icon=["']([^"']+)["']/g,
  /class=["'][^"']*icon-([^\s"']+)[^"']*["']/g,
  // CSS: content: "\\e001" (icon fonts)
  /content:\s*["']\\+([0-9a-f]+)["']/gi,
];

export async function scanCommand(
  projectPath: string,
  options: ScanCommandOptions
): Promise<void> {
  const api = new SvgApi();
  
  try {
    console.log(chalk.blue("Scanning project for icon usage...\n"));

    // Find files to scan
    const extensions = options.extensions.split(",").map((e) => e.trim());
    const patterns = extensions.map((ext) => path.join(projectPath, "**", "*." + ext));
    
    const files = await globby(patterns, {
      ignore: ["**/node_modules/**", "**/dist/**", "**/.git/**"],
    });

    console.log(chalk.gray("Found " + files.length + " files to scan\n"));

    const usages: IconUsage[] = [];

    // Scan each file
    for (const file of files) {
      const content = await fs.readFile(file, "utf-8");
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        for (const pattern of ICON_PATTERNS) {
          pattern.lastIndex = 0;
          let match;
          
          while ((match = pattern.exec(line)) !== null) {
            const iconName = match[1] || match[0];
            // Convert IconName to icon-name format
            const normalizedName = iconName
              .replace(/([a-z])([A-Z])/g, "$1-$2")
              .toLowerCase()
              .replace(/-icon$/, "");

            usages.push({
              name: normalizedName,
              file: path.relative(projectPath, file),
              line: i + 1,
              column: match.index + 1,
              context: line.trim(),
            });
          }
        }
      }
    }

    // Group by icon name
    const grouped = new Map<string, IconUsage[]>();
    for (const usage of usages) {
      const existing = grouped.get(usage.name) || [];
      existing.push(usage);
      grouped.set(usage.name, existing);
    }

    // Display results
    console.log(chalk.bold("Found " + usages.length + " icon usages across " + grouped.size + " unique icons:\n"));

    for (const [name, items] of grouped) {
      console.log(chalk.cyan(name) + chalk.gray(" (" + items.length + " usages)"));
      
      for (const item of items.slice(0, 3)) {
        console.log("  " + chalk.gray(item.file + ":" + item.line));
      }
      
      if (items.length > 3) {
        console.log("  " + chalk.gray("... and " + (items.length - 3) + " more"));
      }
      console.log();
    }

    // Check which icons exist in the API
    console.log(chalk.blue("Checking icon availability...\n"));
    
    const notFound: string[] = [];
    const found: string[] = [];

    for (const name of grouped.keys()) {
      try {
        const exists = await api.iconExists(name);
        if (exists) {
          found.push(name);
        } else {
          notFound.push(name);
        }
      } catch {
        notFound.push(name);
      }
    }

    if (found.length > 0) {
      console.log(chalk.green("Available icons (" + found.length + "):"));
      console.log("  " + found.join(", "));
      console.log();
    }

    if (notFound.length > 0) {
      console.log(chalk.yellow("Icons not found in API (" + notFound.length + "):"));
      console.log("  " + notFound.join(", "));
      console.log();
      
      // Suggest alternatives
      console.log(chalk.blue("Searching for alternatives...\n"));
      
      for (const name of notFound.slice(0, 3)) {
        try {
          const results = await api.search({ query: name, limit: 3 });
          if (results.data.length > 0) {
            console.log(chalk.yellow(name) + " -> " + results.data.map((r: {name: string}) => r.name).join(", "));
          }
        } catch {
          // Ignore search errors
        }
      }
    }

    if (options.fix) {
      console.log(chalk.blue("\nApplying fixes..."));
      // TODO: Implement auto-fix logic
    }

  } catch (error) {
    console.error(chalk.red("Error scanning project:"), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
