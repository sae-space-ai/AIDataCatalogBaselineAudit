// ============================================================
// SERVER — Logger
// ============================================================
//
// Structured logging for server-side operations.
// 
// IMPORTANT: Never log secrets, tokens, or sensitive data.
//

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  requestId?: string;
  endpoint?: string;
  duration?: number;
  statusCode?: number;
  errorCode?: string;
  meta?: Record<string, unknown>;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let currentLevel: LogLevel = 'info';

/**
 * Set the current log level.
 */
export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

/**
 * Check if a log level should be logged.
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

/**
 * Format a log entry as JSON.
 */
function formatEntry(entry: LogEntry): string {
  return JSON.stringify(entry);
}

/**
 * Log a debug message.
 */
export function debug(message: string, meta?: Record<string, unknown>): void {
  if (!shouldLog('debug')) return;
  
  const entry: LogEntry = {
    level: 'debug',
    message,
    timestamp: new Date().toISOString(),
    meta,
  };
  
  console.debug(formatEntry(entry));
}

/**
 * Log an info message.
 */
export function info(message: string, meta?: Record<string, unknown>): void {
  if (!shouldLog('info')) return;
  
  const entry: LogEntry = {
    level: 'info',
    message,
    timestamp: new Date().toISOString(),
    meta,
  };
  
  console.info(formatEntry(entry));
}

/**
 * Log a warning message.
 */
export function warn(message: string, meta?: Record<string, unknown>): void {
  if (!shouldLog('warn')) return;
  
  const entry: LogEntry = {
    level: 'warn',
    message,
    timestamp: new Date().toISOString(),
    meta,
  };
  
  console.warn(formatEntry(entry));
}

/**
 * Log an error message.
 */
export function error(message: string, meta?: Record<string, unknown>): void {
  if (!shouldLog('error')) return;
  
  const entry: LogEntry = {
    level: 'error',
    message,
    timestamp: new Date().toISOString(),
    meta,
  };
  
  console.error(formatEntry(entry));
}

/**
 * Log an HTTP request.
 */
export function logRequest(
  requestId: string,
  endpoint: string,
  statusCode: number,
  duration: number,
  errorCode?: string
): void {
  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
  
  const entry: LogEntry = {
    level,
    message: `HTTP ${statusCode} ${endpoint}`,
    timestamp: new Date().toISOString(),
    requestId,
    endpoint,
    duration,
    statusCode,
    errorCode,
  };
  
  if (level === 'error') {
    console.error(formatEntry(entry));
  } else if (level === 'warn') {
    console.warn(formatEntry(entry));
  } else {
    console.info(formatEntry(entry));
  }
}
