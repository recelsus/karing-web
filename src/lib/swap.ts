export function toggle_swap_selection(selected_ids: number[], id: number) {
  if (selected_ids.includes(id)) {
    return selected_ids.filter((item) => item !== id);
  }

  if (selected_ids.length < 2) {
    return [...selected_ids, id];
  }

  return [selected_ids[1], id];
}
