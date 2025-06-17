import fs from 'fs-extra';
import path from 'path';
import { spawn } from 'child_process';
import chalk from 'chalk';

class FontSubset {
  constructor() {
    this.configPath = path.join(process.cwd(), 'src/config/fonts.json');
    this.downloadDir = path.join(process.cwd(), 'downloads');
    this.outputDir = path.join(process.cwd(), 'build');
  }

  async init() {
    // Ensure output directories exist
    await fs.ensureDir(this.outputDir);
    await fs.ensureDir(path.join(this.outputDir, 'fonts'));

    // Check if fonttools is available
    await this.checkFontTools();
  }

  async checkFontTools() {
    return new Promise((resolve, reject) => {
      const child = spawn('pyftsubset', ['--help'], { stdio: 'pipe' });

      child.on('close', (code) => {
        if (code === 0) {
          console.log(chalk.green('✅ fonttools (pyftsubset) is available'));
          resolve();
        } else {
          console.error(
            chalk.red(
              '❌ fonttools not found. Please install: pip install fonttools[woff]'
            )
          );
          reject(new Error('fonttools not available'));
        }
      });

      child.on('error', (error) => {
        console.error(chalk.red('❌ Error checking fonttools:'), error.message);
        console.log(
          chalk.yellow('💡 Install fonttools: pip install fonttools[woff]')
        );
        reject(error);
      });
    });
  }

  async loadConfig() {
    try {
      const config = await fs.readJson(this.configPath);
      return config;
    } catch (error) {
      console.error(
        chalk.red('Failed to load font configuration:'),
        error.message
      );
      throw error;
    }
  }

  async runPyftsubset(inputPath, outputPath, options = []) {
    return new Promise((resolve, reject) => {
      const args = [
        inputPath,
        `--output-file=${outputPath}`,
        '--flavor=woff2',
        '--with-zopfli',
        '--desubroutinize',
        '--layout-features-=locl,frac,ordn,sups,sinf,subs,dnom,numr,tnum',
        ...options,
      ];

      console.log(chalk.cyan(`    Running: pyftsubset ${args.join(' ')}`));

      const child = spawn('pyftsubset', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env },
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          console.error(chalk.red(`    pyftsubset failed with code ${code}`));
          console.error(chalk.red(`    stderr: ${stderr}`));
          reject(new Error(`pyftsubset failed: ${stderr}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  generateUnicodeRanges(ranges) {
    // Convert Unicode ranges to pyftsubset format
    return ranges
      .map((range) => {
        if (range.includes('-')) {
          return `--unicodes=${range}`;
        } else {
          return `--unicodes=${range}`;
        }
      })
      .join(' ')
      .split(' ');
  }

  async processChineseFont(fontId, fontConfig, inputPath) {
    console.log(
      chalk.blue(`  📝 Processing Chinese font: ${fontConfig.displayName}`)
    );

    const fontDir = path.join(this.outputDir, 'fonts', fontId);
    await fs.ensureDir(fontDir);

    const outputFileName = `${fontConfig.output.filename}.woff2`;
    const outputPath = path.join(fontDir, outputFileName);

    // Check if output file already exists
    if (await fs.pathExists(outputPath)) {
      const stats = await fs.stat(outputPath);
      console.log(
        chalk.green(`    ⏭️  File already exists: ${outputFileName}`)
      );
      console.log(chalk.gray(`    Size: ${(stats.size / 1024).toFixed(1)}KB`));

      return {
        path: outputPath,
        filename: outputFileName,
        size: stats.size,
        compressionRatio: 'N/A (existing)',
      };
    }

    // Generate Unicode ranges for Chinese fonts
    const unicodeOptions = this.generateUnicodeRanges(fontConfig.subset.ranges);

    try {
      await this.runPyftsubset(inputPath, outputPath, unicodeOptions);

      const stats = await fs.stat(outputPath);
      const originalStats = await fs.stat(inputPath);
      const compressionRatio = (
        (1 - stats.size / originalStats.size) *
        100
      ).toFixed(1);

      console.log(chalk.green(`    ✅ Created: ${outputFileName}`));
      console.log(
        chalk.gray(
          `    Size: ${(stats.size / 1024).toFixed(
            1
          )}KB (${compressionRatio}% smaller)`
        )
      );

      return {
        path: outputPath,
        filename: outputFileName,
        size: stats.size,
        compressionRatio: compressionRatio,
      };
    } catch (error) {
      console.error(
        chalk.red(`    ❌ Failed to process ${fontConfig.displayName}:`),
        error.message
      );
      throw error;
    }
  }

  async processVariableFont(fontId, fontConfig, inputFiles) {
    console.log(
      chalk.blue(`  🔄 Processing variable font: ${fontConfig.displayName}`)
    );

    const fontDir = path.join(this.outputDir, 'fonts', fontId);
    await fs.ensureDir(fontDir);

    const results = [];

    for (const inputFile of inputFiles) {
      const outputFileName = `${fontId}-${inputFile.style}.woff2`;
      const outputPath = path.join(fontDir, outputFileName);

      // Check if output file already exists
      if (await fs.pathExists(outputPath)) {
        const stats = await fs.stat(outputPath);
        console.log(
          chalk.green(`    ⏭️  File already exists: ${outputFileName}`)
        );
        console.log(
          chalk.gray(`    Size: ${(stats.size / 1024).toFixed(1)}KB`)
        );

        results.push({
          path: outputPath,
          filename: outputFileName,
          size: stats.size,
          compressionRatio: 'N/A (existing)',
          style: inputFile.style,
        });
        continue;
      }

      // Generate Unicode ranges for Latin fonts
      const unicodeOptions = this.generateUnicodeRanges(
        fontConfig.subset.ranges
      );

      try {
        await this.runPyftsubset(inputFile.path, outputPath, unicodeOptions);

        const stats = await fs.stat(outputPath);
        const originalStats = await fs.stat(inputFile.path);
        const compressionRatio = (
          (1 - stats.size / originalStats.size) *
          100
        ).toFixed(1);

        console.log(
          chalk.green(`    ✅ Created: ${outputFileName} (${inputFile.style})`)
        );
        console.log(
          chalk.gray(
            `    Size: ${(stats.size / 1024).toFixed(
              1
            )}KB (${compressionRatio}% smaller)`
          )
        );

        results.push({
          path: outputPath,
          filename: outputFileName,
          style: inputFile.style,
          size: stats.size,
          compressionRatio: compressionRatio,
        });
      } catch (error) {
        console.error(
          chalk.red(`    ❌ Failed to process ${inputFile.style} variant:`),
          error.message
        );
        throw error;
      }
    }

    return results;
  }

  async processFont(fontId, fontConfig, downloadResult) {
    console.log(chalk.yellow(`\\n🎯 Processing ${fontConfig.displayName}...`));

    try {
      if (fontConfig.type === 'variable') {
        // Variable font processing
        return await this.processVariableFont(
          fontId,
          fontConfig,
          downloadResult.files
        );
      } else {
        // Regular font processing
        return await this.processChineseFont(
          fontId,
          fontConfig,
          downloadResult.path
        );
      }
    } catch (error) {
      console.error(
        chalk.red(`❌ Failed to process ${fontConfig.displayName}:`),
        error.message
      );
      throw error;
    }
  }

  async processAll() {
    await this.init();
    const config = await this.loadConfig();

    // Load download metadata
    const downloadMetadataPath = path.join(
      this.downloadDir,
      'download-metadata.json'
    );
    const downloadMetadata = await fs.readJson(downloadMetadataPath);
    const processResults = {};

    console.log(chalk.bold.blue('🚀 Font Subsetting Processor\\n'));

    for (const [fontId, fontConfig] of Object.entries(config.fonts)) {
      const downloadResult = downloadMetadata.results[fontId];

      if (!downloadResult || downloadResult.error) {
        console.log(
          chalk.red(`⏭️  Skipping ${fontConfig.displayName} (download failed)`)
        );
        continue;
      }

      try {
        const result = await this.processFont(
          fontId,
          fontConfig,
          downloadResult
        );
        processResults[fontId] = result;
      } catch (error) {
        console.error(chalk.red(`Failed to process ${fontId}:`), error.message);
        processResults[fontId] = { error: error.message };
      }
    }

    // Save processing results metadata
    const metadataPath = path.join(this.outputDir, 'processing-metadata.json');
    await fs.writeJson(
      metadataPath,
      {
        timestamp: new Date().toISOString(),
        results: processResults,
      },
      { spaces: 2 }
    );

    console.log(chalk.bold.green('\\n✅ Font processing completed!'));
    console.log(chalk.gray(`Metadata saved to: ${metadataPath}`));

    return processResults;
  }

  async processSpecific(fontIds) {
    await this.init();
    const config = await this.loadConfig();

    // Load download metadata
    const downloadMetadataPath = path.join(
      this.downloadDir,
      'download-metadata.json'
    );
    const downloadMetadata = await fs.readJson(downloadMetadataPath);
    const processResults = {};

    console.log(
      chalk.bold.blue('🚀 Font Subsetting Processor (Specific Fonts)\\n')
    );
    console.log(chalk.cyan(`Target fonts: ${fontIds.join(', ')}\\n`));

    for (const fontId of fontIds) {
      if (!config.fonts[fontId]) {
        console.error(chalk.red(`❌ Font configuration not found: ${fontId}`));
        continue;
      }

      const downloadResult = downloadMetadata.results[fontId];

      if (!downloadResult || downloadResult.error) {
        console.log(chalk.red(`⏭️  Skipping ${fontId} (download failed)`));
        continue;
      }

      try {
        const result = await this.processFont(
          fontId,
          config.fonts[fontId],
          downloadResult
        );
        processResults[fontId] = result;
      } catch (error) {
        console.error(chalk.red(`Failed to process ${fontId}:`), error.message);
        processResults[fontId] = { error: error.message };
      }
    }

    return processResults;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const processor = new FontSubset();

  // Check if specific fonts are requested via command line args
  const targetFonts = process.argv.slice(2);

  if (targetFonts.length > 0) {
    processor.processSpecific(targetFonts);
  } else {
    processor.processAll();
  }
}

export default FontSubset;
