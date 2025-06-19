// Subset command implementation
import chalk from 'chalk';
import { FontSubsetter } from '@/modules/subset/FontSubsetter.js';
import { ConfigManager } from '@/config/index.js';
import { PathUtils } from '@/utils/PathUtils.js';
import { CLIValidator } from '@/cli/utils/validation.js';
import { ArgsParser } from '@/cli/utils/args.js';
import type { CLICommand, CLIArgs } from '@/cli/types.js';

export const subsetCommand: CLICommand = {
  name: 'subset',
  description: 'Subset downloaded font files (optimize and chunk)',
  aliases: ['s'],

  async execute(args: CLIArgs): Promise<void> {
    console.log(chalk.bold.blue('⚙️ Subsetting Fonts\n'));

    try {
      // Parse subset options
      const options = parseSubsetOptions(args);
      await validateSubsetOptions(options);

      // Initialize font subsetter
      const fontSubsetter = new FontSubsetter(
        PathUtils.resolve(process.cwd(), options.inputDir),
        PathUtils.resolve(process.cwd(), options.outputDir),
        ConfigManager.load().fonts
      );

      await fontSubsetter.init();

      console.log(chalk.yellow('📋 Subsetting fonts...'));

      if (options.fontIds.length > 0) {
        await fontSubsetter.processSpecific(options.fontIds);
        console.log(
          chalk.bold.green(
            `\n🎉 Successfully subsetted ${options.fontIds.length} font(s)!`
          )
        );
      } else {
        await fontSubsetter.processAll();
        console.log(chalk.bold.green('\n🎉 Successfully subsetted all fonts!'));
      }

      console.log(chalk.gray(`Input directory: ${options.inputDir}`));
      console.log(chalk.gray(`Output directory: ${options.outputDir}`));
    } catch (error: unknown) {
      console.error(
        chalk.red('❌ Font subsetting failed:'),
        (error as Error).message
      );
      process.exit(1);
    }
  },
};

interface SubsetOptions {
  fontIds: string[];
  inputDir: string;
  outputDir: string;
}

function parseSubsetOptions(args: CLIArgs): SubsetOptions {
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

async function validateSubsetOptions(options: SubsetOptions): Promise<void> {
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
