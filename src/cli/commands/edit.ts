// Edit command implementation
import chalk from 'chalk';
import { FontEditor } from '@/modules/edit/FontEditor.js';
import { CLIValidator } from '@/cli/utils/validation.js';
import { ArgsParser } from '@/cli/utils/args.js';
import type { CLICommand, CLIArgs, StandardOptions } from '@/cli/types.js';

export const editCommand: CLICommand = {
  name: 'edit',
  description: 'Run Python scripts on downloaded fonts (e.g., halt-fix.py)',
  aliases: ['e'],

  async execute(args: CLIArgs): Promise<void> {
    console.log(chalk.bold.blue('🔧 Editing Fonts\n'));

    try {
      // Parse standard options
      const options = ArgsParser.parseStandardOptions(args);
      await validateEditOptions(options);

      // Initialize font editor
      const fontEditor = new FontEditor();

      // Edit fonts
      console.log(chalk.yellow('📋 Running font editing scripts...'));

      if (options.fontIds.length > 0) {
        await fontEditor.editSpecific(options.fontIds);
        console.log(
          chalk.bold.green(
            `\n🎉 Successfully edited ${options.fontIds.length} font(s)!`
          )
        );
        console.log(chalk.gray(`Fonts: ${options.fontIds.join(', ')}`));
      } else {
        await fontEditor.editAll();
        console.log(chalk.bold.green('\n🎉 Successfully edited all fonts!'));
      }

      console.log(
        chalk.gray('Edit scripts run on fonts in the downloads directory')
      );
    } catch (error: unknown) {
      console.error(
        chalk.red('❌ Font editing failed:'),
        (error as Error).message
      );
      process.exit(1);
    }
  },
};

async function validateEditOptions(options: StandardOptions): Promise<void> {
  // Basic validation
  await CLIValidator.validateFontIds(options.fontIds);

  // Check if downloads directory exists
  if (options.fontIds.length > 0) {
    console.log(
      chalk.gray(`Will edit specific fonts: ${options.fontIds.join(', ')}`)
    );
  } else {
    console.log(chalk.gray('Will edit all available fonts'));
  }
}
