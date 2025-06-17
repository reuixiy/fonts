import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

class CSSGenerator {
  constructor() {
    this.configPath = path.join(process.cwd(), 'src/config/fonts.json');
    this.outputDir = path.join(process.cwd(), 'build');
    this.cssDir = path.join(this.outputDir, 'css');
  }

  async init() {
    // Ensure CSS output directory exists
    await fs.ensureDir(this.cssDir);
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

  formatUnicodeRanges(ranges) {
    return ranges
      .map((range) => {
        if (range.includes('-')) {
          // Range format like U+4E00-9FFF
          return range;
        } else {
          // Single codepoint format
          return range;
        }
      })
      .join(', ');
  }

  generateFontFaceCSS(fontId, fontConfig, processResult, baseUrl = './fonts') {
    const fontPath = `${baseUrl}/${fontId}`;
    let css = '';

    if (fontConfig.type === 'variable') {
      // Variable font CSS generation
      if (fontConfig.subset.type === 'size-based-chunks') {
        // Chunked variable font: group chunks by style
        const chunksByStyle = {};
        processResult.forEach((chunk) => {
          if (!chunksByStyle[chunk.style]) {
            chunksByStyle[chunk.style] = [];
          }
          chunksByStyle[chunk.style].push(chunk);
        });

        // Generate @font-face rules for each style's chunks
        Object.entries(chunksByStyle).forEach(([style, chunks]) => {
          chunks.forEach((chunk) => {
            const fontStyle = style === 'italic' ? 'italic' : 'normal';
            const fontWeight = fontConfig.weight || '100 900'; // Variable weight range

            css += `@font-face {
  font-family: '${fontConfig.displayName}';
  src: url('${fontPath}/${chunk.filename}') format('woff2');
  font-display: swap;
  font-style: ${fontStyle};
  font-weight: ${fontWeight};
  unicode-range: ${this.formatUnicodeRanges(chunk.unicodeRanges)};
}

`;
          });
        });
      } else {
        // Legacy single-file variable font
        processResult.forEach((result) => {
          const fontStyle = result.style === 'italic' ? 'italic' : 'normal';
          const fontWeight = fontConfig.weight || '100 900'; // Variable weight range

          css += `@font-face {
  font-family: '${fontConfig.displayName}';
  src: url('${fontPath}/${result.filename}') format('woff2');
  font-display: swap;
  font-style: ${fontStyle};
  font-weight: ${fontWeight};
  unicode-range: ${this.formatUnicodeRanges(fontConfig.subset.ranges)};
}

`;
        });
      }
    } else {
      // Check if this is chunked output (array) or single file output (object)
      if (Array.isArray(processResult)) {
        // Chunked font CSS generation
        processResult.forEach((chunk) => {
          const fontStyle = fontConfig.style || 'normal';
          const fontWeight = fontConfig.weight || 400;

          css += `@font-face {
  font-family: '${fontConfig.displayName}';
  src: url('${fontPath}/${chunk.filename}') format('woff2');
  font-display: swap;
  font-style: ${fontStyle};
  font-weight: ${fontWeight};
  unicode-range: ${this.formatUnicodeRanges(chunk.unicodeRanges)};
}

`;
        });
      } else {
        // Single file font CSS generation (legacy)
        const fontStyle = fontConfig.style || 'normal';
        const fontWeight = fontConfig.weight || 400;

        css += `@font-face {
  font-family: '${fontConfig.displayName}';
  src: url('${fontPath}/${processResult.filename}') format('woff2');
  font-display: swap;
  font-style: ${fontStyle};
  font-weight: ${fontWeight};
  unicode-range: ${this.formatUnicodeRanges(fontConfig.subset.ranges)};
}

`;
      }
    }

    return css;
  }

  async generateIndividualCSS(fontId, fontConfig, processResult) {
    const cssFileName = `${fontId}.css`;
    const cssPath = path.join(this.cssDir, cssFileName);

    // Generate CSS content
    let cssContent = `/* ${
      fontConfig.displayName
    } - Generated on ${new Date().toISOString()} */
`;

    // Add chunked font metadata if applicable
    if (Array.isArray(processResult) && fontConfig.subset.type === 'size-based-chunks') {
      if (fontConfig.type === 'variable') {
        // Count chunks by style for variable fonts
        const styleGroups = {};
        processResult.forEach((chunk) => {
          if (!styleGroups[chunk.style]) {
            styleGroups[chunk.style] = 0;
          }
          styleGroups[chunk.style]++;
        });
        const styleInfo = Object.entries(styleGroups)
          .map(([style, count]) => `${style}: ${count} chunks`)
          .join(', ');
        cssContent += `/* Variable Chunked Font: ${processResult.length} total chunks (${styleInfo}) */
/* Load chunks in order for optimal performance */

`;
      } else {
        cssContent += `/* Chunked Font: ${processResult.length} chunks, progressive loading */
/* Load chunks in order for optimal performance */

`;
      }
    } else {
      cssContent += `
`;
    }

    // Add @font-face declarations
    cssContent += this.generateFontFaceCSS(fontId, fontConfig, processResult);

    // Add usage notes for chunked fonts
    if (Array.isArray(processResult) && fontConfig.subset.type === 'size-based-chunks') {
      const chunkCount = processResult.length;
      const isVariable = fontConfig.type === 'variable';
      
      cssContent += `/* Usage Notes:
 * This font is split into ${chunkCount} progressive chunks${isVariable ? ' across multiple styles' : ''}.
 * - Chunk 0: Critical characters (Latin, basic punctuation)`;

      if (fontConfig.subset.strategy === 'chinese-frequency') {
        cssContent += `
 * - Chunk 1+: Common to rare Chinese characters by frequency`;
      } else if (fontConfig.subset.strategy === 'latin-frequency') {
        cssContent += `
 * - Chunk 1+: Extended Latin characters by frequency`;
      }

      cssContent += `
 * 
 * The browser will automatically load chunks as needed based on
 * the unicode-range declarations above.`;

      if (isVariable) {
        cssContent += `
 * 
 * Variable font features available:
 * - Font styles: ${fontConfig.styles ? fontConfig.styles.join(', ') : 'multiple'}
 * - Variable axes: ${fontConfig.variableAxes ? fontConfig.variableAxes.slice(0, 5).join(', ') + (fontConfig.variableAxes.length > 5 ? '...' : '') : 'multiple'}`;
      }

      cssContent += `
 */

`;
    }

    // Write CSS file
    await fs.writeFile(cssPath, cssContent);

    console.log(chalk.green(`  ✅ Generated: ${cssFileName}`));

    return {
      path: cssPath,
      filename: cssFileName,
      size: cssContent.length,
    };
  }

  async generateUnifiedCSS(allResults, config) {
    const cssFileName = 'fonts.css';
    const cssPath = path.join(this.cssDir, cssFileName);

    let cssContent = `/* Unified Font CSS - Generated on ${new Date().toISOString()} */
/* Auto-generated from web-font-auto-subsetting workflow */
/* https://github.com/user/web-font-auto-subsetting */

`;

    // Add summary of included fonts
    cssContent += `/* Included Fonts:
`;
    for (const [fontId, processResult] of Object.entries(allResults)) {
      if (processResult.error) continue;
      const fontConfig = config.fonts[fontId];
      const chunkInfo = Array.isArray(processResult) ? ` (${processResult.length} chunks)` : '';
      cssContent += ` * - ${fontConfig.displayName}${chunkInfo}
`;
    }
    cssContent += ` */

`;

    // Add all @font-face declarations
    for (const [fontId, processResult] of Object.entries(allResults)) {
      if (processResult.error) continue;

      const fontConfig = config.fonts[fontId];
      const chunkInfo = Array.isArray(processResult) ? ` (${processResult.length} chunks)` : '';
      cssContent += `/* ${fontConfig.displayName}${chunkInfo} */
`;
      cssContent += this.generateFontFaceCSS(fontId, fontConfig, processResult);
    }

    // Add font stack recommendations
    cssContent += `/* Font Stack Recommendations */

.font-chinese {
  font-family: 'I.MingCP', 'LXGW WenKai TC', 'Noto Serif CJK SC', serif;
}

.font-english {
  font-family: 'Amstelvar', 'Inter', system-ui, sans-serif;
}

.font-fallback {
  font-family: system-ui, -apple-system, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
}

/* Progressive Loading Utilities */
.font-loading {
  font-display: swap;
  font-variation-settings: normal;
}

/* High-performance text rendering */
.text-optimized {
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

`;

    // Write unified CSS file
    await fs.writeFile(cssPath, cssContent);

    console.log(chalk.green(`  ✅ Generated: ${cssFileName} (unified)`));

    return {
      path: cssPath,
      filename: cssFileName,
      size: cssContent.length,
    };
  }

  async generateAll() {
    await this.init();
    const config = await this.loadConfig();

    // Load processing metadata
    const processingMetadataPath = path.join(
      this.outputDir,
      'processing-metadata.json'
    );
    const processingMetadata = await fs.readJson(processingMetadataPath);
    const cssResults = {};

    console.log(chalk.bold.blue('🚀 CSS Generator\\n'));

    // Generate individual CSS files
    for (const [fontId, processResult] of Object.entries(
      processingMetadata.results
    )) {
      if (processResult.error) {
        console.log(
          chalk.red(`⏭️  Skipping ${fontId} CSS (processing failed)`)
        );
        continue;
      }

      const fontConfig = config.fonts[fontId];
      console.log(
        chalk.yellow(`📝 Generating CSS for ${fontConfig.displayName}...`)
      );

      try {
        const result = await this.generateIndividualCSS(
          fontId,
          fontConfig,
          processResult
        );
        cssResults[fontId] = result;
      } catch (error) {
        console.error(
          chalk.red(`Failed to generate CSS for ${fontId}:`),
          error.message
        );
        cssResults[fontId] = { error: error.message };
      }
    }

    // Generate unified CSS file
    console.log(chalk.yellow(`\\n📝 Generating unified CSS file...`));
    try {
      const unifiedResult = await this.generateUnifiedCSS(
        processingMetadata.results,
        config
      );
      cssResults.unified = unifiedResult;
    } catch (error) {
      console.error(
        chalk.red('Failed to generate unified CSS:'),
        error.message
      );
      cssResults.unified = { error: error.message };
    }

    // Save CSS generation metadata
    const metadataPath = path.join(this.outputDir, 'css-metadata.json');
    await fs.writeJson(
      metadataPath,
      {
        timestamp: new Date().toISOString(),
        results: cssResults,
      },
      { spaces: 2 }
    );

    console.log(chalk.bold.green('\\n✅ CSS generation completed!'));
    console.log(chalk.gray(`Metadata saved to: ${metadataPath}`));

    return cssResults;
  }

  async generateSpecific(fontIds) {
    await this.init();
    const config = await this.loadConfig();

    // Load processing metadata
    const processingMetadataPath = path.join(
      this.outputDir,
      'processing-metadata.json'
    );
    const processingMetadata = await fs.readJson(processingMetadataPath);
    const cssResults = {};

    console.log(chalk.bold.blue('🚀 CSS Generator (Specific Fonts)\\n'));
    console.log(chalk.cyan(`Target fonts: ${fontIds.join(', ')}\\n`));

    // Generate individual CSS files for specified fonts
    for (const fontId of fontIds) {
      if (!config.fonts[fontId]) {
        console.error(chalk.red(`❌ Font configuration not found: ${fontId}`));
        continue;
      }

      const processResult = processingMetadata.results[fontId];

      if (!processResult || processResult.error) {
        console.log(
          chalk.red(`⏭️  Skipping ${fontId} CSS (processing failed)`)
        );
        continue;
      }

      const fontConfig = config.fonts[fontId];
      console.log(
        chalk.yellow(`📝 Generating CSS for ${fontConfig.displayName}...`)
      );

      try {
        const result = await this.generateIndividualCSS(
          fontId,
          fontConfig,
          processResult
        );
        cssResults[fontId] = result;
      } catch (error) {
        console.error(
          chalk.red(`Failed to generate CSS for ${fontId}:`),
          error.message
        );
        cssResults[fontId] = { error: error.message };
      }
    }

    return cssResults;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const generator = new CSSGenerator();

  // Check if specific fonts are requested via command line args
  const targetFonts = process.argv.slice(2);

  if (targetFonts.length > 0) {
    generator.generateSpecific(targetFonts);
  } else {
    generator.generateAll();
  }
}

export default CSSGenerator;
