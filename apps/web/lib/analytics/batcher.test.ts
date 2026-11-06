import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { AnalyticsBatcher } from './batcher';

describe('AnalyticsBatcher', () => {
  let batcher: AnalyticsBatcher;

  beforeEach(() => {
    vi.useFakeTimers();
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    batcher = new AnalyticsBatcher('/v1/events');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('queues events and flushes after timer expires', async () => {
    batcher.track('page_view', { path: '/discover' });
    expect(batcher.getQueueLength()).toBe(1);

    vi.advanceTimersByTime(5000);

    expect(global.fetch).toHaveBeenCalledWith(
      '/v1/events',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(batcher.getQueueLength()).toBe(0);
  });

  it('automatically flushes immediately when queue reaches max batch size', () => {
    for (let i = 0; i < 10; i++) {
      batcher.track('product_view', { productId: `p-${i}` });
    }

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(batcher.getQueueLength()).toBe(0);
  });

  it('flushes synchronously on beacon call', () => {
    const sendBeacon = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'sendBeacon', {
      value: sendBeacon,
      configurable: true,
      writable: true,
    });

    batcher.track('before_unload_event', { action: 'exit' });
    expect(batcher.getQueueLength()).toBe(1);

    batcher.flushSync();

    expect(sendBeacon).toHaveBeenCalledWith('/v1/events', expect.any(Blob));
    expect(batcher.getQueueLength()).toBe(0);
  });
});
