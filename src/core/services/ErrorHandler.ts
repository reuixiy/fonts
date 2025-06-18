// Centralized error handler
import chalk from 'chalk';

export class ErrorHandler {
  static handle(error: unknown, context: string): Error {
    const errorObj = error instanceof Error ? error : new Error(String(error));

    console.error(chalk.red('❌ Error in'), chalk.yellow(context));
    console.error(chalk.red('Message:'), errorObj.message);

    if (errorObj.stack) {
      console.error(chalk.gray('Stack:'), errorObj.stack);
    }

    return errorObj;
  }

  static async handleAsync<T>(
    operation: () => Promise<T>,
    context: string,
    fallback?: T
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const handledError = this.handle(error, context);

      if (fallback !== undefined) {
        console.warn(chalk.yellow('⚠️ Falling back to default value'));
        return fallback;
      }

      throw handledError;
    }
  }

  static handleSync<T>(operation: () => T, context: string, fallback?: T): T {
    try {
      return operation();
    } catch (error) {
      const handledError = this.handle(error, context);

      if (fallback !== undefined) {
        console.warn(chalk.yellow('⚠️ Falling back to default value'));
        return fallback;
      }

      throw handledError;
    }
  }
}
