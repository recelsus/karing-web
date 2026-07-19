import { describe, expect, it } from 'vitest';
import {
  can_move_before,
  empty_move_state,
  hover_move_target,
  start_move
} from './move';

describe('move helpers', () => {
  it('starts a drag move in a lane', () => {
    expect(start_move('text', 10)).toEqual({
      dragging_id: 10,
      dragging_lane: 'text',
      drag_over_id: null
    });
  });

  it('allows moving before another id in the same lane', () => {
    const state = start_move('file', 10);

    expect(can_move_before(state, 'file', 20)).toBe(true);
    expect(can_move_before(state, 'text', 20)).toBe(false);
    expect(can_move_before(state, 'file', 10)).toBe(false);
    expect(can_move_before(empty_move_state, 'file', 20)).toBe(false);
  });

  it('tracks the current drop target only for valid moves', () => {
    const state = start_move('text', 10);

    expect(hover_move_target(state, 'text', 20)).toMatchObject({
      drag_over_id: 20
    });
    expect(hover_move_target(state, 'file', 20)).toBe(state);
  });
});
