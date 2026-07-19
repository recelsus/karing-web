export type move_lane_t = 'text' | 'file';

export type move_state_t = {
  dragging_id: number | null;
  dragging_lane: move_lane_t | null;
  drag_over_id: number | null;
};

export const empty_move_state: move_state_t = {
  dragging_id: null,
  dragging_lane: null,
  drag_over_id: null
};

export function start_move(lane: move_lane_t, id: number): move_state_t {
  return {
    dragging_id: id,
    dragging_lane: lane,
    drag_over_id: null
  };
}

export function can_move_before(
  state: move_state_t,
  lane: move_lane_t,
  before_id: number
) {
  return (
    state.dragging_lane === lane &&
    state.dragging_id !== null &&
    state.dragging_id !== before_id
  );
}

export function hover_move_target(
  state: move_state_t,
  lane: move_lane_t,
  before_id: number
): move_state_t {
  if (!can_move_before(state, lane, before_id)) return state;
  return {
    ...state,
    drag_over_id: before_id
  };
}
