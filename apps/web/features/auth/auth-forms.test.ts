import { describe, expect, it } from 'vitest';
import { registerFormSchema } from './auth-forms';

const base = {
  name: 'Ravi Kumar',
  phone: '9876543210',
  password: 'correct horse battery staple',
  confirmPassword: 'correct horse battery staple',
};

describe('registerFormSchema referral code', () => {
  it('treats an empty code as no code', () => {
    const parsed = registerFormSchema.parse({ ...base, referralCode: '  ' });
    expect(parsed.referralCode).toBeUndefined();
  });

  it('accepts a code in any case and sends it upper-case', () => {
    const parsed = registerFormSchema.parse({ ...base, referralCode: ' k7m2xq9p ' });
    expect(parsed.referralCode).toBe('K7M2XQ9P');
  });

  it('refuses a code that cannot exist, including look-alike characters', () => {
    for (const referralCode of ['abc', 'K7M2XQ9', 'K7M2XQ9PP', 'O0I1LLLL']) {
      expect(registerFormSchema.safeParse({ ...base, referralCode }).success).toBe(false);
    }
  });
});
