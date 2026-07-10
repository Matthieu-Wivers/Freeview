/**
 * Domain error returned when accepting more analysis work would exceed the
 * configured queue capacity. HTTP metadata lets the central error middleware
 * translate the condition without coupling this service to Express.
 */
export class QueueFullError extends Error {
  constructor(message = 'La file d’analyse est pleine.') {
    super(message);
    this.name = 'QueueFullError';
    this.status = 503;
    this.code = 'QUEUE_FULL';
  }
}

/**
 * Bounded in-memory FIFO queue for Stockfish work.
 *
 * Concurrency and queue-size limits protect CPU and memory while preserving
 * deterministic first-in-first-out execution for accepted tasks.
 */
export class AnalysisQueue {
  /**
 * @param {{maxConcurrent?: number, maxQueueSize?: number}} options
 */
constructor({ maxConcurrent = 1, maxQueueSize = 8 } = {}) {
    this.maxConcurrent = maxConcurrent;
    this.maxQueueSize = maxQueueSize;
    this.activeCount = 0;
    this.pending = [];
  }

  /**
 * Returns an immutable operational snapshot for health or monitoring endpoints.
 */
getStats() {
    return {
      active: this.activeCount,
      queued: this.pending.length,
      maxConcurrent: this.maxConcurrent,
      maxQueueSize: this.maxQueueSize,
    };
  }

  /**
 * Schedules a lazy asynchronous task.
 *
 * @param {() => Promise<unknown>|unknown} task Work that starts only when a slot is available.
 * @returns {Promise<unknown>} The task result.
 * @throws {QueueFullError} When the pending queue is already at capacity.
 */
enqueue(task) {
    if (this.pending.length >= this.maxQueueSize) {
      return Promise.reject(new QueueFullError());
    }

    return new Promise((resolve, reject) => {
      this.pending.push({ task, resolve, reject });
      this.runNext();
    });
  }

  /**
 * Starts as many pending tasks as allowed by the concurrency limit.
 * Re-entry from finally guarantees progress after both success and failure.
 * @private
 */
runNext() {
    while (this.activeCount < this.maxConcurrent && this.pending.length > 0) {
      const item = this.pending.shift();
      this.activeCount += 1;

      // The promise boundary captures both synchronous throws and asynchronous failures.
Promise.resolve()
        .then(item.task)
        .then(item.resolve, item.reject)
        .finally(() => {
          this.activeCount -= 1;
          this.runNext();
        });
    }
  }
}
