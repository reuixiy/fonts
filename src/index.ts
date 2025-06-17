import chalk from 'chalk';

import CSSGenerator from '@scripts/generate-css.js';
import LicenseGenerator from '@scripts/generate-license.js';
import FontDownloader from '@scripts/download-fonts.js';
import FontSubset from '@/fontSubset.js';
import VersionChecker from '@/versionChecker.js';
import type { VersionCheckResult } from '@/types.js';

class FontWorkflow {
  private versionChecker: VersionChecker;
  private fontDownloader: FontDownloader;
  private fontSubset: FontSubset;
  private cssGenerator: CSSGenerator;
  private licenseGenerator: LicenseGenerator;

  constructor() {
    this.versionChecker = new VersionChecker();
    this.fontDownloader = new FontDownloader();
    this.fontSubset = new FontSubset();
    this.cssGenerator = new CSSGenerator();
    this.licenseGenerator = new LicenseGenerator();
  }

  async runFullWorkflow(): Promise<void> {
    console.log(
      chalk.bold.blue('🚀 Starting Full Font Processing Workflow\\n')
    );

    try {
      // Step 1: Check versions
      console.log(chalk.bold.yellow('📋 Step 1: Checking font versions...'));
      const versionResult =
        (await this.versionChecker.run()) as VersionCheckResult;

      if (!versionResult.hasUpdates) {
        console.log(
          chalk.green('✅ All fonts are up to date. No processing needed.')
        );
        return;
      }

      // Step 2: Download fonts
      console.log(chalk.bold.yellow('\\n📋 Step 2: Downloading fonts...'));
      await this.fontDownloader.downloadAll();

      // Step 3: Process fonts
      console.log(chalk.bold.yellow('\\n📋 Step 3: Processing fonts...'));
      await this.fontSubset.processAll();

      // Step 4: Generate CSS
      console.log(chalk.bold.yellow('\\n📋 Step 4: Generating CSS...'));
      await this.cssGenerator.generateAll();

      // Step 5: Generate license information
      console.log(
        chalk.bold.yellow('\\n📋 Step 5: Generating license information...')
      );
      await this.licenseGenerator.generateLicenseFile();

      console.log(
        chalk.bold.green('\\n🎉 Full workflow completed successfully!')
      );
    } catch (error: unknown) {
      console.error(chalk.red('❌ Workflow failed:'), (error as Error).message);
      process.exit(1);
    }
  }

  async runBuildOnly() {
    console.log(chalk.bold.blue('🚀 Starting Build-Only Workflow\\n'));

    try {
      // Step 1: Download fonts
      console.log(chalk.bold.yellow('📋 Step 1: Downloading fonts...'));
      await this.fontDownloader.downloadAll();

      // Step 2: Process fonts
      console.log(chalk.bold.yellow('\\n📋 Step 2: Processing fonts...'));
      await this.fontSubset.processAll();

      // Step 3: Generate CSS
      console.log(chalk.bold.yellow('\\n📋 Step 3: Generating CSS...'));
      await this.cssGenerator.generateAll();

      // Step 4: Generate license information
      console.log(
        chalk.bold.yellow('\\n📋 Step 4: Generating license information...')
      );
      await this.licenseGenerator.generateLicenseFile();

      console.log(
        chalk.bold.green('\\n🎉 Build workflow completed successfully!')
      );
    } catch (error: unknown) {
      console.error(
        chalk.red('❌ Build workflow failed:'),
        (error as Error).message
      );
      process.exit(1);
    }
  }

  async runSpecificFonts(fontIds: string[]): Promise<void> {
    console.log(
      chalk.bold.blue(`🚀 Processing Specific Fonts: ${fontIds.join(', ')}\\n`)
    );

    try {
      // Step 1: Download specific fonts
      console.log(chalk.bold.yellow('📋 Step 1: Downloading fonts...'));
      await this.fontDownloader.downloadSpecific(fontIds);

      // Step 2: Process specific fonts
      console.log(chalk.bold.yellow('\\n📋 Step 2: Processing fonts...'));
      await this.fontSubset.processSpecific(fontIds);

      // Step 3: Generate CSS for specific fonts
      console.log(chalk.bold.yellow('\\n📋 Step 3: Generating CSS...'));
      await this.cssGenerator.generateSpecific(fontIds);

      // Step 4: Regenerate unified CSS
      console.log(chalk.bold.yellow('\\n📋 Step 4: Updating unified CSS...'));
      await this.cssGenerator.generateAll();

      // Step 5: Generate license information
      console.log(
        chalk.bold.yellow('\\n📋 Step 5: Generating license information...')
      );
      await this.licenseGenerator.generateLicenseFile();

      console.log(
        chalk.bold.green(
          '\\n🎉 Specific font processing completed successfully!'
        )
      );
    } catch (error: unknown) {
      console.error(
        chalk.red('❌ Specific font processing failed:'),
        (error as Error).message
      );
      process.exit(1);
    }
  }
}

// Command line interface
async function main() {
  const workflow = new FontWorkflow();
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // No arguments - run full workflow with version checking
    await workflow.runFullWorkflow();
  } else if (args[0] === '--build-only' || args[1] === '--build-only') {
    // Build without version checking (handle both cases)
    await workflow.runBuildOnly();
  } else if (args[0] === '--fonts' || args[1] === '--fonts') {
    // Process specific fonts (handle both cases)
    const fontArgsStart = args.indexOf('--fonts') + 1;
    const fontIds = args.slice(fontArgsStart);
    if (fontIds.length === 0) {
      console.error(chalk.red('❌ Please specify font IDs after --fonts'));
      console.log(
        chalk.yellow('Example: pnpm start -- --fonts imingcp lxgwwenkaitc')
      );
      process.exit(1);
    }
    await workflow.runSpecificFonts(fontIds);
  } else {
    console.log(chalk.yellow('Usage:'));
    console.log(
      chalk.cyan(
        '  pnpm start                    # Full workflow with version checking'
      )
    );
    console.log(
      chalk.cyan(
        '  pnpm start -- --build-only   # Build all fonts without version checking'
      )
    );
    console.log(
      chalk.cyan('  pnpm start -- --fonts <ids>  # Process specific fonts')
    );
    console.log(
      chalk.gray('\\nAvailable font IDs: imingcp, lxgwwenkaitc, amstelvar')
    );
  }
}

// Run if called directly
if (import.meta.url === new URL(process.argv[1] ?? '', 'file:').href) {
  main();
}

export default FontWorkflow;
