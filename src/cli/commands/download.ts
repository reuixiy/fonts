// Download command implementation
import chalk from 'chalk';
import { FontDownloader } from '@/modules/download/FontDownloader.js';
import { CLIValidator } from '@/cli/utils/validation.js';
import { ArgsParser } from '@/cli/utils/args.js';
import type { CLICommand, CLIArgs } from '@/cli/types.js';

export const downloadCommand: CLICommand = {
  name: 'download',
  description: 'Download font files from their sources (GitHub releases, etc.)',
  aliases: ['dl'],

  async execute(args: CLIArgs): Promise<void> {
    console.log(chalk.bold.blue('📥 Downloading Fonts\n'));

    try {
      // Parse download options
      const options = parseDownloadOptions(args);
      await validateDownloadOptions(options);

      // Initialize font downloader
      const fontDownloader = new FontDownloader();

      // Download fonts
      console.log(chalk.yellow('📋 Downloading fonts...'));

      if (options.fontIds.length > 0) {
        await fontDownloader.downloadSpecific(options.fontIds);
        console.log(
          chalk.bold.green(
            `\n🎉 Successfully downloaded ${options.fontIds.length} font(s)!`
          )
        );
        console.log(chalk.gray(`Fonts: ${options.fontIds.join(', ')}`));
      } else {
        await fontDownloader.downloadAll();
        console.log(
          chalk.bold.green('\n🎉 Successfully downloaded all fonts!')
        );
      }

      console.log(chalk.gray(`Download directory: ${options.outputDir}`));
    } catch (error: unknown) {
      console.error(
        chalk.red('❌ Font download failed:'),
        (error as Error).message
      );
      process.exit(1);
    }
  },
};

interface DownloadOptions {
  fontIds: string[];
  outputDir: string;
  forceRedownload: boolean;
}

function parseDownloadOptions(args: CLIArgs): DownloadOptions {
  const fontIds =
    ArgsParser.getOption(args, 'fonts')
      ?.split(',')
      .map((id) => id.trim()) ?? [];
  const outputDir = ArgsParser.getOption(args, 'output') ?? 'downloads';
  const forceRedownload = ArgsParser.hasFlag(args, 'force');

  return {
    fontIds,
    outputDir,
    forceRedownload,
  };
}

async function validateDownloadOptions(
  options: DownloadOptions
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
