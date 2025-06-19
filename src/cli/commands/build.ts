// Build command implementation
import chalk from 'chalk';
import { FontDownloader } from '@/modules/download/FontDownloader.js';
import { FontSubsetter } from '@/modules/subset/FontSubsetter.js';
import { CSSGenerator } from '@/modules/css/CSSGenerator.js';
import { DocsGenerator } from '@/modules/docs/DocsGenerator.js';
import { ConfigManager } from '@/config/index.js';
import { PathUtils } from '@/utils/PathUtils.js';
import { CLIValidator } from '@/cli/utils/validation.js';
import { ArgsParser } from '@/cli/utils/args.js';
import type { CLICommand, CLIArgs, StandardOptions } from '@/cli/types.js';

export const buildCommand: CLICommand = {
  name: 'build',
  description: 'Complete build workflow: download, subset, css, docs',
  aliases: ['b'],

  async execute(args: CLIArgs): Promise<void> {
    console.log(chalk.bold.blue('🔨 Starting Build Process\n'));

    try {
      // Parse standard options
      const options = ArgsParser.parseStandardOptions(args);
      await validateBuildOptions(options);

      // Initialize services
      const fontDownloader = new FontDownloader();
      const fontSubsetter = new FontSubsetter(
        PathUtils.resolve(process.cwd(), 'downloads'),
        PathUtils.resolve(process.cwd(), options.outputDir),
        ConfigManager.load().fonts
      );
      const cssGenerator = new CSSGenerator();
      const docsGenerator = new DocsGenerator(ConfigManager.getBuildConfig());

      // Initialize services
      await fontSubsetter.init();
      await cssGenerator.init();

      // Execute build steps with granular control
      if (!options.skipDownload) {
        console.log(chalk.yellow('📋 Step 1: Downloading fonts...'));
        if (options.fontIds.length > 0) {
          await fontDownloader.downloadSpecific(options.fontIds);
        } else {
          await fontDownloader.downloadAll();
        }
      }

      if (!options.skipSubset) {
        console.log(chalk.yellow('📋 Step 2: Subsetting fonts...'));
        if (options.fontIds.length > 0) {
          await fontSubsetter.processSpecific(options.fontIds);
        } else {
          await fontSubsetter.processAll();
        }
      }

      if (!options.skipCSS) {
        console.log(chalk.yellow('📋 Step 3: Generating CSS...'));
        if (options.fontIds.length > 0) {
          await cssGenerator.generateSpecific(options.fontIds);
          // Regenerate unified CSS when processing specific fonts
          await cssGenerator.generateUnified();
        } else {
          await cssGenerator.generateAll();
        }
      }

      if (!options.skipDocs) {
        console.log(chalk.yellow('📋 Step 4: Generating documentation...'));
        await docsGenerator.generateDocumentation();
      }

      console.log(chalk.bold.green('\n🎉 Build completed successfully!'));
      console.log(chalk.gray(`Output directory: ${options.outputDir}`));
    } catch (error: unknown) {
      console.error(chalk.red('❌ Build failed:'), (error as Error).message);
      process.exit(1);
    }
  },
};

async function validateBuildOptions(options: StandardOptions): Promise<void> {
  // Validate font IDs if provided
  if (options.fontIds.length > 0) {
    const fontValidation = CLIValidator.validateFontIds(options.fontIds);
    if (!fontValidation.isValid) {
      console.error(chalk.red('Invalid font IDs:'));
      console.error(CLIValidator.formatErrors(fontValidation));
      process.exit(1);
    }
  }

  // Validate output directory
  const outputValidation = CLIValidator.validateOutputDir(options.outputDir);
  if (!outputValidation.isValid) {
    console.error(chalk.red('Invalid output directory:'));
    console.error(CLIValidator.formatErrors(outputValidation));
    process.exit(1);
  }
}
