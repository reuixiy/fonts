// Main configuration loader and validator
import type {
  FontsConfig,
  FontConfig,
  BuildConfig,
  EnvironmentConfig,
} from '@/types/config.js';
import { fontsConfig, allFonts } from '@/config/fonts/index.js';
import { buildConfig } from '@/config/build.js';
import { subsettingConfig } from '@/config/subsetting.js';
import { getEnvironmentConfig } from '@/config/environments/index.js';

export class ConfigManager {
  private static _fontsConfig: FontsConfig;
  private static _buildConfig: BuildConfig;
  private static _environmentConfig: EnvironmentConfig;

  // Load complete configuration
  static load(): FontsConfig {
    if (!this._fontsConfig) {
      this._fontsConfig = {
        ...fontsConfig,
        subsetting: {
          formats: [...subsettingConfig.formats],
          compression: subsettingConfig.compression,
          hinting: subsettingConfig.hinting,
          desubroutinize: subsettingConfig.desubroutinize,
        },
      };
    }
    return this._fontsConfig;
  }

  // Get build configuration
  static getBuildConfig(): BuildConfig {
    if (!this._buildConfig) {
      this._buildConfig = buildConfig;
    }
    return this._buildConfig;
  }

  // Get environment configuration
  static getEnvironmentConfig(environment?: string): EnvironmentConfig {
    if (!this._environmentConfig || environment) {
      this._environmentConfig = getEnvironmentConfig(environment);
    }
    return this._environmentConfig;
  }

  // Get specific font configuration
  static getFontConfig(fontId: string): FontConfig {
    const config = this.load();
    const fontConfig = config.fonts[fontId];

    if (!fontConfig) {
      throw new Error(`Font configuration not found: ${fontId}`);
    }

    return fontConfig;
  }

  // Get all font IDs
  static getFontIds(): string[] {
    return Object.keys(allFonts);
  }

  // Validate font ID exists
  static validateFontId(fontId: string): boolean {
    return fontId in allFonts;
  }

  // Validate multiple font IDs
  static validateFontIds(fontIds: string[]): {
    valid: string[];
    invalid: string[];
  } {
    const valid: string[] = [];
    const invalid: string[] = [];

    fontIds.forEach((fontId) => {
      if (this.validateFontId(fontId)) {
        valid.push(fontId);
      } else {
        invalid.push(fontId);
      }
    });

    return { valid, invalid };
  }

  // Get fonts by type
  static getFontsByType(type?: string): Record<string, FontConfig> {
    const config = this.load();

    if (!type) {
      return config.fonts;
    }

    return Object.fromEntries(
      Object.entries(config.fonts).filter(
        ([, fontConfig]) => fontConfig.type === type
      )
    );
  }

  // Reset configuration cache (useful for testing)
  static reset(): void {
    // @ts-expect-error - Resetting private static properties
    this._fontsConfig = undefined;
    // @ts-expect-error - Resetting private static properties
    this._buildConfig = undefined;
    // @ts-expect-error - Resetting private static properties
    this._environmentConfig = undefined;
  }
}

// Export configurations for direct access
export { fontsConfig, buildConfig, subsettingConfig };
export {
  allFonts,
  chineseFonts,
  englishFonts,
  variableFonts,
} from '@/config/fonts/index.js';
export {
  getEnvironmentConfig,
  developmentConfig,
  productionConfig,
} from '@/config/environments/index.js';
