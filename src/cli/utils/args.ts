// CLI argument parsing utilities
import type { CLIArgs } from '@/cli/types.js';

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
}
