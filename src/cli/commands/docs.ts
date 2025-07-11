// Documentation command implementation
import chalk from 'chalk';
import { DocsGenerator } from '@/modules/docs/DocsGenerator.js';
import { ConfigManager } from '@/config/index.js';
import { PathUtils } from '@/utils/PathUtils.js';
import { CLIValidator } from '@/cli/utils/validation.js';
import { ArgsParser } from '@/cli/utils/args.js';
import type { CLICommand, CLIArgs, DocsOptions } from '@/cli/types.js';

export const docsCommand: CLICommand = {
  name: 'docs',
  description:
    'Generate documentation (license and README) for the build directory',
  aliases: ['d', 'doc'],

  async execute(args: CLIArgs): Promise<void> {
    console.log(chalk.bold.blue('📚 Generating Documentation\n'));

    try {
      // Parse docs-specific options
      const options = ArgsParser.parseDocsOptions(args);
      await validateDocsOptions(options);

      // Initialize generator
      const buildConfig = ConfigManager.getBuildConfig();
      const docsGenerator = new DocsGenerator(buildConfig);

      const outputDir = PathUtils.resolve(process.cwd(), options.outputDir);

      // Generate documentation using integrated DocsGenerator
      await docsGenerator.generateDocumentation({
        formats: ['markdown', 'json'],
        outputDir,
        validateLicenses: options.validateLicenses,
        includeCompliance: options.includeCompliance,
        includeReadme: options.includeReadme,
        includeLicense: options.includeLicense,
      });

      console.log(
        chalk.bold.green('\n🎉 Documentation generated successfully!')
      );
      console.log(chalk.gray(`Output directory: ${options.outputDir}`));

      if (options.includeLicense) {
        console.log(chalk.gray('Generated: LICENSE.md, LICENSE.json'));
      }
      if (options.includeReadme) {
        console.log(chalk.gray('Generated: README.md'));
      }
    } catch (error: unknown) {
      console.error(
        chalk.red('❌ Documentation generation failed:'),
        (error as Error).message
      );
      process.exit(1);
    }
  },
};

async function validateDocsOptions(options: DocsOptions): Promise<void> {
  // Validate output directory
  const outputValidation = CLIValidator.validateOutputDir(options.outputDir);
  if (!outputValidation.isValid) {
    console.error(chalk.red('Invalid output directory:'));
    console.error(CLIValidator.formatErrors(outputValidation));
    process.exit(1);
  }
}
