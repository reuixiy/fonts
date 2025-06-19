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
        ],
      },
      {
        title: 'Examples',
        content: [
          '  # Most common usage:',
          `  pnpm run cli:build                   # Build all fonts`,
          `  pnpm run cli:build -- --fonts imingcp   # Build specific font`,
          `  pnpm run cli:check                   # Check for updates`,
          `  pnpm run cli:clean -- --all          # Clean everything`,
          '',
          '  # Direct CLI usage:',
          `  ${config.name} build --fonts imingcp      # Build specific font`,
          `  ${config.name} check                      # Check for updates`,
          `  ${config.name} clean --build              # Clean build artifacts`,
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
          '  --fonts <ids>     Comma-separated list of font IDs to process',
          '  --skip-download   Skip downloading, use existing files',
          '  --skip-css        Skip CSS generation',
          '  --skip-license    Skip documentation generation',
          '  --output <dir>    Output directory (default: build)',
        ],
      });
    } else if (command.name === 'check') {
      sections.push({
        title: 'Options',
        content: [
          '  --fonts <ids>     Comma-separated list of font IDs to check',
          '  --force          Force check even if cache is fresh',
          '  --cache-ttl <n>  Cache TTL in hours (default: 24)',
        ],
      });
    } else if (command.name === 'download') {
      // Override usage for download command
      sections[1] = {
        title: 'Usage',
        content: [
          `${config.name} ${command.name} [fontIds...]`,
          `${config.name} ${command.name} --fonts <ids>`,
        ],
      };
      sections.push({
        title: 'Options',
        content: [
          '  --fonts <ids>     Comma-separated list of font IDs to download',
          '  --output <dir>    Download directory (default: downloads)',
          '  --force          Force re-download existing files',
        ],
      });
    } else if (command.name === 'process') {
      sections.push({
        title: 'Options',
        content: [
          '  --fonts <ids>     Comma-separated list of font IDs to process',
          '  --input <dir>     Input directory (default: downloads)',
          '  --output <dir>    Output directory (default: build)',
        ],
      });
    } else if (command.name === 'css') {
      sections.push({
        title: 'Options',
        content: [
          '  --fonts <ids>     Comma-separated list of font IDs to generate CSS for',
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
