/**
 * Unified logging utility for UGAPP Regional Pricing.
 * Handles different log levels and ensures cleaner production logs.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private isDev = process.env.NODE_ENV === 'development';

  private log(level: LogLevel, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    if (level === 'debug' && !this.isDev) return;

    const output = data ? `${message} ${JSON.stringify(data, null, 2)}` : message;

    switch (level) {
      case 'info':
        console.info(`${prefix} ${output}`);
        break;
      case 'warn':
        console.warn(`${prefix} ${output}`);
        break;
      case 'error':
        console.error(`${prefix} ${output}`);
        break;
      case 'debug':
        console.log(`${prefix} ${output}`);
        break;
    }
  }

  info(message: string, data?: any) {
    this.log('info', message, data);
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data);
  }

  error(message: string, data?: any) {
    this.log('error', message, data);
  }

  debug(message: string, data?: any) {
    this.log('debug', message, data);
  }
}

export const logger = new Logger();
