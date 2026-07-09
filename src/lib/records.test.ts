import { describe, expect, it } from 'vitest';
import {
  get_download_href,
  get_file_badge,
  get_sort_query,
  is_file_lane_record,
  is_visible_text_record,
  normalize_records,
  sort_records,
  to_slot_card
} from './records';
import type { api_record_t } from '../types';

const records: api_record_t[] = [
  {
    id: 2,
    is_file: false,
    content: 'second',
    created_at: 100,
    updated_at: 300
  },
  {
    id: 1,
    is_file: false,
    content: 'first',
    created_at: 200,
    updated_at: 200
  },
  {
    id: 3,
    is_file: true,
    filename: 'voice.MP3',
    mime: 'audio/mpeg',
    created_at: 50,
    updated_at: 400
  }
];

describe('record helpers', () => {
  it('detects visible text records', () => {
    expect(is_visible_text_record(records[0])).toBe(true);
    expect(is_visible_text_record({ ...records[0], content: '   ' })).toBe(false);
    expect(is_visible_text_record(records[2])).toBe(false);
  });

  it('detects file lane records', () => {
    expect(is_file_lane_record(records[2])).toBe(true);
    expect(
      is_file_lane_record({
        id: 4,
        is_file: false,
        filename: 'note.txt',
        content: 'file text',
        created_at: 10
      })
    ).toBe(true);
  });

  it('adds editable state to slot cards', () => {
    expect(to_slot_card(records[0])).toMatchObject({
      id: 2,
      draft: 'second',
      saving: false,
      deleting: false
    });
  });

  it('maps sort options to API query strings', () => {
    expect(get_sort_query('id-asc')).toBe('sort=id&order=asc');
    expect(get_sort_query('id-desc')).toBe('sort=id&order=desc');
    expect(get_sort_query('updated-asc')).toBe('sort=updated_at&order=asc');
    expect(get_sort_query('updated-desc')).toBe('sort=updated_at&order=desc');
  });

  it('sorts by id and updated timestamp', () => {
    expect(sort_records(records, 'id-asc').map((record) => record.id)).toEqual([
      1,
      2,
      3
    ]);
    expect(sort_records(records, 'updated-desc').map((record) => record.id)).toEqual([
      3,
      2,
      1
    ]);
  });

  it('normalizes records into text and file cards', () => {
    const normalized = normalize_records(records, 'id-asc', 'id-desc');

    expect(normalized.text_cards.map((record) => record.id)).toEqual([1, 2]);
    expect(normalized.file_cards.map((record) => record.id)).toEqual([3]);
  });

  it('formats file badges from extension or mime subtype', () => {
    expect(get_file_badge(records[2])).toBe('.mp3');
    expect(
      get_file_badge({
        id: 5,
        is_file: true,
        mime: 'application/pdf',
        created_at: 10
      })
    ).toBe('pdf');
  });

  it('builds download hrefs', () => {
    expect(get_download_href('/web/api', records[2])).toBe(
      '/web/api/?id=3&as=download'
    );
  });
});
