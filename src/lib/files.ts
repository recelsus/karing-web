export function selected_file_from_event(event: Event) {
  const target = event.currentTarget as HTMLInputElement;
  const file = target.files?.[0] ?? null;
  target.value = '';
  return file;
}

export function exceeds_file_limit(file: File, limit_bytes: number | null) {
  return limit_bytes !== null && file.size > limit_bytes;
}
