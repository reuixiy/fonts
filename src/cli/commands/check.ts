// Check command implementation
import chalk from 'chalk';
import { VersionChecker } from '@/modules/version/VersionChecker.js';
import { CLIValidator } from '@/cli/utils/validation.js';
import { ArgsParser } from '@/cli/utils/args.js';
import type { CLICommand, CLIArgs } from '@/cli/types.js';
import type { VersionCheckResult } from '@/types/workflow.js';

export const checkCommand: CLICommand = {
  name: 'check',
  description: 'Check for font version updates',
  aliases: ['c'],

  async execute(args: CLIArgs): Promise<void> {
    console.log(chalk.bold.blue('🔍 Checking for Updates\n'));

    try {
      // Parse check options
      const options = parseCheckOptions(args);
      await validateCheckOptions(options);

      // Initialize version checker
      const versionChecker = new VersionChecker();

      // Check for updates
      console.log(chalk.yellow('📋 Checking font versions...'));

      let updateResults: VersionCheckResult;
      if (options.fontIds.length > 0) {
        updateResults = await versionChecker.checkSpecific(options.fontIds);
      } else {
        updateResults = await versionChecker.run();
      }

      // Display results
      displayUpdateResults(updateResults);
    } catch (error: unknown) {
      console.error(
        chalk.red('❌ Version check failed:'),
        (error as Error).message
      );
      process.exit(1);
    }
  },
};

interface CheckOptions {
  fontIds: string[];
  force: boolean;
  cacheTtl: number;
}

function parseCheckOptions(args: CLIArgs): CheckOptions {
  const fontIds =
    ArgsParser.getOption(args, 'fonts')
      ?.split(',')
      .map((id) => id.trim()) ?? [];
  const cacheTtlStr = ArgsParser.getOption(args, 'cache-ttl') ?? '24';

  return {
    fontIds,
    force: ArgsParser.hasFlag(args, 'force'),
    cacheTtl: parseInt(cacheTtlStr, 10),
  };
}

async function validateCheckOptions(options: CheckOptions): Promise<void> {
  // Validate font IDs if provided
  if (options.fontIds.length > 0) {
    const fontValidation = CLIValidator.validateFontIds(options.fontIds);
    if (!fontValidation.isValid) {
      console.error(chalk.red('Invalid font IDs:'));
      console.error(CLIValidator.formatErrors(fontValidation));
      process.exit(1);
    }
  }

  // Validate cache TTL
  const ttlValidation = CLIValidator.validateCacheTtl(
    options.cacheTtl.toString()
  );
  if (!ttlValidation.isValid) {
    console.error(chalk.red('Invalid cache TTL:'));
    console.error(CLIValidator.formatErrors(ttlValidation));
    process.exit(1);
  }
}

function displayUpdateResults(results: VersionCheckResult): void {
  if (!results) {
    console.log(chalk.yellow('⚠️  No update information available'));
    return;
  }

  const { updatedFonts, hasUpdates } = results;

  if (hasUpdates && updatedFonts.length > 0) {
    console.log(
      chalk.bold.green(`\n🎉 Found ${updatedFonts.length} update(s):`)
    );
    for (const update of updatedFonts) {
      console.log(
        chalk.green(
          `  ✅ ${update.name}: ${update.oldVersion} → ${update.newVersion}`
        )
      );
    }
  } else {
    console.log(chalk.bold.green('\n✅ All fonts are up to date!'));
  }

  console.log(
    chalk.gray('\n💡 Use --force to bypass cache (feature coming soon)')
  );
}
