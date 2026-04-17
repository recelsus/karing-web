import { get_sort_query, normalize_records } from './records';
import type { api_record_t, search_response_t, sort_option_t } from '../types';

export async function parse_error(response: Response) {
  try {
    const json = await response.json();
    if (json?.message) return json.message as string;
  } catch {
    return `request failed: ${response.status}`;
  }

  return `request failed: ${response.status}`;
}

function parse_size_mb_to_bytes(value: string | undefined) {
  if (!value) return null;
  const matched = value.trim().match(/^(\d+)\s*MB$/i);
  if (!matched) return null;
  return Number(matched[1]) * 1024 * 1024;
}

export async function load_records_by_ids(api_base: string, ids: number[]) {
  const unique_ids = [...new Set(ids)];
  const records = await Promise.all(
    unique_ids.map(async (id) => {
      const response = await fetch(`${api_base}/?id=${id}&json=true`, {
        headers: {
          Accept: 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(await parse_error(response));
      }

      const json = (await response.json()) as search_response_t;
      return json.data?.[0] ?? null;
    })
  );

  return records.filter((record): record is api_record_t => record !== null);
}

export async function load_slot_records(
  api_base: string,
  search_query: string,
  sort_option: sort_option_t,
  file_sort_option: sort_option_t
) {
  const query = search_query.trim();
  const response = await fetch(
    query
      ? `${api_base}/search/live?limit=1000&q=${encodeURIComponent(query)}`
      : `${api_base}/search?limit=1000&${get_sort_query(sort_option)}`,
    {
      headers: {
        Accept: 'application/json'
      }
    }
  );

  if (!response.ok) {
    throw new Error(await parse_error(response));
  }

  const json = (await response.json()) as search_response_t;
  const records = query
    ? await load_records_by_ids(
        api_base,
        (json.data ?? []).map((record) => record.id)
      )
    : (json.data ?? []);

  return normalize_records(records, sort_option, file_sort_option);
}

export async function create_text_slot(api_base: string, content: string) {
  const response = await fetch(`${api_base}/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({ content })
  });

  if (!response.ok) {
    throw new Error(await parse_error(response));
  }
}

export async function save_text_slot(
  api_base: string,
  id: number,
  content: string
) {
  const response = await fetch(`${api_base}/?id=${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({ content })
  });

  if (!response.ok) {
    throw new Error(await parse_error(response));
  }
}

export async function delete_slot_record(api_base: string, id: number) {
  const response = await fetch(`${api_base}/?id=${id}`, {
    method: 'DELETE'
  });

  if (!response.ok && response.status !== 204) {
    throw new Error(await parse_error(response));
  }
}

export async function swap_slot_records(
  api_base: string,
  id_1: number,
  id_2: number
) {
  const response = await fetch(`${api_base}/swap?id1=${id_1}&id2=${id_2}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(await parse_error(response));
  }
}

export async function fetch_file_limit_bytes(api_base: string) {
  const response = await fetch(`${api_base}/health`, {
    headers: {
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(await parse_error(response));
  }

  const json = (await response.json()) as {
    size?: {
      file?: string;
    };
  };

  return parse_size_mb_to_bytes(json.size?.file);
}

export async function upload_slot_file(
  api_base: string,
  file: File,
  on_progress: (progress: number) => void
) {
  await new Promise<void>((resolve, reject) => {
    const form_data = new FormData();
    form_data.append('file', file);
    form_data.append('filename', file.name);
    form_data.append('mime', file.type || 'application/octet-stream');

    const request = new XMLHttpRequest();
    request.open('POST', `${api_base}/`);
    request.setRequestHeader('Accept', 'application/json');

    request.upload.addEventListener('progress', (progress_event) => {
      if (!progress_event.lengthComputable) return;
      on_progress(
        Math.round((progress_event.loaded / progress_event.total) * 100)
      );
    });

    request.addEventListener('load', () => {
      if (request.status >= 200 && request.status < 300) {
        on_progress(100);
        resolve();
        return;
      }

      let message = `request failed: ${request.status}`;
      try {
        const parsed = JSON.parse(request.responseText) as { message?: string };
        if (parsed.message) message = parsed.message;
      } catch {
        // keep fallback message
      }
      reject(new Error(message));
    });

    request.addEventListener('error', () => {
      reject(new Error('Upload failed.'));
    });

    request.send(form_data);
  });
}
