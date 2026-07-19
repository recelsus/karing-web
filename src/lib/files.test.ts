import { describe, expect, it } from 'vitest';
import { exceeds_file_limit } from './files';

describe('file helpers', () => {
  it('detects files over a configured byte limit', () => {
    const file = new File(['12345'], 'sample.txt');

    expect(exceeds_file_limit(file, null)).toBe(false);
    expect(exceeds_file_limit(file, 5)).toBe(false);
    expect(exceeds_file_limit(file, 4)).toBe(true);
  });
});
