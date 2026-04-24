export class QueueFullError extends Error {
  constructor(message = 'La file d’analyse est pleine.') {
    super(message);
    this.name = 'QueueFullError';
    this.status = 503;
    this.code = 'QUEUE_FULL';
  }
}

export class AnalysisQueue {
  constructor({ maxConcurrent = 1, maxQueueSize = 8 } = {}) {
    this.maxConcurrent = maxConcurrent;
    this.maxQueueSize = maxQueueSize;
    this.activeCount = 0;
    this.pending = [];
  }

  getStats() {
    return {
      active: this.activeCount,
      queued: this.pending.length,
      maxConcurrent: this.maxConcurrent,
      maxQueueSize: this.maxQueueSize,
    };
  }

  enqueue(task) {
    if (this.pending.length >= this.maxQueueSize) {
      return Promise.reject(new QueueFullError());
    }

    return new Promise((resolve, reject) => {
      this.pending.push({ task, resolve, reject });
      this.runNext();
    });
  }

  runNext() {
    while (this.activeCount < this.maxConcurrent && this.pending.length > 0) {
      const item = this.pending.shift();
      this.activeCount += 1;

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
