import { describe, expect, it } from 'vitest';
import { markNotificationsReadSchema, updateNotificationPrefsSchema } from './notifications';

describe('notification schemas', () => {
  it('refuses to switch off the locked account category', () => {
    const parse = (category: string) =>
      updateNotificationPrefsSchema.safeParse({
        prefs: [{ category, channel: 'push', enabled: false }],
      }).success;
    expect(parse('business')).toBe(true);
    expect(parse('account')).toBe(false);
  });

  it('marks ids or everything, nothing else', () => {
    const parse = (body: unknown) => markNotificationsReadSchema.safeParse(body).success;
    expect(parse({ all: true })).toBe(true);
    expect(parse({ ids: [crypto.randomUUID()] })).toBe(true);
    expect(parse({ all: false })).toBe(false);
    expect(parse({ ids: [] })).toBe(false);
    expect(parse({ ids: ['x'] })).toBe(false);
    expect(parse({ ids: [crypto.randomUUID()], all: true })).toBe(false);
    expect(parse({})).toBe(false);
  });
});
