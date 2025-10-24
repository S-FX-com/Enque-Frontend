/**
 * Development Logger
 *
 * Conditional logger that only outputs in development mode.
 * In production, all logs except errors are silenced to improve performance.
 *
 * Usage:
 * import { devLog } from '@/lib/dev-logger';
 * devLog.log('Debug info');
 * devLog.warn('Warning');
 * devLog.error('Error'); // Always logged
 */

const isDev = process.env.NODE_ENV === 'development';

export const devLog = {
  /**
   * Standard log - only in development
   */
  log: isDev ? console.log.bind(console) : () => {},

  /**
   * Warning log - only in development
   */
  warn: isDev ? console.warn.bind(console) : () => {},

  /**
   * Error log - ALWAYS logged (even in production)
   */
  error: console.error.bind(console),

  /**
   * Info log - only in development
   */
  info: isDev ? console.info.bind(console) : () => {},

  /**
   * Debug log - only in development
   */
  debug: isDev ? console.debug.bind(console) : () => {},

  /**
   * Table log - only in development
   */
  table: isDev ? console.table.bind(console) : () => {},
};

/**
 * Performance logger - measures execution time
 * Only active in development
 */
export const perfLog = {
  start: (label: string): number => {
    if (!isDev) return 0;
    console.time(label);
    return performance.now();
  },

  end: (label: string, startTime?: number): void => {
    if (!isDev) return;
    if (startTime) {
      const duration = performance.now() - startTime;
      console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
    } else {
      console.timeEnd(label);
    }
  },
};
