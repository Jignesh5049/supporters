import { describe, expect, it } from 'vitest';
import { linkify } from './linkify';

describe('linkify', () => {
  it('links https URLs and leaves the rest as text, without trailing punctuation', () => {
    expect(linkify('See https://supporters.in/p/1. Thanks!')).toEqual([
      { kind: 'text', text: 'See ' },
      { kind: 'link', text: 'https://supporters.in/p/1', href: 'https://supporters.in/p/1' },
      { kind: 'text', text: '. Thanks!' },
    ]);
  });

  it('never links http, javascript or data URLs', () => {
    for (const text of [
      'http://example.com',
      'javascript:alert(1)',
      'data:text/html,<b>x</b>',
      'https://localhost/x',
    ]) {
      expect(linkify(text)).toEqual([{ kind: 'text', text }]);
    }
  });

  it('keeps markup as plain text', () => {
    expect(linkify('<img src=x onerror=alert(1)>')).toEqual([
      { kind: 'text', text: '<img src=x onerror=alert(1)>' },
    ]);
  });
});
