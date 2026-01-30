import { SvgApi } from "@svg-api/sdk";
import chalk from "chalk";
import ora from "ora";
import fs from "node:fs/promises";
import path from "node:path";

interface DownloadCommandOptions {
  output: string;
  size?: string;
  color?: string;
  stroke?: string;
  format: string;
  flat?: boolean;
}

export async function downloadCommand(
  icons: string[],
  options: DownloadCommandOptions
): Promise<void> {
  const api = new SvgApi();
  const spinner = ora("Downloading icons...").start();
  
  try {
    // Ensure output directory exists
    await fs.mkdir(options.output, { recursive: true });
    
    const downloaded: string[] = [];
    const failed: Array<{ icon: string; error: string }> = [];

    for (const iconSpec of icons) {
      // Parse icon specification (format: "name" or "source:name")
      const [source, name] = iconSpec.includes(":")
        ? iconSpec.split(":")
        : [undefined, iconSpec];

      try {
        spinner.text = `Downloading ${name}...`;

        const iconData = await api.getIcon(name, {
          source,
          size: options.size ? parseInt(options.size, 10) : undefined,
          color: options.color,
          stroke: options.stroke ? parseFloat(options.stroke) : undefined,
        });

        // Determine output path
        let outputDir = options.output;
        if (!options.flat && source) {
          outputDir = path.join(outputDir, source);
          await fs.mkdir(outputDir, { recursive: true });
        }

        const filename = `${name}.svg`;
        const outputPath = path.join(outputDir, filename);

        // Write file
        if (typeof iconData === "string") {
          await fs.writeFile(outputPath, iconData, "utf-8");
        } else {
          await fs.writeFile(outputPath, iconData.svg, "utf-8");
        }

        downloaded.push(outputPath);
      } catch (error) {
        failed.push({
          icon: iconSpec,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    spinner.stop();

    // Report results
    if (downloaded.length > 0) {
      console.log(chalk.green("Downloaded " + downloaded.length + " icons:"));
      for (const file of downloaded) {
        console.log("  " + chalk.gray(file));
      }
    }

    if (failed.length > 0) {
      console.log(chalk.red("\nFailed to download " + failed.length + " icons:"));
      for (const { icon, error } of failed) {
        console.log("  " + chalk.yellow(icon) + ": " + error);
      }
    }
  } catch (error) {
    spinner.stop();
    console.error(chalk.red("Error downloading icons:"), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
