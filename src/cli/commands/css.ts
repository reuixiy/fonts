// CSS generation command implementation
import chalk from 'chalk';
import { CSSGenerator } from '@/modules/css/CSSGenerator.js';
import { ArgsParser } from '@/cli/utils/args.js';
import type { CLICommand, CLIArgs } from '@/cli/types.js';

export const cssCommand: CLICommand = {
  name: 'css',
  description: 'Generate CSS files from processed fonts',
  aliases: ['c'],

  async execute(args: CLIArgs): Promise<void> {
    console.log(chalk.bold.blue('🎨 Generating CSS Files\n'));

    try {
      // Parse CSS options
      const options = parseCSSOptions(args);

      // Initialize CSS generator
      const cssGenerator = new CSSGenerator();

      if (options.specific && options.fontIds.length > 0) {
        console.log(
          chalk.cyan(
            `Generating CSS for specific fonts: ${options.fontIds.join(', ')}`
          )
        );
        await cssGenerator.generateSpecific(options.fontIds);
      } else {
        console.log(chalk.cyan('Generating CSS for all processed fonts'));
        await cssGenerator.generateAll();
      }

      console.log(chalk.bold.green('\n🎉 CSS generation completed!'));
    } catch (error: unknown) {
      console.error(
        chalk.red('❌ CSS generation failed:'),
        (error as Error).message
      );
      process.exit(1);
    }
  },
};

interface CSSOptions {
  specific: boolean;
  fontIds: string[];
}

function parseCSSOptions(args: CLIArgs): CSSOptions {
  const fontsOption = ArgsParser.getOption(args, 'fonts');
  const fontIds = fontsOption ? fontsOption.split(' ') : [];

  return {
    specific: fontIds.length > 0,
    fontIds,
  };
}
