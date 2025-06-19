// CLI argument parsing utilities
import type {
  CLIArgs,
  StandardOptions,
  DocsOptions,
  CleanOptions,
  BasicOptions,
} from '@/cli/types.js';

export class ArgsParser {
  /**
   * Parse command line arguments
   */
  static parse(args: string[]): CLIArgs {
    const result: CLIArgs = {
      flags: {},
      options: {},
      positional: [],
      raw: args,
    };

    let i = 0;
    while (i < args.length) {
      const arg = args[i];

      if (arg.startsWith('--')) {
        // Long flag or option
        const name = arg.slice(2);
        const nextArg = args[i + 1];

        if (nextArg && !nextArg.startsWith('-')) {
          // Option with value
          result.options[name] = nextArg;
          i += 2;
        } else {
          // Flag
          result.flags[name] = true;
          i += 1;
        }
      } else if (arg.startsWith('-') && arg.length > 1) {
        // Short flag(s)
        const flags = arg.slice(1);
        for (const flag of flags) {
          result.flags[flag] = true;
        }
        i += 1;
      } else {
        // Positional argument
        if (!result.command && i === 0) {
          result.command = arg;
        } else {
          result.positional.push(arg);
        }
        i += 1;
      }
    }

    return result;
  }

  /**
   * Check if help was requested
   */
  static isHelpRequested(args: CLIArgs): boolean {
    return args.flags.help || args.flags.h || args.options.help !== undefined;
  }

  /**
   * Check if version was requested
   */
  static isVersionRequested(args: CLIArgs): boolean {
    return (
      args.flags.version || args.flags.v || args.options.version !== undefined
    );
  }

  /**
   * Get option value with default
   */
  static getOption(
    args: CLIArgs,
    name: string,
    defaultValue?: string
  ): string | undefined {
    return args.options[name] ?? defaultValue;
  }

  /**
   * Check if flag is set
   */
  static hasFlag(args: CLIArgs, name: string): boolean {
    return args.flags[name] === true;
  }

  /**
   * Get all positional arguments after a certain index
   */
  static getPositionalFrom(args: CLIArgs, index: number): string[] {
    return args.positional.slice(index);
  }

  /**
   * Parse font IDs from string with flexible separators
   * Supports both comma and space separation
   */
  static parseFontIds(fontString: string): string[] {
    return fontString
      .split(/[,\s]+/) // Split by comma or space
      .map((id) => id.trim()) // Remove whitespace
      .filter((id) => id.length > 0); // Filter empty strings
  }

  /**
   * Parse standard options used across all commands
   */
  static parseStandardOptions(args: CLIArgs): StandardOptions {
    const fontOption = ArgsParser.getOption(args, 'fonts');
    const fontIds = fontOption ? ArgsParser.parseFontIds(fontOption) : [];
    const outputDir = ArgsParser.getOption(args, 'output') ?? 'build';

    return {
      fontIds,
      outputDir,
      skipDownload: ArgsParser.hasFlag(args, 'skip-download'),
      skipSubset: ArgsParser.hasFlag(args, 'skip-subset'),
      skipCSS: ArgsParser.hasFlag(args, 'skip-css'),
      skipDocs: ArgsParser.hasFlag(args, 'skip-docs'),
      force: ArgsParser.hasFlag(args, 'force'),
    };
  }

  /**
   * Parse docs-specific options
   */
  static parseDocsOptions(args: CLIArgs): DocsOptions {
    // Check specific flags
    const licenseOnly = ArgsParser.hasFlag(args, 'license-only');
    const readmeOnly = ArgsParser.hasFlag(args, 'readme-only');

    // By default, generate both unless specified otherwise
    let includeLicense = true;
    let includeReadme = true;

    if (licenseOnly) {
      includeReadme = false;
    } else if (readmeOnly) {
      includeLicense = false;
    }

    const validateLicenses = !ArgsParser.hasFlag(args, 'no-validate');
    const includeCompliance = !ArgsParser.hasFlag(args, 'no-compliance');
    const outputDir = ArgsParser.getOption(args, 'output') ?? 'build';

    return {
      outputDir,
      includeLicense,
      includeReadme,
      validateLicenses,
      includeCompliance,
      force: ArgsParser.hasFlag(args, 'force'),
    };
  }

  /**
   * Parse clean-specific options
   */
  static parseCleanOptions(args: CLIArgs): CleanOptions {
    const all = ArgsParser.hasFlag(args, 'all');

    return {
      cleanBuild: all || ArgsParser.hasFlag(args, 'build'),
      cleanDownloads: all || ArgsParser.hasFlag(args, 'downloads'),
      cleanCache: all || ArgsParser.hasFlag(args, 'cache'),
      cleanDeps: all || ArgsParser.hasFlag(args, 'deps'),
      force: ArgsParser.hasFlag(args, 'force'),
    };
  }

  /**
   * Parse basic options (subset of StandardOptions)
   */
  static parseBasicOptions(args: CLIArgs): BasicOptions {
    const fontOption = ArgsParser.getOption(args, 'fonts');
    const fontIds = fontOption ? ArgsParser.parseFontIds(fontOption) : [];
    const outputDir = ArgsParser.getOption(args, 'output') ?? 'build';

    return {
      fontIds,
      outputDir,
      force: ArgsParser.hasFlag(args, 'force'),
    };
  }
}
