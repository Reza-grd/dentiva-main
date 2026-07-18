/**
 * Production-safe logger utility.
 *
 * In production (`import.meta.env.PROD === true`), all debug/info/log calls
 * are silenced automatically. Only `warn` and `error` are always active.
 *
 * Usage:
 *   import logger from '../utils/logger';
 *   logger.debug('something happened', payload);
 *   logger.info('User logged in');
 *   logger.warn('Slow query detected');
 *   logger.error('Failed to fetch', error);
 */

const isProd = typeof import.meta !== 'undefined' && import.meta.env?.PROD === true;

const noop = () => {};

const logger = {
  /** Only shown in development. Use for verbose debugging output. */
  debug: isProd ? noop : console.log.bind(console),

  /** Only shown in development. Use for general informational messages. */
  info: isProd ? noop : console.log.bind(console),

  /** Always shown. Use for recoverable but notable situations. */
  warn: console.warn.bind(console),

  /** Always shown. Use for errors and exceptions. */
  error: console.error.bind(console),
};

export default logger;
