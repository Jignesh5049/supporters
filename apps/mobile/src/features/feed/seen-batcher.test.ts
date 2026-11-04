import { createSeenBatcher } from './seen-batcher';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('createSeenBatcher', () => {
  it('sends each id once, after the delay', () => {
    const send = jest.fn().mockResolvedValue(undefined);
    const batcher = createSeenBatcher(send, { delayMs: 1000, max: 50 });
    batcher.add(['a', 'b']);
    batcher.add(['b', 'c']);
    expect(send).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1000);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(['a', 'b', 'c']);
    batcher.add(['a']);
    jest.advanceTimersByTime(1000);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('flushes at once when a batch is full', () => {
    const send = jest.fn().mockResolvedValue(undefined);
    createSeenBatcher(send, { max: 2 }).add(['a', 'b', 'c']);
    expect(send).toHaveBeenNthCalledWith(1, ['a', 'b']);
  });

  it('lets a failed batch be sent again', async () => {
    const send = jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
    const batcher = createSeenBatcher(send, { delayMs: 10 });
    batcher.add(['a']);
    jest.advanceTimersByTime(10);
    await Promise.resolve();
    await Promise.resolve();
    batcher.add(['a']);
    jest.advanceTimersByTime(10);
    expect(send).toHaveBeenCalledTimes(2);
  });
});
