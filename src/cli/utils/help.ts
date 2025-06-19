// Help text generation utilities
import chalk from 'chalk';
import type { CLIConfig, HelpSection } from '@/cli/types.js';

export class HelpGenerator {
  /**
   * Generate main help text
   */
  static generate(config: CLIConfig): string {
    const sections: HelpSection[] = [
      {
        title: 'Description',
        content: [config.description],
      },
      {
        title: 'Usage',
        content: [
          `${config.name} [command] [options]`,
          `${config.name} --help`,
          `${config.name} --version`,
        ],
      },
      {
        title: 'Commands',
        content: config.commands.map((cmd) => {
          const aliases = cmd.aliases ? ` (${cmd.aliases.join(', ')})` : '';
          return `  ${chalk.cyan(cmd.name)}${aliases}  ${cmd.description}`;
        }),
      },
      {
        title: 'Global Options',
        content: [
          '  --help, -h     Show help information',
          '  --version, -v  Show version information',
          '  --verbose      Enable verbose output',
          '  --quiet        Suppress non-error output',
          '  --force        Force build (skip version check)',
        ],
      },
      {
        title: 'Examples',
        content: [
          '  # Most common usage:',
          `  pnpm run cli:build                      # Build all fonts`,
          `  pnpm run cli:build --fonts imingcp   # Build specific font`,
          `  pnpm run cli:check                      # Check for updates`,
          `  pnpm run cli:clean --all             # Clean everything`,
          '',
          '  # Direct CLI usage:',
          `  ${config.name} build --fonts "imingcp lxgwwenkaitc"  # Build multiple fonts`,
          `  ${config.name} check --fonts imingcp               # Check specific font`,
          `  ${config.name} clean --build                       # Clean build artifacts`,
          `  ${config.name} --force                             # Force build without version check`,
          `  ${config.name} --force --fonts amstelvar           # Force build specific font`,
          '',
          '  # Font IDs support both formats:',
          '  --fonts "imingcp lxgwwenkaitc"    # Space-separated',
          '  --fonts imingcp,lxgwwenkaitc      # Comma-separated',
        ],
      },
    ];

    return this.formatSections(config.name, config.version, sections);
  }

  /**
   * Generate command-specific help
   */
  static generateForCommand(config: CLIConfig, commandName: string): string {
    const command = config.commands.find(
      (cmd) => cmd.name === commandName || cmd.aliases?.includes(commandName)
    );

    if (!command) {
      return (
        chalk.red(`Unknown command: ${commandName}\n\n`) + this.generate(config)
      );
    }

    const sections: HelpSection[] = [
      {
        title: 'Description',
        content: [command.description],
      },
      {
        title: 'Usage',
        content: [`${config.name} ${command.name} [options]`],
      },
    ];

    // Add command-specific options based on command name
    if (command.name === 'build') {
      sections.push({
        title: 'Options',
        content: [
          '  --fonts <ids>     Space or comma-separated font IDs to process',
          '  --output <dir>    Output directory (default: build)',
          '  --skip-download   Skip downloading fonts',
          '  --skip-subset     Skip font subsetting',
          '  --skip-css        Skip CSS generation',
          '  --skip-docs       Skip documentation generation',
          '  --force           Force execution (skip version check)',
        ],
      });
    } else if (command.name === 'check') {
      sections.push({
        title: 'Options',
        content: [
          '  --fonts <ids>     Space or comma-separated font IDs to check',
          '  --force           Force check (bypass cache)',
        ],
      });
    } else if (command.name === 'download') {
      sections.push({
        title: 'Options',
        content: [
          '  --fonts <ids>     Space or comma-separated font IDs to download',
          '  --output <dir>    Download directory (default: downloads)',
          '  --force           Force re-download existing files',
        ],
      });
    } else if (command.name === 'subset') {
      sections.push({
        title: 'Options',
        content: [
          '  --fonts <ids>     Space or comma-separated font IDs to subset',
          '  --output <dir>    Output directory (default: build)',
          '  --force           Force re-processing',
        ],
      });
    } else if (command.name === 'css') {
      sections.push({
        title: 'Options',
        content: [
          '  --fonts <ids>     Space or comma-separated font IDs for CSS generation',
          '  --output <dir>    Output directory (default: build)',
        ],
      });
    } else if (command.name === 'docs') {
      sections.push({
        title: 'Options',
        content: [
          '  --output <dir>    Output directory (default: build)',
          '  --license-only    Generate only license files (LICENSE.md, LICENSE.json)',
          '  --readme-only     Generate only build README.md',
          '  --no-validate     Skip license validation',
          '  --no-compliance   Skip compliance checking',
        ],
      });
    } else if (command.name === 'clean') {
      sections.push({
        title: 'Options',
        content: [
          '  --all            Clean all targets (build, dist, downloads, cache)',
          '  --build          Clean build and dist output directories',
          '  --downloads      Clean downloaded font files',
          '  --cache          Clean version cache files',
          '  --deps           Clean node_modules directory',
          '  --force          Skip confirmation prompt',
        ],
      });
    }

    return this.formatSections(config.name, config.version, sections);
  }

  /**
   * Format help sections
   */
  private static formatSections(
    name: string,
    version: string,
    sections: HelpSection[]
  ): string {
    const header = `${chalk.bold.blue(name)} ${chalk.gray(`v${version}`)}\n`;

    const content = sections
      .map((section) => {
        const title = chalk.bold.yellow(`${section.title}:`);
        const lines = section.content.join('\n');
        return `${title}\n${lines}`;
      })
      .join('\n\n');

    return header + content + '\n';
  }

  /**
   * Generate error message with help hint
   */
  static generateError(message: string, suggestion?: string): string {
    let output = chalk.red(`Error: ${message}\n`);

    if (suggestion) {
      output += chalk.yellow(`Suggestion: ${suggestion}\n`);
    }

    output += chalk.gray('Use --help for more information.\n');

    return output;
  }
}
