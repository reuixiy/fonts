// v3.0 Main entry point - Using new modular architecture
import chalk from 'chalk';
import path from 'path';
import { URL } from 'url';

// New v3.0 imports
import { VersionChecker } from '@/modules/version/VersionChecker.js';
import { FontDownloader } from '@/modules/download/FontDownloader.js';
import { FontSubsetter } from '@/modules/subset/FontSubsetter.js';
import { CSSGenerator } from '@/modules/css/CSSGenerator.js';
import { DocsGenerator } from '@/modules/docs/DocsGenerator.js';
import { ServiceContainer } from '@/core/base/ServiceContainer.js';
import { ConfigManager } from '@/config/index.js';
import type { IVersionChecker } from '@/core/interfaces/IVersionChecker.js';
import type { IFontDownloader } from '@/core/interfaces/IFontDownloader.js';
import type { IFontSubsetter } from '@/core/interfaces/IFontSubsetter.js';
import type { ICSSGenerator } from '@/core/interfaces/ICSSGenerator.js';
import type { IDocsGenerator } from '@/core/interfaces/IDocsGenerator.js';

class FontWorkflowV3 {
  private serviceContainer: ServiceContainer;
  private versionChecker: IVersionChecker;
  private fontDownloader: IFontDownloader;
  private fontSubsetter: IFontSubsetter;
  private cssGenerator: ICSSGenerator;
  private docsGenerator: IDocsGenerator;

  constructor() {
    this.serviceContainer = ServiceContainer.getInstance();

    // Use new v3.0 modules
    this.versionChecker = new VersionChecker();
    this.fontDownloader = new FontDownloader();
    this.fontSubsetter = new FontSubsetter(
      path.join(process.cwd(), 'downloads'),
      path.join(process.cwd(), 'build'),
      ConfigManager.load().fonts
    );
    this.cssGenerator = new CSSGenerator();

    // Use new v3.0 DocsGenerator
    this.docsGenerator = new DocsGenerator(ConfigManager.getBuildConfig());

    // Register services in container
    this.serviceContainer.register('versionChecker', this.versionChecker);
    this.serviceContainer.register('fontDownloader', this.fontDownloader);
    this.serviceContainer.register('fontSubsetter', this.fontSubsetter);
    this.serviceContainer.register('cssGenerator', this.cssGenerator);
    this.serviceContainer.register('docsGenerator', this.docsGenerator);
  }

  async runFullWorkflow(): Promise<void> {
    console.log(
      chalk.bold.blue('🚀 Starting Full Font Processing Workflow (v3.0)\n')
    );

    try {
      // Initialize services
      await this.fontSubsetter.init();
      await this.cssGenerator.init();

      // Step 1: Check versions using new v3.0 VersionChecker
      console.log(chalk.bold.yellow('📋 Step 1: Checking font versions...'));
      const versionResult = await this.versionChecker.run();

      if (!versionResult.hasUpdates) {
        console.log(
          chalk.green('✅ All fonts are up to date. No processing needed.')
        );
        return;
      }

      // Step 2: Download fonts (legacy implementation)
      console.log(chalk.bold.yellow('\n📋 Step 2: Downloading fonts...'));
      await this.fontDownloader.downloadAll();

      // Step 3: Process fonts (using new v3.0 FontSubsetter)
      console.log(chalk.bold.yellow('\n📋 Step 3: Processing fonts...'));
      await this.fontSubsetter.processAll();

      // Step 4: Generate CSS (using new v3.0 CSSGenerator)
      console.log(chalk.bold.yellow('\n📋 Step 4: Generating CSS...'));
      await this.cssGenerator.generateAll();

      // Step 5: Generate documentation (license and README)
      console.log(
        chalk.bold.yellow('\n📋 Step 5: Generating documentation...')
      );
      await this.docsGenerator.generateDocumentation();

      console.log(
        chalk.bold.green('\n🎉 Full workflow completed successfully!')
      );
    } catch (error: unknown) {
      console.error(chalk.red('❌ Workflow failed:'), (error as Error).message);
      process.exit(1);
    }
  }

  async runBuildOnly(): Promise<void> {
    console.log(chalk.bold.blue('🚀 Starting Build-Only Workflow (v3.0)\n'));

    try {
      // Initialize services
      await this.fontSubsetter.init();
      await this.cssGenerator.init();

      // Step 1: Download fonts
      console.log(chalk.bold.yellow('📋 Step 1: Downloading fonts...'));
      await this.fontDownloader.downloadAll();

      // Step 2: Process fonts (using new v3.0 FontSubsetter)
      console.log(chalk.bold.yellow('\n📋 Step 2: Processing fonts...'));
      await this.fontSubsetter.processAll();

      // Step 3: Generate CSS (using new v3.0 CSSGenerator)
      console.log(chalk.bold.yellow('\n📋 Step 3: Generating CSS...'));
      await this.cssGenerator.generateAll();

      // Step 4: Generate documentation (license and README)
      console.log(
        chalk.bold.yellow('\n📋 Step 4: Generating documentation...')
      );
      await this.docsGenerator.generateDocumentation();

      console.log(
        chalk.bold.green('\n🎉 Build workflow completed successfully!')
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
      chalk.bold.blue(
        `🚀 Processing Specific Fonts (v3.0): ${fontIds.join(', ')}\n`
      )
    );

    try {
      // Initialize services
      await this.fontSubsetter.init();

      // Validate font IDs using new v3.0 config system
      const validation = ConfigManager.validateFontIds(fontIds);
      if (validation.invalid.length > 0) {
        throw new Error(`Invalid font IDs: ${validation.invalid.join(', ')}`);
      }

      // Step 1: Download specific fonts
      console.log(chalk.bold.yellow('📋 Step 1: Downloading fonts...'));
      await this.fontDownloader.downloadSpecific(fontIds);

      // Step 2: Process specific fonts (using new v3.0 FontSubsetter)
      console.log(chalk.bold.yellow('\n📋 Step 2: Processing fonts...'));
      await this.fontSubsetter.processSpecific(fontIds);

      // Step 3: Generate CSS for specific fonts (using new v3.0 CSSGenerator)
      console.log(chalk.bold.yellow('\n📋 Step 3: Generating CSS...'));
      await this.cssGenerator.generateSpecific(fontIds);

      // Step 4: Regenerate unified CSS
      console.log(chalk.bold.yellow('\n📋 Step 4: Updating unified CSS...'));
      await this.cssGenerator.generateUnified();

      // Step 5: Generate documentation (license and README)
      console.log(
        chalk.bold.yellow('\n📋 Step 5: Generating documentation...')
      );
      await this.docsGenerator.generateDocumentation();

      console.log(
        chalk.bold.green(
          '\n🎉 Specific font processing completed successfully!'
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
  const workflow = new FontWorkflowV3();
  const args = process.argv.slice(2);

  console.log(
    chalk.gray('🔧 Running with v3.0 Architecture (Fully Migrated!)\n')
  );

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
      chalk.cyan('  pnpm start                        # Full workflow')
    );
    console.log(
      chalk.cyan('  pnpm run build:fonts             # Build all fonts')
    );
    console.log(
      chalk.cyan('  pnpm run build:specific -- <ids> # Build specific fonts')
    );
    console.log(
      chalk.gray('\nAvailable font IDs: imingcp, lxgwwenkaitc, amstelvar')
    );
    console.log(chalk.gray('For more options: pnpm run cli:help'));
  }
}

// Run if called directly
if (import.meta.url === new URL(process.argv[1] ?? '', 'file:').href) {
  main();
}

export default FontWorkflowV3;
