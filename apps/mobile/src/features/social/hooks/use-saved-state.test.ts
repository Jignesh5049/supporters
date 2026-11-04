import type { SavedItem } from '@supporters/shared';
import { makePost, uuid } from '../fixtures';
import { savedTargetId } from './use-saved-state';

const base = { id: uuid(50), savedAt: '2026-11-04T10:00:00.000Z' };

describe('savedTargetId', () => {
  it('returns the id of the saved target for each type', () => {
    const post = makePost(1);
    expect(savedTargetId({ ...base, type: 'post', post } as SavedItem)).toBe(post.id);
    expect(savedTargetId({ ...base, type: 'product', product: { id: uuid(2) } } as SavedItem)).toBe(
      uuid(2),
    );
    expect(savedTargetId({ ...base, type: 'service', service: { id: uuid(3) } } as SavedItem)).toBe(
      uuid(3),
    );
    expect(
      savedTargetId({ ...base, type: 'business', business: { id: uuid(4) } } as SavedItem),
    ).toBe(uuid(4));
  });
});
