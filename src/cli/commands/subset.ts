// Subset command implementation
import chalk from 'chalk';
import { FontSubsetter } from '@/modules/subset/FontSubsetter.js';
import { ConfigManager } from '@/config/index.js';
import { PathUtils } from '@/utils/PathUtils.js';
import { CLIValidator } from '@/cli/utils/validation.js';
import { ArgsParser } from '@/cli/utils/args.js';
import type { CLICommand, CLIArgs, StandardOptions } from '@/cli/types.js';

export const subsetCommand: CLICommand = {
  name: 'subset',
  description: 'Subset downloaded font files (optimize and chunk)',
  aliases: ['s'],

  async execute(args: CLIArgs): Promise<void> {
    console.log(chalk.bold.blue('⚙️ Subsetting Fonts\n'));

    try {
      // Parse standard options
      const options = ArgsParser.parseStandardOptions(args);
      // Use downloads as input, build as output by default
      const subsetOptions = {
        ...options,
        inputDir: 'downloads',
        outputDir: options.outputDir,
      };
      await validateSubsetOptions(subsetOptions);

      // Initialize font subsetter
      const fontSubsetter = new FontSubsetter(
        PathUtils.resolve(process.cwd(), subsetOptions.inputDir),
        PathUtils.resolve(process.cwd(), subsetOptions.outputDir),
        ConfigManager.load().fonts
      );

      await fontSubsetter.init();

      console.log(chalk.yellow('📋 Subsetting fonts...'));

      if (subsetOptions.fontIds.length > 0) {
        await fontSubsetter.processSpecific(subsetOptions.fontIds);
        console.log(
          chalk.bold.green(
            `\n🎉 Successfully subsetted ${subsetOptions.fontIds.length} font(s)!`
          )
        );
      } else {
        await fontSubsetter.processAll();
        console.log(chalk.bold.green('\n🎉 Successfully subsetted all fonts!'));
      }

      console.log(chalk.gray(`Input directory: ${subsetOptions.inputDir}`));
      console.log(chalk.gray(`Output directory: ${subsetOptions.outputDir}`));
    } catch (error: unknown) {
      console.error(
        chalk.red('❌ Font subsetting failed:'),
        (error as Error).message
      );
      process.exit(1);
    }
  },
};

async function validateSubsetOptions(
  options: StandardOptions & { inputDir: string }
): Promise<void> {
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
