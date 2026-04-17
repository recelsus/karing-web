import {
  FILE_DATE_FIELD,
  INCLUDE_TEXT_FILES_IN_FILE_AREA
} from './constants';
import type { api_record_t, sort_option_t, slot_card_t } from '../types';

export function is_visible_text_record(record: api_record_t) {
  if (record.is_file) return false;
  return (record.content ?? '').trim().length > 0;
}

export function is_file_lane_record(record: api_record_t) {
  if (record.is_file) return true;
  return INCLUDE_TEXT_FILES_IN_FILE_AREA && Boolean(record.filename);
}

export function to_slot_card(record: api_record_t): slot_card_t {
  return {
    ...record,
    draft: record.content ?? '',
    saving: false,
    deleting: false
  };
}

export function get_sort_query(option: sort_option_t) {
  switch (option) {
    case 'id-asc':
      return 'sort=id&order=asc';
    case 'id-desc':
      return 'sort=id&order=desc';
    case 'updated-asc':
      return 'sort=updated_at&order=asc';
    case 'updated-desc':
      return 'sort=updated_at&order=desc';
  }
}

export function sort_records(records: api_record_t[], option: sort_option_t) {
  const sorted = [...records];
  const get_updated_value = (record: api_record_t) =>
    record.updated_at ?? record.created_at;

  sorted.sort((left, right) => {
    switch (option) {
      case 'id-asc':
        return left.id - right.id;
      case 'id-desc':
        return right.id - left.id;
      case 'updated-asc':
        return get_updated_value(left) - get_updated_value(right);
      case 'updated-desc':
        return get_updated_value(right) - get_updated_value(left);
    }
  });

  return sorted;
}

export function normalize_records(
  records: api_record_t[],
  sort_option: sort_option_t,
  file_sort_option: sort_option_t
) {
  return {
    text_cards: sort_records(records, sort_option)
      .filter(is_visible_text_record)
      .map(to_slot_card),
    file_cards: sort_records(records, file_sort_option)
      .filter(is_file_lane_record)
      .map(to_slot_card)
  };
}

export function format_timestamp(unix_seconds?: number) {
  if (!unix_seconds) return 'timestamp unavailable';

  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(unix_seconds * 1000));
}

export function get_file_badge(record: api_record_t) {
  if (record.filename?.includes('.')) {
    const ext = record.filename.split('.').pop()?.trim();
    if (ext) return `.${ext.toLowerCase()}`;
  }

  if (record.mime) {
    const [, subtype = 'file'] = record.mime.split('/');
    return subtype.replace(/^x-/, '').replace(/\+.*/, '');
  }

  return 'file';
}

export function get_file_date(record: api_record_t) {
  if (FILE_DATE_FIELD === 'created') return record.created_at;
  return record.updated_at ?? record.created_at;
}

export function get_download_href(api_base: string, record: api_record_t) {
  return `${api_base}/?id=${record.id}&as=download`;
}
