// Build command implementation
import chalk from 'chalk';
import { FontDownloader } from '@/modules/download/FontDownloader.js';
import { FontProcessor } from '@/modules/processing/FontProcessor.js';
import { CSSGenerator } from '@/modules/css/CSSGenerator.js';
import { LicenseGenerator } from '@/modules/license/LicenseGenerator.js';
import { ConfigManager } from '@/config/index.js';
import { PathUtils } from '@/utils/PathUtils.js';
import { CLIValidator } from '@/cli/utils/validation.js';
import { ArgsParser } from '@/cli/utils/args.js';
import type { CLICommand, CLIArgs } from '@/cli/types.js';

export const buildCommand: CLICommand = {
  name: 'build',
  description:
    'Build font files with processing, CSS generation, and license creation',
  aliases: ['b'],

  async execute(args: CLIArgs): Promise<void> {
    console.log(chalk.bold.blue('🔨 Starting Build Process\n'));

    try {
      // Parse build options
      const options = parseBuildOptions(args);
      await validateBuildOptions(options);

      // Initialize services
      const fontDownloader = new FontDownloader();
      const fontProcessor = new FontProcessor(
        PathUtils.resolve(process.cwd(), 'downloads'),
        PathUtils.resolve(process.cwd(), options.outputDir),
        ConfigManager.load().fonts
      );
      const cssGenerator = new CSSGenerator();
      const licenseGenerator = new LicenseGenerator(
        ConfigManager.getBuildConfig()
      );

      // Initialize services
      await fontProcessor.init();
      await cssGenerator.init();

      // Execute build steps
      if (!options.skipDownload) {
        console.log(chalk.yellow('📋 Step 1: Downloading fonts...'));
        if (options.fontIds.length > 0) {
          await fontDownloader.downloadSpecific(options.fontIds);
        } else {
          await fontDownloader.downloadAll();
        }
      }

      console.log(chalk.yellow('📋 Step 2: Processing fonts...'));
      if (options.fontIds.length > 0) {
        await fontProcessor.processSpecific(options.fontIds);
      } else {
        await fontProcessor.processAll();
      }

      if (!options.skipCSS) {
        console.log(chalk.yellow('📋 Step 3: Generating CSS...'));
        await cssGenerator.generateAll();
      }

      if (!options.skipLicense) {
        console.log(
          chalk.yellow('📋 Step 4: Generating license information...')
        );
        await licenseGenerator.generateLicenseFile({
          outputDir: options.outputDir,
        });
      }

      console.log(chalk.bold.green('\n🎉 Build completed successfully!'));
      console.log(chalk.gray(`Output directory: ${options.outputDir}`));
    } catch (error: unknown) {
      console.error(chalk.red('❌ Build failed:'), (error as Error).message);
      process.exit(1);
    }
  },
};

interface BuildOptions {
  fontIds: string[];
  outputDir: string;
  skipDownload: boolean;
  skipCSS: boolean;
  skipLicense: boolean;
}

function parseBuildOptions(args: CLIArgs): BuildOptions {
  const fontIds =
    ArgsParser.getOption(args, 'fonts')
      ?.split(',')
      .map((id) => id.trim()) ?? [];
  const outputDir = ArgsParser.getOption(args, 'output') ?? 'build';

  return {
    fontIds,
    outputDir,
    skipDownload: ArgsParser.hasFlag(args, 'skip-download'),
    skipCSS: ArgsParser.hasFlag(args, 'skip-css'),
    skipLicense: ArgsParser.hasFlag(args, 'skip-license'),
  };
}

async function validateBuildOptions(options: BuildOptions): Promise<void> {
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
