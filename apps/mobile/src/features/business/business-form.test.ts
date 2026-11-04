import { makeMyBusiness } from '../catalog/fixtures';
import { uuid } from '../social/fixtures';
import {
  buildCreateBusinessInput,
  buildUpdateBusinessInput,
  businessToForm,
  emptyBusinessForm,
  normalisePhone,
  normaliseTime,
  type BusinessFormValues,
} from './business-form';

const filled = (overrides: Partial<BusinessFormValues> = {}): BusinessFormValues => ({
  ...emptyBusinessForm(),
  name: ' Asha Traders ',
  type: 'manufacturer',
  categoryId: uuid(800),
  cityId: uuid(901),
  ...overrides,
});

describe('normalisePhone', () => {
  it('adds +91 to 10 digits and tolerates spaces, dashes and a leading 91 or 0', () => {
    expect(normalisePhone('98765 43210')).toBe('+919876543210');
    expect(normalisePhone('098765-43210')).toBe('+919876543210');
    expect(normalisePhone('919876543210')).toBe('+919876543210');
    expect(normalisePhone('+919876543210')).toBe('+919876543210');
    expect(normalisePhone('  ')).toBe('');
  });
});

describe('normaliseTime', () => {
  it('pads hours and adds minutes', () => {
    expect(normaliseTime('9')).toBe('09:00');
    expect(normaliseTime('9:30')).toBe('09:30');
    expect(normaliseTime('0930')).toBe('09:30');
    expect(normaliseTime('nine')).toBe('nine');
  });
});

describe('buildCreateBusinessInput', () => {
  it('builds the body with the shared schema and trims the name', () => {
    const result = buildCreateBusinessInput(filled({ contactPhone: '98765 43210' }));
    expect(result).toMatchObject({
      ok: true,
      input: { name: 'Asha Traders', type: 'manufacturer', contactPhone: '+919876543210' },
    });
  });

  it('names the missing required field', () => {
    expect(buildCreateBusinessInput(filled({ name: '' }))).toEqual({
      ok: false,
      message: 'Enter your business name.',
    });
    expect(buildCreateBusinessInput(filled({ type: '' }))).toMatchObject({ ok: false });
    expect(buildCreateBusinessInput(filled({ categoryId: '' }))).toMatchObject({
      message: 'Choose a category.',
    });
    expect(buildCreateBusinessInput(filled({ cityId: '' }))).toMatchObject({
      message: 'Choose your state and city.',
    });
  });

  it('leaves empty optional fields out', () => {
    const result = buildCreateBusinessInput(filled());
    // The API client sends JSON, which drops undefined.
    expect(result.ok && Object.keys(JSON.parse(JSON.stringify(result.input))).sort()).toEqual(
      ['categoryId', 'cityId', 'isContactPublic', 'name', 'socials', 'type'].sort(),
    );
  });

  it('refuses a phone, a PIN code and a link the schema rejects, naming the field', () => {
    expect(buildCreateBusinessInput(filled({ contactPhone: '12345' }))).toMatchObject({
      ok: false,
      message: expect.stringContaining('Contact phone'),
    });
    expect(buildCreateBusinessInput(filled({ pincode: '12' }))).toMatchObject({
      message: expect.stringContaining('PIN code'),
    });
    expect(buildCreateBusinessInput(filled({ website: 'javascript:alert(1)' }))).toMatchObject({
      ok: false,
    });
  });

  it('collects social links and opening hours', () => {
    const values = filled({ instagram: 'https://instagram.com/asha' });
    values.hours.mon = { opens: '9', closes: '18:30' };
    const result = buildCreateBusinessInput(values);
    expect(result).toMatchObject({
      ok: true,
      input: {
        socials: { instagram: 'https://instagram.com/asha' },
        openingHours: [{ day: 'mon', opens: '09:00', closes: '18:30' }],
      },
    });
  });

  it('asks for both times of a day, and a closing time after the opening time', () => {
    const half = filled();
    half.hours.wed = { opens: '09:00', closes: '' };
    expect(buildCreateBusinessInput(half)).toEqual({
      ok: false,
      message: 'Enter both opening and closing time for Wednesday.',
    });
    const backwards = filled();
    backwards.hours.wed = { opens: '18:00', closes: '09:00' };
    expect(buildCreateBusinessInput(backwards)).toMatchObject({ ok: false });
  });
});

describe('buildUpdateBusinessInput', () => {
  it('round-trips the owner business without changes', () => {
    const business = makeMyBusiness();
    const result = buildUpdateBusinessInput(businessToForm(business));
    expect(result).toMatchObject({
      ok: true,
      input: {
        name: 'Asha Traders',
        contactPhone: '+919876543210',
        categoryId: business.category.id,
        cityId: business.city.id,
        isContactPublic: true,
      },
    });
  });

  it('keeps a second slot on the same day so saving does not drop it', () => {
    const form = businessToForm(makeMyBusiness());
    expect(form.hours.tue).toEqual({ opens: '09:00', closes: '18:00' });
    expect(form.extraSlots).toEqual([{ day: 'tue', opens: '19:00', closes: '21:00' }]);
    const result = buildUpdateBusinessInput(form);
    expect(result.ok && result.input.openingHours).toHaveLength(3);
  });

  it('clears emptied optional fields with null', () => {
    const form = { ...businessToForm(makeMyBusiness()), about: '', contactPhone: '', address: '' };
    const result = buildUpdateBusinessInput(form);
    expect(result).toMatchObject({
      ok: true,
      input: { about: null, contactPhone: null, address: null },
    });
  });

  it('keeps the chosen logo and cover ids', () => {
    const form = {
      ...businessToForm(makeMyBusiness()),
      logoMediaId: uuid(5),
      coverMediaId: uuid(6),
    };
    expect(buildUpdateBusinessInput(form)).toMatchObject({
      input: { logoMediaId: uuid(5), coverMediaId: uuid(6) },
    });
  });
});
