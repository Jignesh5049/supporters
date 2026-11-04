import { businessTypeLabel, safeWebUrl } from './labels';

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
