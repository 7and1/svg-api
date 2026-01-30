import { SvgApi } from "@svg-api/sdk";
import chalk from "chalk";
import type { SearchOptions } from "@svg-api/sdk";

interface SearchCommandOptions {
  source?: string;
  category?: string;
  limit: string;
  json?: boolean;
}

export async function searchCommand(
  query: string,
  options: SearchCommandOptions
): Promise<void> {
  const api = new SvgApi();
  
  try {
    const searchOptions: SearchOptions = {
      query,
      source: options.source,
      category: options.category,
      limit: parseInt(options.limit, 10),
    };

    const results = await api.search(searchOptions);

    if (options.json) {
      console.log(JSON.stringify(results, null, 2));
      return;
    }

    if (results.data.length === 0) {
      console.log(chalk.yellow("No icons found matching your query."));
      return;
    }

    console.log(chalk.bold("Found " + results.meta.total + " icons:\n"));

    for (const icon of results.data) {
      const score = Math.round(icon.score * 100);
      const scoreColor = score > 80 ? chalk.green : score > 50 ? chalk.yellow : chalk.gray;
      
      console.log("  " + chalk.cyan(icon.name) + " " + chalk.gray("(" + icon.source + ")"));
      console.log("    Category: " + chalk.magenta(icon.category));
      console.log("    Score: " + scoreColor(score + "%"));
      
      if (icon.matches) {
        if (icon.matches.name) {
          console.log("    " + chalk.green("✓") + " Name match");
        }
        if (icon.matches.tags.length > 0) {
          console.log("    Tags: " + icon.matches.tags.join(", "));
        }
      }
      console.log();
    }

    if (results.meta.has_more) {
      console.log(chalk.gray("Showing " + results.data.length + " of " + results.meta.total + " results"));
      console.log(chalk.gray("Search time: " + results.meta.search_time_ms + "ms"));
    }
  } catch (error) {
    console.error(chalk.red("Error searching icons:"), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
