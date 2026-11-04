import { businessTypeLabel, listingsUsage, openingHoursSummary, safeWebUrl } from './labels';

describe('safeWebUrl', () => {
  it('adds https to a bare domain', () => {
    expect(safeWebUrl('asha.example.com')).toBe('https://asha.example.com/');
  });

  it('keeps http and https links', () => {
    expect(safeWebUrl('http://asha.example.com/a')).toBe('http://asha.example.com/a');
  });

  it.each(['javascript:alert(1)', 'tel:+911234567890', 'file:///etc/passwd', '', null])(
    'refuses %p',
    (raw) => {
      expect(safeWebUrl(raw)).toBeNull();
    },
  );
});

describe('businessTypeLabel', () => {
  it('reads like the prototype labels', () => {
    expect(businessTypeLabel('service_provider')).toBe('Service Provider');
  });
});

describe('openingHoursSummary', () => {
  it('joins days with the same times into a range', () => {
    const slots = (['mon', 'tue', 'wed', 'sat'] as const).map((day) => ({
      day,
      opens: '09:00',
      closes: '18:00',
    }));
    expect(openingHoursSummary(slots)).toBe('Mon - Wed: 09:00 - 18:00, Sat: 09:00 - 18:00');
  });

  it('lists split shifts on one day and is null with no hours', () => {
    expect(
      openingHoursSummary([
        { day: 'mon', opens: '09:00', closes: '13:00' },
        { day: 'mon', opens: '15:00', closes: '19:00' },
      ]),
    ).toBe('Mon: 09:00 - 13:00, 15:00 - 19:00');
    expect(openingHoursSummary([])).toBeNull();
  });
});

describe('listingsUsage', () => {
  it('shows published against the limit', () => {
    expect(listingsUsage(12, 25)).toEqual({ label: '12 / 25', atLimit: false });
    expect(listingsUsage(25, 25)).toEqual({ label: '25 / 25', atLimit: true });
  });

  it('shows only the count when there is no limit', () => {
    expect(listingsUsage(40, null)).toEqual({ label: '40', atLimit: false });
  });
});
