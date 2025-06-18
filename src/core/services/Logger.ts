// Structured logger
import chalk from 'chalk';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context?: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export class Logger {
  private static logLevel: LogLevel = 'info';
  private static logs: LogEntry[] = [];

  static setLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  static debug(
    message: string,
    context?: string,
    metadata?: Record<string, unknown>
  ): void {
    this.log('debug', message, context, metadata);
  }

  static info(
    message: string,
    context?: string,
    metadata?: Record<string, unknown>
  ): void {
    this.log('info', message, context, metadata);
  }

  static warn(
    message: string,
    context?: string,
    metadata?: Record<string, unknown>
  ): void {
    this.log('warn', message, context, metadata);
  }

  static error(
    message: string,
    context?: string,
    metadata?: Record<string, unknown>
  ): void {
    this.log('error', message, context, metadata);
  }

  private static log(
    level: LogLevel,
    message: string,
    context?: string,
    metadata?: Record<string, unknown>
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const entry: LogEntry = {
      timestamp,
      level,
      context,
      message,
      metadata,
    };

    this.logs.push(entry);
    this.writeToConsole(entry);
  }

  private static shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };

    return levels[level] >= levels[this.logLevel];
  }

  private static writeToConsole(entry: LogEntry): void {
    const contextStr = entry.context ? `[${entry.context}]` : '';
    const prefix = `${entry.timestamp} ${contextStr}`;

    switch (entry.level) {
      case 'debug':
        console.log(chalk.gray(prefix), chalk.gray(entry.message));
        break;
      case 'info':
        console.log(chalk.blue(prefix), entry.message);
        break;
      case 'warn':
        console.log(chalk.yellow(prefix), chalk.yellow(entry.message));
        break;
      case 'error':
        console.log(chalk.red(prefix), chalk.red(entry.message));
        break;
    }

    if (entry.metadata) {
      console.log(chalk.gray('  Metadata:'), entry.metadata);
    }
  }

  static getLogs(): LogEntry[] {
    return [...this.logs];
  }

  static clearLogs(): void {
    this.logs = [];
  }
}
