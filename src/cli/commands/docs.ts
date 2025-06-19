// Documentation command implementation
import chalk from 'chalk';
import { DocsGenerator } from '@/modules/docs/DocsGenerator.js';
import { ReadmeGenerator } from '@/modules/docs/ReadmeGenerator.js';
import { ConfigManager } from '@/config/index.js';
import { PathUtils } from '@/utils/PathUtils.js';
import { CLIValidator } from '@/cli/utils/validation.js';
import { ArgsParser } from '@/cli/utils/args.js';
import type { CLICommand, CLIArgs } from '@/cli/types.js';

export const docsCommand: CLICommand = {
  name: 'docs',
  description:
    'Generate documentation (license and README) for the build directory',
  aliases: ['d', 'doc'],

  async execute(args: CLIArgs): Promise<void> {
    console.log(chalk.bold.blue('📚 Generating Documentation\n'));

    try {
      // Parse documentation options
      const options = parseDocsOptions(args);
      await validateDocsOptions(options);

      // Initialize generators
      const buildConfig = ConfigManager.getBuildConfig();
      const docsGenerator = new DocsGenerator(buildConfig);
      const readmeGenerator = new ReadmeGenerator();

      const outputDir = PathUtils.resolve(process.cwd(), options.outputDir);

      // Generate license information
      if (options.includeLicense) {
        console.log(chalk.yellow('📋 Generating license information...'));

        await docsGenerator.generateDocumentation({
          formats: ['markdown', 'json'],
          outputDir,
          validateLicenses: options.validateLicenses,
          includeCompliance: options.includeCompliance,
        });
      }

      // Generate build README
      if (options.includeReadme) {
        console.log(chalk.yellow('📋 Generating build README...'));
        await readmeGenerator.generateReadme(outputDir);
      }

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

interface DocsOptions {
  outputDir: string;
  includeLicense: boolean;
  includeReadme: boolean;
  validateLicenses: boolean;
  includeCompliance: boolean;
}

function parseDocsOptions(args: CLIArgs): DocsOptions {
  const outputDir = ArgsParser.getOption(args, 'output') ?? 'build';

  // Check specific flags
  const licenseOnly = ArgsParser.hasFlag(args, 'license-only');
  const readmeOnly = ArgsParser.hasFlag(args, 'readme-only');

  // By default, generate both unless specified otherwise
  let includeLicense = true;
  let includeReadme = true;

  if (licenseOnly) {
    includeReadme = false;
  } else if (readmeOnly) {
    includeLicense = false;
  }

  const validateLicenses = !ArgsParser.hasFlag(args, 'no-validate');
  const includeCompliance = !ArgsParser.hasFlag(args, 'no-compliance');

  return {
    outputDir,
    includeLicense,
    includeReadme,
    validateLicenses,
    includeCompliance,
  };
}

async function validateDocsOptions(options: DocsOptions): Promise<void> {
  // Validate output directory
  const outputValidation = CLIValidator.validateOutputDir(options.outputDir);
  if (!outputValidation.isValid) {
    console.error(chalk.red('Invalid output directory:'));
    console.error(CLIValidator.formatErrors(outputValidation));
    process.exit(1);
  }
}
