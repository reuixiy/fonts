// Download command implementation
import chalk from 'chalk';
import { FontDownloader } from '@/modules/download/FontDownloader.js';
import { CLIValidator } from '@/cli/utils/validation.js';
import { ArgsParser } from '@/cli/utils/args.js';
import type { CLICommand, CLIArgs, StandardOptions } from '@/cli/types.js';

export const downloadCommand: CLICommand = {
  name: 'download',
  description: 'Download font files from their sources (GitHub releases, etc.)',
  aliases: ['dl'],

  async execute(args: CLIArgs): Promise<void> {
    console.log(chalk.bold.blue('📥 Downloading Fonts\n'));

    try {
      // Parse standard options
      const options = ArgsParser.parseStandardOptions(args);
      // Override default output directory for downloads
      const downloadOptions = {
        ...options,
        outputDir:
          options.outputDir === 'build' ? 'downloads' : options.outputDir,
      };
      await validateDownloadOptions(downloadOptions);

      // Initialize font downloader
      const fontDownloader = new FontDownloader();

      // Download fonts
      console.log(chalk.yellow('📋 Downloading fonts...'));

      if (downloadOptions.fontIds.length > 0) {
        await fontDownloader.downloadSpecific(downloadOptions.fontIds);
        console.log(
          chalk.bold.green(
            `\n🎉 Successfully downloaded ${downloadOptions.fontIds.length} font(s)!`
          )
        );
        console.log(chalk.gray(`Fonts: ${downloadOptions.fontIds.join(', ')}`));
      } else {
        await fontDownloader.downloadAll();
        console.log(
          chalk.bold.green('\n🎉 Successfully downloaded all fonts!')
        );
      }

      console.log(
        chalk.gray(`Download directory: ${downloadOptions.outputDir}`)
      );
    } catch (error: unknown) {
      console.error(
        chalk.red('❌ Font download failed:'),
        (error as Error).message
      );
      process.exit(1);
    }
  },
};

async function validateDownloadOptions(
  options: StandardOptions
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
