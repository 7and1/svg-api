import { SvgApi } from "@svg-api/sdk";
import chalk from "chalk";

interface ListCommandOptions {
  source?: string;
}

export async function listCommand(
  type: string,
  options: ListCommandOptions
): Promise<void> {
  const api = new SvgApi();
  
  try {
    if (type === "sources") {
      const sources = await api.getSources();
      
      console.log(chalk.bold("\nAvailable icon sources:\n"));
      
      for (const source of sources.data) {
        console.log("  " + chalk.cyan(source.name));
        console.log("    " + chalk.gray(source.description));
        console.log("    Icons: " + chalk.yellow(source.iconCount.toString()));
        console.log("    License: " + chalk.magenta(source.license.type));
        console.log();
      }
      
      console.log(chalk.gray("Total: " + sources.meta.total_sources + " sources, " + sources.meta.total_icons + " icons"));
      
    } else if (type === "categories") {
      const categories = await api.getCategories(options.source);
      
      console.log(chalk.bold("\nAvailable categories" + (options.source ? " for " + options.source : "") + ":\n"));
      
      for (const category of categories.data) {
        console.log("  " + chalk.cyan(category.name));
        console.log("    " + chalk.gray(category.description));
        console.log("    Icons: " + chalk.yellow(category.iconCount.toString()));
        if (category.sources.length > 1) {
          console.log("    Sources: " + category.sources.join(", "));
        }
        console.log();
      }
      
      console.log(chalk.gray("Total: " + categories.meta.total + " categories"));
      
    } else {
      console.error(chalk.red("Unknown list type: " + type));
      console.log("Use 'sources' or 'categories'");
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red("Error listing " + type + ":"), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
