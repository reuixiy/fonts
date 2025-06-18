// Process command implementation
import chalk from 'chalk';
import { FontProcessor } from '@/modules/processing/FontProcessor.js';
import { ConfigManager } from '@/config/index.js';
import { PathUtils } from '@/utils/PathUtils.js';
import { CLIValidator } from '@/cli/utils/validation.js';
import { ArgsParser } from '@/cli/utils/args.js';
import type { CLICommand, CLIArgs } from '@/cli/types.js';

export const processCommand: CLICommand = {
  name: 'process',
  description: 'Process downloaded font files (subset, optimize)',
  aliases: ['p'],

  async execute(args: CLIArgs): Promise<void> {
    console.log(chalk.bold.blue('⚙️ Processing Fonts\n'));

    try {
      // Parse process options
      const options = parseProcessOptions(args);
      await validateProcessOptions(options);

      // Initialize font processor
      const fontProcessor = new FontProcessor(
        PathUtils.resolve(process.cwd(), options.inputDir),
        PathUtils.resolve(process.cwd(), options.outputDir),
        ConfigManager.load().fonts
      );

      await fontProcessor.init();

      // Process fonts
      console.log(chalk.yellow('📋 Processing fonts...'));

      if (options.fontIds.length > 0) {
        await fontProcessor.processSpecific(options.fontIds);
        console.log(
          chalk.bold.green(
            `\n🎉 Successfully processed ${options.fontIds.length} font(s)!`
          )
        );
      } else {
        await fontProcessor.processAll();
        console.log(chalk.bold.green('\n🎉 Successfully processed all fonts!'));
      }

      console.log(chalk.gray(`Input directory: ${options.inputDir}`));
      console.log(chalk.gray(`Output directory: ${options.outputDir}`));
    } catch (error: unknown) {
      console.error(
        chalk.red('❌ Font processing failed:'),
        (error as Error).message
      );
      process.exit(1);
    }
  },
};

interface ProcessOptions {
  fontIds: string[];
  inputDir: string;
  outputDir: string;
}

function parseProcessOptions(args: CLIArgs): ProcessOptions {
  const fontIds =
    ArgsParser.getOption(args, 'fonts')
      ?.split(',')
      .map((id) => id.trim()) ?? [];
  const inputDir = ArgsParser.getOption(args, 'input') ?? 'downloads';
  const outputDir = ArgsParser.getOption(args, 'output') ?? 'build';

  return {
    fontIds,
    inputDir,
    outputDir,
  };
}

async function validateProcessOptions(options: ProcessOptions): Promise<void> {
  // Validate font IDs if provided
  if (options.fontIds.length > 0) {
    const fontValidation = CLIValidator.validateFontIds(options.fontIds);
    if (!fontValidation.isValid) {
      console.error(chalk.red('Invalid font IDs:'));
      console.error(CLIValidator.formatErrors(fontValidation));
      process.exit(1);
    }
  }

  // Validate input directory
  const inputValidation = CLIValidator.validateOutputDir(options.inputDir);
  if (!inputValidation.isValid) {
    console.error(chalk.red('Invalid input directory:'));
    console.error(CLIValidator.formatErrors(inputValidation));
    process.exit(1);
  }

  // Validate output directory
  const outputValidation = CLIValidator.validateOutputDir(options.outputDir);
  if (!outputValidation.isValid) {
    console.error(chalk.red('Invalid output directory:'));
    console.error(CLIValidator.formatErrors(outputValidation));
    process.exit(1);
  }
}
