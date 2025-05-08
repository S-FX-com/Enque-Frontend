/**
 * Simple logger utility for the frontend application.
 * Logs are stored in localStorage for viewing in the /logs page.
 */

interface LogEntry {
  timestamp: string;
  level: 'info' | 'error' | 'warn';
  message: string;
  details?: string;
}

// Maximum number of logs to keep in storage
const MAX_LOGS = 100;

// Storage key
const STORAGE_KEY = 'app_logs';

// Get all logs from storage
const getLogs = (): LogEntry[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error retrieving logs:', error);
  }
  return [];
};

// Save logs to storage
const saveLogs = (logs: LogEntry[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch (error) {
    console.error('Error saving logs:', error);
  }
};

// Add a log entry
const addLog = (level: 'info' | 'error' | 'warn', message: string, details?: string): void => {
  try {
    const newLog: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      details,
    };

    // Get current logs and add new entry
    const logs = getLogs();
    logs.unshift(newLog);

    // Limit the number of logs
    if (logs.length > MAX_LOGS) {
      logs.length = MAX_LOGS;
    }

    // Save back to storage
    saveLogs(logs);
  } catch (error) {
    console.error('Error adding log:', error);
  }
};

// Clear all logs
const clearLogs = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing logs:', error);
  }
};

// Export the logger interface
export const logger = {
  info: (message: string, details?: string) => {
    console.info(message);
    addLog('info', message, details);
  },

  warn: (message: string, details?: string) => {
    console.warn(message);
    addLog('warn', message, details);
  },

  error: (message: string, details?: string) => {
    console.error(message);
    addLog('error', message, details);
  },

  // API request logging
  logRequest: (method: string, url: string, status: number, time: number) => {
    const isError = status >= 400;
    const level = isError ? 'error' : time > 1000 ? 'warn' : 'info';
    const message = `${method} ${url} - ${status}`;
    const details = `Response time: ${time}ms`;

    addLog(level, message, details);
  },

  // Get all logs
  getLogs,

  // Clear logs
  clearLogs,
};
