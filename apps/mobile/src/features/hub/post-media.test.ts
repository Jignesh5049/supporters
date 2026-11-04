import { MEDIA_LIMITS } from '@supporters/shared';
import { mediaProblem, resizeFor, videoProblem, type PickedMedia } from './post-media';

const image = (n: number): PickedMedia => ({
  uri: `file:///${n}.jpg`,
  kind: 'image',
  contentType: 'image/jpeg',
});
const video: PickedMedia = { uri: 'file:///v.mp4', kind: 'video', contentType: 'video/mp4' };

describe('resizeFor', () => {
  it('shrinks the longest side to 2048', () => {
    expect(resizeFor(4000, 3000)).toEqual({ width: 2048 });
    expect(resizeFor(3000, 4000)).toEqual({ height: 2048 });
  });

  it('leaves small photos alone', () => {
    expect(resizeFor(2048, 1000)).toBeNull();
  });
});

describe('videoProblem', () => {
  it('accepts a video at the limits', () => {
    expect(
      videoProblem(MEDIA_LIMITS.videoMaxSeconds * 1000, MEDIA_LIMITS.videoMaxBytes),
    ).toBeNull();
  });

  it('refuses a long or large video', () => {
    expect(videoProblem(61_000, 1)).toBe('video-too-long');
    expect(videoProblem(1_000, MEDIA_LIMITS.videoMaxBytes + 1)).toBe('video-too-large');
  });

  it('lets an unknown size or duration through, for the API to check', () => {
    expect(videoProblem(undefined, null)).toBeNull();
  });
});

describe('mediaProblem', () => {
  it('allows up to 10 photos', () => {
    const nine = Array.from({ length: 9 }, (_, i) => image(i));
    expect(mediaProblem(nine, [image(10)])).toBeNull();
    expect(mediaProblem(nine, [image(10), image(11)])).toBe('too-many-images');
  });

  it('never mixes photos and a video, or takes two videos', () => {
    expect(mediaProblem([image(1)], [video])).toBe('mixed');
    expect(mediaProblem([video], [image(1)])).toBe('mixed');
    expect(mediaProblem([video], [video])).toBe('mixed');
    expect(mediaProblem([], [video])).toBeNull();
  });
});
