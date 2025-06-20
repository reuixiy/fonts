// CLI entry point
import chalk from 'chalk';
import { readFile } from 'node:fs/promises';
import { PathUtils } from '@/utils/index.js';
import { ArgsParser } from '@/cli/utils/args.js';
import { HelpGenerator } from '@/cli/utils/help.js';
import { CLIValidator } from '@/cli/utils/validation.js';
import { buildCommand } from '@/cli/commands/build.js';
import { checkCommand } from '@/cli/commands/check.js';
import { downloadCommand } from '@/cli/commands/download.js';
import { subsetCommand } from '@/cli/commands/subset.js';
import { cssCommand } from '@/cli/commands/css.js';
import { cleanCommand } from '@/cli/commands/clean.js';
import { docsCommand } from '@/cli/commands/docs.js';
import type { CLIConfig, CLIArgs } from '@/cli/types.js';

export class CLI {
  private config: CLIConfig;

  constructor() {
    this.config = {
      name: 'fonts',
      version: '4.0.0',
      description: 'Web font auto-subsetting workflow tool',
      commands: [
        checkCommand,
        buildCommand,
        downloadCommand,
        subsetCommand,
        cssCommand,
        docsCommand,
        cleanCommand,
      ],
    };
  }

  async run(argv: string[] = process.argv.slice(2)): Promise<void> {
    try {
      const args = ArgsParser.parse(argv);

      // Handle version request
      if (ArgsParser.isVersionRequested(args)) {
        await this.showVersion();
        return;
      }

      // Handle help request or no command
      if (ArgsParser.isHelpRequested(args) || !args.command) {
        this.showHelp(args.command);
        return;
      }

      // Validate and execute command
      await this.executeCommand(args);
    } catch (error: unknown) {
      this.handleError(error as Error);
    }
  }

  private async showVersion(): Promise<void> {
    try {
      // Try to read version from package.json
      const packagePath = PathUtils.resolve(process.cwd(), 'package.json');
      const packageContent = await readFile(packagePath, 'utf-8');
      const packageData = JSON.parse(packageContent) as { version?: string };

      const version = packageData.version ?? this.config.version;
      console.log(`${this.config.name} v${version}`);
    } catch {
      // Fallback to config version
      console.log(`${this.config.name} v${this.config.version}`);
    }
  }

  private showHelp(commandName?: string): void {
    if (commandName) {
      console.log(HelpGenerator.generateForCommand(this.config, commandName));
    } else {
      console.log(HelpGenerator.generate(this.config));
    }
  }

  private async executeCommand(args: CLIArgs): Promise<void> {
    const commandName = args.command!;

    // Validate command exists
    const allCommandNames = this.getAllCommandNames();
    const validation = CLIValidator.validateCommand(
      commandName,
      allCommandNames
    );

    if (!validation.isValid) {
      console.error(
        HelpGenerator.generateError(
          validation.errors[0],
          validation.warnings[0]
        )
      );
      process.exit(1);
    }

    // Find and execute command
    const command = this.findCommand(commandName);
    if (!command) {
      console.error(
        HelpGenerator.generateError(
          `Command implementation not found: ${commandName}`
        )
      );
      process.exit(1);
    }

    await command.execute(args);
  }

  private findCommand(name: string) {
    return this.config.commands.find(
      (cmd) => cmd.name === name || cmd.aliases?.includes(name)
    );
  }

  private getAllCommandNames(): string[] {
    const names: string[] = [];
    for (const command of this.config.commands) {
      names.push(command.name);
      if (command.aliases) {
        names.push(...command.aliases);
      }
    }
    return names;
  }

  private handleError(error: Error): void {
    console.error(chalk.red('❌ An unexpected error occurred:'));
    console.error(chalk.red(error.message));

    if (process.env.NODE_ENV === 'development') {
      console.error(chalk.gray('\nStack trace:'));
      console.error(chalk.gray(error.stack ?? 'No stack trace available'));
    }

    process.exit(1);
  }
}

// CLI entry point for direct execution
export async function main(): Promise<void> {
  const cli = new CLI();
  await cli.run();
}

// Export for programmatic use
export { buildCommand, checkCommand, subsetCommand, cleanCommand };
export type { CLICommand, CLIArgs, CLIConfig } from '@/cli/types.js';
