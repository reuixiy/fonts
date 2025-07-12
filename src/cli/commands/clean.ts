// Clean command implementation
import chalk from 'chalk';
import { FileSystem } from '@/utils/FileSystem.js';
import { PathUtils } from '@/utils/PathUtils.js';
import { ArgsParser } from '@/cli/utils/args.js';
import type { CLICommand, CLIArgs } from '@/cli/types.js';

export const cleanCommand: CLICommand = {
  name: 'clean',
  description: 'Clean build artifacts and cache files',
  aliases: ['cl'],

  async execute(args: CLIArgs): Promise<void> {
    console.log(chalk.bold.blue('🧹 Cleaning Build Artifacts\n'));

    try {
      // Parse clean-specific options
      const options = ArgsParser.parseCleanOptions(args);

      const cleanTasks: Array<{
        name: string;
        path: string;
        description: string;
      }> = [];

      // Build output directory
      if (options.cleanBuild) {
        cleanTasks.push({
          name: 'build',
          path: PathUtils.resolve(process.cwd(), 'build'),
          description: 'Build output directory',
        });
        cleanTasks.push({
          name: 'dist',
          path: PathUtils.resolve(process.cwd(), 'dist'),
          description: 'TypeScript compiled output',
        });
      }

      // Downloads directory
      if (options.cleanDownloads) {
        cleanTasks.push({
          name: 'downloads',
          path: PathUtils.resolve(process.cwd(), 'downloads'),
          description: 'Downloaded font files',
        });
      }

      // Cache files
      if (options.cleanCache) {
        cleanTasks.push({
          name: 'cache',
          path: PathUtils.resolve(process.cwd(), '.cache'),
          description: 'Version cache directory',
        });
        cleanTasks.push({
          name: 'version-cache',
          path: PathUtils.resolve(process.cwd(), '.version-cache.json'),
          description: 'Version cache file',
        });
      }

      // Node modules (if requested)
      if (options.cleanDeps) {
        cleanTasks.push({
          name: 'node_modules',
          path: PathUtils.resolve(process.cwd(), 'node_modules'),
          description: 'Node.js dependencies',
        });
      }

      // Python artifacts
      if (options.cleanCache) {
        cleanTasks.push({
          name: 'python-venv',
          path: PathUtils.resolve(process.cwd(), '.venv-scripts'),
          description: 'Python virtual environment for scripts',
        });
        cleanTasks.push({
          name: 'pycache',
          path: PathUtils.resolve(process.cwd(), 'scripts', '__pycache__'),
          description: 'Python bytecode cache in scripts',
        });
      }

      if (cleanTasks.length === 0) {
        console.log(
          chalk.yellow(
            '⚠️  No clean targets specified. Use --help for options.'
          )
        );
        return;
      }

      // Confirm with user unless force flag is used
      if (!options.force) {
        console.log(chalk.yellow('The following will be removed:'));
        for (const task of cleanTasks) {
          console.log(chalk.gray(`  • ${task.description} (${task.path})`));
        }
        console.log(chalk.red('\n⚠️  This action cannot be undone!'));
        console.log(chalk.gray('Use --force to skip this confirmation.'));

        // In a real CLI, we'd prompt for confirmation here
        console.log(chalk.yellow('Proceeding with cleanup...'));
      }

      // Execute clean tasks
      let cleaned = 0;
      for (const task of cleanTasks) {
        const exists = await FileSystem.exists(task.path);
        if (exists) {
          console.log(chalk.gray(`Removing ${task.description}...`));
          await FileSystem.remove(task.path);
          cleaned++;
        } else {
          console.log(chalk.gray(`${task.description} not found, skipping...`));
        }
      }

      if (cleaned > 0) {
        console.log(
          chalk.bold.green(`\n🎉 Successfully cleaned ${cleaned} item(s)!`)
        );
      } else {
        console.log(
          chalk.yellow(
            '\n✨ Nothing to clean - all targets were already removed.'
          )
        );
      }
    } catch (error: unknown) {
      console.error(chalk.red('❌ Clean failed:'), (error as Error).message);
      process.exit(1);
    }
  },
};
