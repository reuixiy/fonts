// Base service class with common functionality
import chalk from 'chalk';

export abstract class BaseService {
  protected name: string;
  protected isRunning = false;
  protected lastError?: Error;

  constructor(name: string) {
    this.name = name;
  }

  protected log(
    message: string,
    level: 'info' | 'warn' | 'error' | 'debug' = 'info'
  ): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${this.name}]`;

    switch (level) {
      case 'info':
        console.log(chalk.blue(prefix), message);
        break;
      case 'warn':
        console.log(chalk.yellow(prefix), message);
        break;
      case 'error':
        console.log(chalk.red(prefix), message);
        break;
      case 'debug':
        console.log(chalk.gray(prefix), message);
        break;
    }
  }

  protected async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    try {
      this.isRunning = true;
      this.log(`Starting ${operationName}...`);

      const result = await operation();

      this.log(`✅ ${operationName} completed successfully`, 'info');
      return result;
    } catch (error) {
      this.lastError =
        error instanceof Error ? error : new Error(String(error));
      this.log(
        `❌ ${operationName} failed: ${this.lastError.message}`,
        'error'
      );
      throw this.lastError;
    } finally {
      this.isRunning = false;
    }
  }

  public getStatus(): { isRunning: boolean; lastError?: Error } {
    return {
      isRunning: this.isRunning,
      lastError: this.lastError,
    };
  }
}
