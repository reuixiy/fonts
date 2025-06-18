// CLI input validation utilities
import { ValidationUtils } from '@/utils/ValidationUtils.js';
import type { ValidationResult } from '@/cli/types.js';

export class CLIValidator {
  /**
   * Validate font IDs provided via CLI
   */
  static validateFontIds(fontIds: string[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (fontIds.length === 0) {
      errors.push('No font IDs provided');
      return { isValid: false, errors, warnings };
    }

    const { invalid } = ValidationUtils.validateFontIds(fontIds);

    if (invalid.length > 0) {
      errors.push(`Invalid font IDs: ${invalid.join(', ')}`);
      warnings.push(
        'Font IDs should contain only letters, numbers, hyphens, and underscores'
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate output directory path
   */
  static validateOutputDir(path: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!ValidationUtils.isNotEmpty(path)) {
      errors.push('Output directory path cannot be empty');
      return { isValid: false, errors, warnings };
    }

    if (!ValidationUtils.isSafePath(path)) {
      errors.push('Output directory path contains unsafe characters');
      warnings.push('Avoid using ".." or absolute paths for security');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate cache TTL value
   */
  static validateCacheTtl(value: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const ttl = parseInt(value, 10);

    if (isNaN(ttl)) {
      errors.push('Cache TTL must be a number');
      return { isValid: false, errors, warnings };
    }

    if (!ValidationUtils.isInRange(ttl, 0, 168)) {
      // 0 to 1 week
      errors.push('Cache TTL must be between 0 and 168 hours');
    }

    if (ttl === 0) {
      warnings.push('Cache TTL of 0 will disable caching');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate command exists
   */
  static validateCommand(
    command: string,
    validCommands: string[]
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!validCommands.includes(command)) {
      errors.push(`Unknown command: ${command}`);

      // Suggest similar commands
      const suggestions = validCommands.filter(
        (cmd) =>
          cmd.toLowerCase().includes(command.toLowerCase()) ||
          command.toLowerCase().includes(cmd.toLowerCase())
      );

      if (suggestions.length > 0) {
        warnings.push(`Did you mean: ${suggestions.join(', ')}?`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Format validation errors for display
   */
  static formatErrors(result: ValidationResult): string {
    let output = '';

    if (result.errors.length > 0) {
      output += 'Errors:\n';
      for (const error of result.errors) {
        output += `  - ${error}\n`;
      }
    }

    if (result.warnings.length > 0) {
      output += 'Warnings:\n';
      for (const warning of result.warnings) {
        output += `  - ${warning}\n`;
      }
    }

    return output;
  }
}
