import { describe, expect, it } from 'vitest';
import { toggle_swap_selection } from './swap';

describe('toggle_swap_selection', () => {
  it('adds an id while fewer than two ids are selected', () => {
    expect(toggle_swap_selection([], 10)).toEqual([10]);
    expect(toggle_swap_selection([10], 20)).toEqual([10, 20]);
  });

  it('removes an id when it is already selected', () => {
    expect(toggle_swap_selection([10, 20], 10)).toEqual([20]);
  });

  it('keeps two ids by dropping the oldest when a third id is selected', () => {
    expect(toggle_swap_selection([10, 20], 30)).toEqual([20, 30]);
  });
});
