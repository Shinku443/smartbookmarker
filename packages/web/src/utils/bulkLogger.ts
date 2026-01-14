/**
 * Bulk Operations Logger
 * ----------------------
 * Utilities for logging and tracking bulk operations
 * across multiple bookmarks for better debugging and monitoring.
 */

export interface BulkOperationLog {
  operation: string;
  count: number;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  error?: Error;
  metadata?: Record<string, any>;
}

class BulkLogger {
  private logs: BulkOperationLog[] = [];
  private maxLogs = 50; // Keep last 50 operations

  start(operation: string, count: number, metadata?: Record<string, any>): string {
    const logId = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const log: BulkOperationLog = {
      operation,
      count,
      startTime: Date.now(),
      success: false,
      metadata
    };

    this.logs.unshift(log);

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    console.log(`🔄 [BULK START] ${operation} (${count} items)`, metadata || '');
    return logId;
  }

  complete(operation: string, count: number, success: boolean = true, error?: Error) {
    const log = this.logs.find(l => l.operation === operation && !l.endTime);
    if (log) {
      log.endTime = Date.now();
      log.duration = log.endTime - log.startTime;
      log.success = success;
      if (error) log.error = error;

      const status = success ? '✅ SUCCESS' : '❌ FAILED';
      const duration = log.duration ? ` in ${log.duration}ms` : '';
      console.log(`🔄 [BULK ${status}] ${operation} (${count} items)${duration}`, error ? error.message : '');
    }
  }

  fail(operation: string, error: Error, metadata?: Record<string, any>) {
    const log = this.logs.find(l => l.operation === operation && !l.endTime);
    if (log) {
      log.endTime = Date.now();
      log.duration = log.endTime - log.startTime;
      log.success = false;
      log.error = error;
      if (metadata) log.metadata = { ...log.metadata, ...metadata };
    }

    console.error(`🔄 [BULK FAILED] ${operation}:`, error.message, metadata || '');
  }

  getRecentLogs(limit: number = 10): BulkOperationLog[] {
    return this.logs.slice(0, limit);
  }

  getStats() {
    const total = this.logs.length;
    const successful = this.logs.filter(l => l.success).length;
    const failed = total - successful;
    const avgDuration = this.logs.reduce((sum, l) => sum + (l.duration || 0), 0) / total;

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total * 100).toFixed(1) + '%' : '0%',
      averageDuration: Math.round(avgDuration) + 'ms'
    };
  }
}

export const bulkLogger = new BulkLogger();

// Convenience functions
export function logBulkOperationStart(operation: string, count: number, context?: string) {
  return bulkLogger.start(operation, count, context ? { context } : undefined);
}

export function logBulkOperationCompletion(operation: string, count: number, expectedCount: number) {
  bulkLogger.complete(operation, count, count === expectedCount);
}

export function logBulkOperationFailure(operation: string, error: Error, metadata?: Record<string, any>) {
  bulkLogger.fail(operation, error, metadata);
}

export function getBulkOperationStats() {
  return bulkLogger.getStats();
}

export function getRecentBulkOperations(limit: number = 10) {
  return bulkLogger.getRecentLogs(limit);
}
