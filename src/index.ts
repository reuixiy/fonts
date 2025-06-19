// v3.0 Main entry point - Delegates to CLI for single source of truth
import chalk from 'chalk';
import { URL } from 'url';
import { CLI } from '@/cli/index.js';

/**
 * Main entry point for the font processing workflow
 * Delegates to CLI for all functionality while maintaining backwards compatibility
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const cli = new CLI();

  console.log(chalk.gray('🔧 Web Font Auto-Subsetting v3.0\n'));

  try {
    if (args.length === 0) {
      // Default: run check then build workflow
      await runFullWorkflow(cli);
    } else if (args[0] === '--build-only' || args[0] === '--force') {
      // Legacy support: build without version checking
      await cli.run(['build', '--force']);
    } else if (args[0] === '--fonts') {
      // Legacy support: process specific fonts
      await runSpecificFonts(cli, args.slice(1));
    } else {
      // Pass through to CLI for all other commands
      await cli.run(args);
    }
  } catch (error: unknown) {
    console.error(chalk.red('❌ Process failed:'), (error as Error).message);
    process.exit(1);
  }
}

/**
 * Run the full workflow: check versions then build
 */
async function runFullWorkflow(cli: CLI): Promise<void> {
  console.log(chalk.bold.blue('🚀 Starting Full Font Processing Workflow\n'));

  console.log(chalk.bold.yellow('📋 Step 1: Checking font versions...'));
  await cli.run(['check']);

  console.log(chalk.bold.yellow('\n📋 Step 2: Building fonts...'));
  await cli.run(['build']);

  console.log(chalk.bold.green('\n🎉 Full workflow completed successfully!'));
}

/**
 * Process specific fonts (legacy support)
 */
async function runSpecificFonts(cli: CLI, fontIds: string[]): Promise<void> {
  if (fontIds.length === 0) {
    console.error(chalk.red('❌ Please specify font IDs after --fonts'));
    console.log(
      chalk.yellow('Example: pnpm start -- --fonts "imingcp lxgwwenkaitc"')
    );
    process.exit(1);
  }
  await cli.run(['build', '--fonts', fontIds.join(' ')]);
}

// Run if called directly
if (import.meta.url === new URL(process.argv[1] ?? '', 'file:').href) {
  main();
}

export default main;
