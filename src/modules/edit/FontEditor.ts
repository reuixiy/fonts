// Main font editor implementation
import fs from 'fs-extra';
import path from 'path';
import { BaseService } from '@/core/base/BaseService.js';
import type { IFontEditor } from '@/core/interfaces/IFontEditor.js';
import type { FontConfig } from '@/types/config.js';
import { ConfigManager } from '@/config/index.js';
import { PythonScriptRunner } from '@/modules/edit/PythonScriptRunner.js';
import type {
  EditResult,
  EditResults,
  PythonScriptConfig,
  EditProcessConfig,
} from '@/modules/edit/types.js';

export class FontEditor extends BaseService implements IFontEditor {
  private downloadsDir: string;
  private scriptsConfig: EditProcessConfig;
  private scriptRunner: PythonScriptRunner;

  constructor(config?: Partial<EditProcessConfig>) {
    super('FontEditor');
    this.downloadsDir = path.join(process.cwd(), 'downloads');

    // Default configuration
    this.scriptsConfig = {
      scripts: [
        {
          name: 'iming-halt-fix',
          path: 'scripts/iming-halt-fix.py',
          description: 'Fix GPOS halt feature for I.MingCP specific characters',
          requiredPackages: ['fonttools'],
          targetFonts: ['imingcp'], // Specific to I.MingCP font
          enabled: true,
        },
        {
          name: 'lxgw-halt-fix',
          path: 'scripts/lxgw-halt-fix.py',
          description: 'Fix GPOS halt feature for LXGW WenKai TC punctuation',
          requiredPackages: ['fonttools'],
          targetFonts: ['lxgwwenkaitc'], // Specific to LXGW WenKai TC font
          enabled: true,
        },
        {
          name: 'test',
          path: 'scripts/test.py',
          description: 'Test script for font information extraction',
          requiredPackages: ['fonttools'],
          targetFonts: 'all', // Run on all fonts for testing
          enabled: false, // Disabled by default, can be enabled for testing
        },
      ],
      workingDirectory: process.cwd(),
      pythonExecutable: 'python3',
      enableLogging: true,
      validateAfterEdit: true,
      ...config,
    };

    this.scriptRunner = new PythonScriptRunner(
      this.scriptsConfig.workingDirectory,
      this.scriptsConfig.pythonExecutable
    );
  }

  async editAll(): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      this.log('🚀 Starting font editing for all fonts');

      // Check Python environment first
      const pythonReady = await this.scriptRunner.checkPythonEnvironment();
      if (!pythonReady) {
        this.log(
          '⚠️ Python environment is not ready - skipping font editing',
          'warn'
        );
        this.log(
          '💡 To enable font editing, ensure Python 3 and pip are installed',
          'info'
        );
        return; // Gracefully skip instead of throwing error
      }

      const fontIds = ConfigManager.getFontIds();
      this.log(`📝 Found ${fontIds.length} fonts to potentially edit`);

      const results = await this.editFonts(fontIds);
      this.logResults(results);

      if (this.scriptsConfig.validateAfterEdit) {
        await this.validateEdits(fontIds);
      }
    }, 'edit all fonts');
  }

  async editSpecific(fontIds: string[]): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      this.log(
        `🚀 Starting font editing for specific fonts: ${fontIds.join(', ')}`
      );

      // Validate font IDs
      const validation = ConfigManager.validateFontIds(fontIds);
      if (validation.invalid.length > 0) {
        throw new Error(`Invalid font IDs: ${validation.invalid.join(', ')}`);
      }

      // Check Python environment first
      const pythonReady = await this.scriptRunner.checkPythonEnvironment();
      if (!pythonReady) {
        this.log(
          '⚠️ Python environment is not ready - skipping font editing',
          'warn'
        );
        this.log(
          '💡 To enable font editing, ensure Python 3 and pip are installed',
          'info'
        );
        return; // Gracefully skip instead of throwing error
      }

      const results = await this.editFonts(validation.valid);
      this.logResults(results);

      if (this.scriptsConfig.validateAfterEdit) {
        await this.validateEdits(validation.valid);
      }
    }, 'edit specific fonts');
  }

  async validateEdits(fontIds?: string[]): Promise<boolean> {
    return this.executeWithErrorHandling(async () => {
      const targetFontIds = fontIds ?? ConfigManager.getFontIds();
      let allValid = true;

      this.log(`🔍 Validating edits for ${targetFontIds.length} fonts`);

      for (const fontId of targetFontIds) {
        try {
          const isValid = await this.validateFontEdits(fontId);

          if (!isValid) {
            this.log(`❌ Validation failed for ${fontId}`, 'warn');
            allValid = false;
          } else {
            this.log(`✅ Validation passed for ${fontId}`, 'debug');
          }
        } catch (error) {
          this.log(
            `❌ Validation error for ${fontId}: ${(error as Error).message}`,
            'error'
          );
          allValid = false;
        }
      }

      return allValid;
    }, 'validate edits');
  }

  async cleanup(): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      this.log('🧹 Cleaning up edit module');
      await this.scriptRunner.cleanup();
    }, 'cleanup edit module');
  }

  private async editFonts(fontIds: string[]): Promise<EditResults> {
    const results: EditResults = {};

    for (const fontId of fontIds) {
      try {
        const fontConfig = ConfigManager.getFontConfig(fontId);
        const fontResults = await this.editFont(fontId, fontConfig);
        results[fontId] = fontResults;

        const successCount = fontResults.filter(
          (r) => r.status === 'success'
        ).length;
        const errorCount = fontResults.filter(
          (r) => r.status === 'error'
        ).length;
        const skippedCount = fontResults.filter(
          (r) => r.status === 'skipped'
        ).length;

        this.log(
          `✅ Completed editing ${fontId}: ${successCount} success, ${errorCount} errors, ${skippedCount} skipped`
        );
      } catch (error) {
        this.log(
          `❌ Failed to edit font ${fontId}: ${(error as Error).message}`,
          'error'
        );
        results[fontId] = [
          {
            fontId,
            script: 'general',
            status: 'error',
            message: (error as Error).message,
          },
        ];
      }
    }

    return results;
  }

  private async editFont(
    fontId: string,
    fontConfig: FontConfig
  ): Promise<EditResult[]> {
    this.log(`🔧 Processing font: ${fontConfig.displayName}`);

    const fontDir = path.join(this.downloadsDir, fontId);

    // Check if font directory exists
    if (!(await fs.pathExists(fontDir))) {
      return [
        {
          fontId,
          script: 'general',
          status: 'error',
          message:
            'Font directory not found - font needs to be downloaded first',
        },
      ];
    }

    // Find font files
    const fontFiles = await this.findFontFiles(fontDir);
    if (fontFiles.length === 0) {
      return [
        {
          fontId,
          script: 'general',
          status: 'error',
          message: 'No font files found in directory',
        },
      ];
    }

    const results: EditResult[] = [];

    // Process each script that applies to this font
    for (const scriptConfig of this.scriptsConfig.scripts) {
      if (!this.shouldRunScript(scriptConfig, fontId)) {
        results.push({
          fontId,
          script: scriptConfig.name,
          status: 'skipped',
          message: 'Script not applicable to this font',
        });
        continue;
      }

      // Run script on the first font file (or all if needed)
      for (const fontFile of fontFiles) {
        const result = await this.scriptRunner.runScript(
          scriptConfig,
          fontId,
          fontFile
        );
        results.push(result);

        // For now, only process the first font file per script
        // TODO: Add configuration for multi-file processing
        break;
      }
    }

    return results;
  }

  private async findFontFiles(fontDir: string): Promise<string[]> {
    const files = await fs.readdir(fontDir);
    const fontFiles = files
      .filter((file) => file.endsWith('.ttf') || file.endsWith('.otf'))
      .map((file) => path.join(fontDir, file));

    return fontFiles;
  }

  private shouldRunScript(
    scriptConfig: PythonScriptConfig,
    fontId: string
  ): boolean {
    if (!scriptConfig.enabled) {
      return false;
    }

    if (!scriptConfig.targetFonts || scriptConfig.targetFonts === 'all') {
      return true;
    }

    return scriptConfig.targetFonts.includes(fontId);
  }

  private async validateFontEdits(fontId: string): Promise<boolean> {
    const fontDir = path.join(this.downloadsDir, fontId);

    if (!(await fs.pathExists(fontDir))) {
      return false;
    }

    // Basic validation: check if font files still exist and are valid
    const fontFiles = await this.findFontFiles(fontDir);
    if (fontFiles.length === 0) {
      return false;
    }

    // Check file size (should be > 1KB)
    for (const fontFile of fontFiles) {
      const stats = await fs.stat(fontFile);
      if (stats.size < 1024) {
        return false;
      }
    }

    return true;
  }

  private logResults(results: EditResults): void {
    let totalSuccess = 0;
    let totalErrors = 0;
    let totalSkipped = 0;

    for (const [fontId, fontResults] of Object.entries(results)) {
      const successCount = fontResults.filter(
        (r) => r.status === 'success'
      ).length;
      const errorCount = fontResults.filter((r) => r.status === 'error').length;
      const skippedCount = fontResults.filter(
        (r) => r.status === 'skipped'
      ).length;

      totalSuccess += successCount;
      totalErrors += errorCount;
      totalSkipped += skippedCount;

      if (errorCount > 0) {
        this.log(`⚠️ ${fontId}: ${errorCount} errors occurred`, 'warn');
        fontResults
          .filter((r) => r.status === 'error')
          .forEach((r) => this.log(`  - ${r.script}: ${r.message}`, 'error'));
      }
    }

    if (totalErrors > 0) {
      this.log(
        `⚠️ Edit completed with ${totalErrors} errors, ${totalSuccess} successes, ${totalSkipped} skipped`,
        'warn'
      );
    } else {
      this.log(
        `🎉 All edits completed successfully! ${totalSuccess} successes, ${totalSkipped} skipped`
      );
    }
  }

  // Configuration management
  addScript(scriptConfig: PythonScriptConfig): void {
    this.scriptsConfig.scripts.push(scriptConfig);
    this.log(`📜 Added script: ${scriptConfig.name}`);
  }

  removeScript(scriptName: string): void {
    const index = this.scriptsConfig.scripts.findIndex(
      (s) => s.name === scriptName
    );
    if (index !== -1) {
      this.scriptsConfig.scripts.splice(index, 1);
      this.log(`🗑️ Removed script: ${scriptName}`);
    }
  }

  getScripts(): PythonScriptConfig[] {
    return [...this.scriptsConfig.scripts];
  }
}
