import { describe, expect, it, vi } from 'vitest';
import { AnalysisQueue, QueueFullError } from '../../services/queue.service.js';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('AnalysisQueue', () => {
  it('runs tasks up to maxConcurrent and keeps extra tasks queued', async () => {
    const queue = new AnalysisQueue({ maxConcurrent: 2, maxQueueSize: 4 });
    const first = deferred();
    const second = deferred();
    const third = deferred();

    const firstTask = vi.fn(() => first.promise);
    const secondTask = vi.fn(() => second.promise);
    const thirdTask = vi.fn(() => third.promise);

    const firstResult = queue.enqueue(firstTask);
    const secondResult = queue.enqueue(secondTask);
    const thirdResult = queue.enqueue(thirdTask);

    await flushPromises();

    expect(firstTask).toHaveBeenCalledTimes(1);
    expect(secondTask).toHaveBeenCalledTimes(1);
    expect(thirdTask).not.toHaveBeenCalled();
    expect(queue.getStats()).toMatchObject({ active: 2, queued: 1 });

    first.resolve('first done');
    await expect(firstResult).resolves.toBe('first done');
    await flushPromises();

    expect(thirdTask).toHaveBeenCalledTimes(1);
    expect(queue.getStats()).toMatchObject({ active: 2, queued: 0 });

    second.resolve('second done');
    third.resolve('third done');

    await expect(secondResult).resolves.toBe('second done');
    await expect(thirdResult).resolves.toBe('third done');
    await flushPromises();

    expect(queue.getStats()).toMatchObject({ active: 0, queued: 0 });
  });

  it('rejects immediately when the pending queue is full', async () => {
    const queue = new AnalysisQueue({ maxConcurrent: 1, maxQueueSize: 1 });
    const blocker = deferred();

    queue.enqueue(() => blocker.promise);
    queue.enqueue(() => Promise.resolve('queued'));

    await expect(queue.enqueue(() => Promise.resolve('too much'))).rejects.toBeInstanceOf(
      QueueFullError,
    );
    await expect(queue.enqueue(() => Promise.resolve('too much'))).rejects.toMatchObject({
      status: 503,
      code: 'QUEUE_FULL',
    });

    blocker.resolve('released');
    await flushPromises();
  });

  it('continues processing after a task rejects', async () => {
    const queue = new AnalysisQueue({ maxConcurrent: 1, maxQueueSize: 3 });
    const firstError = new Error('Stockfish crashed');

    const rejected = queue.enqueue(() => Promise.reject(firstError));
    const recovered = queue.enqueue(() => Promise.resolve('next task ok'));

    await expect(rejected).rejects.toBe(firstError);
    await expect(recovered).resolves.toBe('next task ok');
    expect(queue.getStats()).toMatchObject({ active: 0, queued: 0 });
  });
});
