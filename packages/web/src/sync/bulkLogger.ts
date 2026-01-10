/**
 * bulkLogger.ts
 * -------------
 * Comprehensive logging system for all bulk operations in the application.
 * Provides detailed logging for debugging and monitoring bulk operations
 * across pagination boundaries.
 */

// Define log levels
type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'verbose';

// Configuration for bulk logging
const BULK_LOG_CONFIG = {
  enabled: true,
  level: 'verbose' as LogLevel, // 'info', 'warn', 'error', 'debug', 'verbose'
  maxLogHistory: 1000,
  showTimestamps: true
};

// Log history for debugging
const logHistory: string[] = [];

/**
 * Log a bulk operation message with appropriate formatting and level
 */
function logBulkOperation(level: LogLevel, message: string, data?: any): void {
  if (!BULK_LOG_CONFIG.enabled) return;

  // Check if this level should be logged
  const levels: LogLevel[] = ['error', 'warn', 'info', 'debug', 'verbose'];
  const currentLevelIndex = levels.indexOf(BULK_LOG_CONFIG.level);
  const messageLevelIndex = levels.indexOf(level);

  if (messageLevelIndex > currentLevelIndex) return;

  // Format timestamp
  const timestamp = BULK_LOG_CONFIG.showTimestamps
    ? new Date().toISOString()
    : '';

  // Format message based on level
  let formattedMessage = '';
  switch (level) {
    case 'error':
      formattedMessage = `%c[BULK ERROR] ${timestamp} ${message}`;
      console.error(formattedMessage, 'color:#F44336;font-weight:bold;', data || '');
      break;
    case 'warn':
      formattedMessage = `%c[BULK WARN] ${timestamp} ${message}`;
      console.warn(formattedMessage, 'color:#FF9800;font-weight:bold;', data || '');
      break;
    case 'info':
      formattedMessage = `%c[BULK INFO] ${timestamp} ${message}`;
      console.info(formattedMessage, 'color:#2196F3;font-weight:bold;', data || '');
      break;
    case 'debug':
      formattedMessage = `%c[BULK DEBUG] ${timestamp} ${message}`;
      console.debug(formattedMessage, 'color:#9C27B0;font-weight:bold;', data || '');
      break;
    case 'verbose':
      formattedMessage = `%c[BULK VERBOSE] ${timestamp} ${message}`;
      console.log(formattedMessage, 'color:#673AB7;font-weight:bold;', data || '');
      break;
  }

  // Add to log history
  logHistory.push(`[${level.toUpperCase()}] ${timestamp} ${message} ${data ? JSON.stringify(data) : ''}`);
  if (logHistory.length > BULK_LOG_CONFIG.maxLogHistory) {
    logHistory.shift();
  }
}

/**
 * Get the current log history
 */
export function getBulkLogHistory(): string[] {
  return [...logHistory];
}

/**
 * Clear the log history
 */
export function clearBulkLogHistory(): void {
  logHistory.length = 0;
}

/**
 * Configure bulk logging
 */
export function configureBulkLogging(config: Partial<typeof BULK_LOG_CONFIG>): void {
  Object.assign(BULK_LOG_CONFIG, config);
}

/**
 * Enable bulk logging
 */
export function enableBulkLogging(): void {
  BULK_LOG_CONFIG.enabled = true;
}

/**
 * Disable bulk logging
 */
export function disableBulkLogging(): void {
  BULK_LOG_CONFIG.enabled = false;
}

/**
 * Set log level
 */
export function setBulkLogLevel(level: LogLevel): void {
  BULK_LOG_CONFIG.level = level;
}

/**
 * Specific bulk operation logging functions
 */

export function bulkInfo(message: string, data?: any): void {
  logBulkOperation('info', message, data);
}

export function bulkWarn(message: string, data?: any): void {
  logBulkOperation('warn', message, data);
}

export function bulkError(message: string, data?: any): void {
  logBulkOperation('error', message, data);
}

export function bulkDebug(message: string, data?: any): void {
  logBulkOperation('debug', message, data);
}

export function bulkVerbose(message: string, data?: any): void {
  logBulkOperation('verbose', message, data);
}

/**
 * Log bulk operation start
 */
export function logBulkOperationStart(
  operationType: string,
  itemCount: number,
  context: string = ''
): void {
  bulkInfo(`Starting ${operationType} operation`, {
    operationType,
    itemCount,
    context,
    timestamp: new Date().toISOString()
  });
}

/**
 * Log bulk operation progress
 */
export function logBulkOperationProgress(
  operationType: string,
  processedCount: number,
  totalCount: number,
  currentItem?: string
): void {
  const percentage = Math.round((processedCount / totalCount) * 100);
  bulkDebug(`Progress: ${operationType} - ${processedCount}/${totalCount} (${percentage}%)`, {
    operationType,
    processedCount,
    totalCount,
    percentage,
    currentItem
  });
}

/**
 * Log bulk operation completion
 */
export function logBulkOperationCompletion(
  operationType: string,
  successCount: number,
  totalCount: number,
  durationMs?: number
): void {
  const successRate = Math.round((successCount / totalCount) * 100);
  bulkInfo(`Completed ${operationType} operation`, {
    operationType,
    successCount,
    totalCount,
    successRate: `${successRate}%`,
    durationMs: durationMs ? `${durationMs}ms` : 'not measured'
  });
}

/**
 * Log bulk operation failure
 */
export function logBulkOperationFailure(
  operationType: string,
  error: Error,
  context?: any
): void {
  bulkError(`Failed ${operationType} operation`, {
    operationType,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    context
  });
}

/**
 * Log pagination-related bulk operation details
 */
export function logPaginationDetails(
  operationType: string,
  visibleCount: number,
  totalCount: number,
  selectedCount: number,
  pageInfo?: {
    currentPage?: number;
    pageSize?: number;
    totalPages?: number;
  }
): void {
  bulkDebug(`Pagination details for ${operationType}`, {
    operationType,
    visibleCount,
    totalCount,
    selectedCount,
    pageInfo: pageInfo || {
      currentPage: 'unknown',
      pageSize: 'unknown',
      totalPages: 'unknown'
    }
  });
}

/**
 * Log selection state for debugging
 */
export function logSelectionState(
  selectedIds: string[],
  allItemIds: string[],
  context: string = ''
): void {
  const selectedCount = selectedIds.length;
  const totalCount = allItemIds.length;
  const selectedPercentage = Math.round((selectedCount / totalCount) * 100);

  // Check if all selected items are in the full list
  const missingSelections = selectedIds.filter(id => !allItemIds.includes(id));
  const hasMissingSelections = missingSelections.length > 0;

  bulkDebug(`Selection state ${context ? `(${context})` : ''}`, {
    selectedCount,
    totalCount,
    selectedPercentage: `${selectedPercentage}%`,
    hasMissingSelections,
    missingSelectionCount: missingSelections.length,
    sampleSelectedIds: selectedIds.slice(0, 5),
    sampleAllIds: allItemIds.slice(0, 5)
  });

  if (hasMissingSelections) {
    bulkWarn(`Missing selections detected in ${context}`, {
      missingSelections,
      context
    });
  }
}