import chalk from "chalk";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

interface ConfigCommandOptions {
  get?: string;
  set?: string;
  list?: boolean;
}

interface Config {
  apiKey?: string;
  baseUrl?: string;
  defaultSource?: string;
  defaultSize?: number;
}

const CONFIG_DIR = path.join(os.homedir(), ".svg-api");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

async function loadConfig(): Promise<Config> {
  try {
    const data = await fs.readFile(CONFIG_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function saveConfig(config: Config): Promise<void> {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

export async function configCommand(options: ConfigCommandOptions): Promise<void> {
  try {
    if (options.list) {
      const config = await loadConfig();
      console.log(chalk.bold("\nCurrent configuration:\n"));
      
      for (const [key, value] of Object.entries(config)) {
        if (key === "apiKey" && typeof value === "string") {
          console.log("  " + key + ": " + chalk.gray("***" + value.slice(-4)));
        } else {
          console.log("  " + key + ": " + chalk.cyan(String(value)));
        }
      }
      
      console.log(chalk.gray("\nConfig file: " + CONFIG_FILE));
      return;
    }

    if (options.get) {
      const config = await loadConfig();
      const value = config[options.get as keyof Config];
      
      if (value === undefined) {
        console.log(chalk.yellow("Key '" + options.get + "' not set"));
      } else if (options.get === "apiKey" && typeof value === "string") {
        console.log("***" + value.slice(-4));
      } else {
        console.log(String(value));
      }
      return;
    }

    if (options.set) {
      const [key, ...valueParts] = options.set.split("=");
      const value = valueParts.join("=");
      
      if (!key || value === undefined) {
        console.error(chalk.red("Invalid format. Use: key=value"));
        process.exit(1);
      }
      
      const config = await loadConfig();
      
      // Parse value
      let parsedValue: string | number | boolean = value;
      if (value === "true") parsedValue = true;
      else if (value === "false") parsedValue = false;
      else if (!isNaN(Number(value))) parsedValue = Number(value);
      
      (config as Record<string, typeof parsedValue>)[key] = parsedValue;
      await saveConfig(config);
      
      console.log(chalk.green("Set " + key + " = " + String(parsedValue)));
      return;
    }

    console.log(chalk.yellow("Use --list, --get <key>, or --set <key=value>"));
  } catch (error) {
    console.error(chalk.red("Error managing config:"), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
