<script lang="ts">
  import { onMount } from 'svelte';
  import AppHeader from './components/AppHeader.svelte';
  import ComposerModal from './components/ComposerModal.svelte';
  import NotesBoard from './components/NotesBoard.svelte';
  import FilesSection from './components/FilesSection.svelte';
  import ExpandedEditorModal from './components/ExpandedEditorModal.svelte';
  import DeleteConfirmModal from './components/DeleteConfirmModal.svelte';
  import ToastMessage from './components/ToastMessage.svelte';
  import type { api_record_t, search_response_t, sort_option_t, slot_card_t } from './types';

  const INCLUDE_TEXT_FILES_IN_FILE_AREA = true;
  const FILE_DATE_FIELD: 'created' | 'updated' = 'updated';

  const api_base = __KARING_WEB_API_BASE__;

  let text_cards: slot_card_t[] = [];
  let file_cards: slot_card_t[] = [];
  let loading = true;
  let creating = false;
  let show_composer = false;
  let expanded_card_id: number | null = null;
  let error_message = '';
  let status_message = '';
  let search_query = '';
  let new_content = '';
  let expanded_card: slot_card_t | null = null;
  let pending_delete_card: slot_card_t | null = null;
  let selected_text_swap_ids: number[] = [];
  let selected_file_swap_ids: number[] = [];
  let text_swap_target_id: number | null = null;
  let file_swap_ready = false;
  let file_input: HTMLInputElement | null = null;
  let upload_in_progress = false;
  let upload_progress = 0;
  let toast_timer: ReturnType<typeof setTimeout> | null = null;
  let search_timer: ReturnType<typeof setTimeout> | null = null;
  let sort_option: sort_option_t = 'id-asc';
  let file_sort_option: sort_option_t = 'id-asc';
  let toast_kind: 'status' | 'error' = 'status';

  $: expanded_card =
    expanded_card_id === null
      ? null
      : text_cards.find((card) => card.id === expanded_card_id) ?? null;
  $: text_swap_target_id =
    selected_text_swap_ids.length === 2 ? selected_text_swap_ids[1] : null;
  $: file_swap_ready = selected_file_swap_ids.length === 2;

  function show_toast(message: string, kind: 'status' | 'error' = 'status') {
    toast_kind = kind;
    status_message = message;
    if (toast_timer) clearTimeout(toast_timer);
    toast_timer = setTimeout(() => {
      status_message = '';
      toast_timer = null;
    }, 3200);
  }

  function is_visible_text_record(record: api_record_t) {
    if (record.is_file) return false;
    return (record.content ?? '').trim().length > 0;
  }

  function to_slot_card(record: api_record_t): slot_card_t {
    return {
      ...record,
      draft: record.content ?? '',
      saving: false,
      deleting: false
    };
  }

  function normalize(records: api_record_t[]) {
    text_cards = sort_records(records, sort_option)
      .filter(is_visible_text_record)
      .map(to_slot_card);
    file_cards = sort_records(records, file_sort_option)
      .filter(is_file_lane_record)
      .map(to_slot_card);
    selected_text_swap_ids = selected_text_swap_ids.filter((id) =>
      records.some((record) => record.id === id)
    );
    selected_file_swap_ids = selected_file_swap_ids.filter((id) =>
      records.some((record) => record.id === id)
    );
  }

  function is_file_lane_record(record: api_record_t) {
    if (record.is_file) return true;
    return INCLUDE_TEXT_FILES_IN_FILE_AREA && Boolean(record.filename);
  }

  function get_sort_query(option: sort_option_t) {
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

  function sort_records(records: api_record_t[], option: sort_option_t) {
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

  function format_timestamp(unix_seconds?: number) {
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

  function get_file_badge(record: api_record_t) {
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

  function get_file_date(record: api_record_t) {
    if (FILE_DATE_FIELD === 'created') return record.created_at;
    return record.updated_at ?? record.created_at;
  }

  function get_download_href(record: api_record_t) {
    return `${api_base}/?id=${record.id}&as=download`;
  }

  function parse_size_mb_to_bytes(value: string | undefined) {
    if (!value) return null;
    const matched = value.trim().match(/^(\d+)\s*MB$/i);
    if (!matched) return null;
    return Number(matched[1]) * 1024 * 1024;
  }

  async function parse_error(response: Response) {
    try {
      const json = await response.json();
      if (json?.message) return json.message as string;
    } catch {
      return `request failed: ${response.status}`;
    }

    return `request failed: ${response.status}`;
  }

  async function load_slots() {
    loading = true;
    error_message = '';

    try {
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
        ? await load_records_by_ids((json.data ?? []).map((record) => record.id))
        : (json.data ?? []);

      normalize(records);
    } catch (error) {
      error_message =
        error instanceof Error ? error.message : 'Failed to load notes.';
    } finally {
      loading = false;
    }
  }

  async function load_records_by_ids(ids: number[]) {
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

  async function fetch_file_limit_bytes() {
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

  async function create_slot() {
    const content = new_content.trim();
    if (!content) {
      show_toast('Empty notes are not added.');
      return;
    }

    creating = true;
    status_message = '';
    error_message = '';

    try {
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

      new_content = '';
      show_composer = false;
      show_toast('New note added.');
      await load_slots();
    } catch (error) {
      error_message =
        error instanceof Error ? error.message : 'Failed to add note.';
    } finally {
      creating = false;
    }
  }

  async function save_slot(slot: slot_card_t) {
    if (slot.is_file) return;

    const content = slot.draft.trim();
    if (!content) {
      show_toast(`ID ${slot.id} is empty. Use delete instead.`);
      return;
    }

    slot.saving = true;
    status_message = '';
    error_message = '';

    try {
      const response = await fetch(`${api_base}/?id=${slot.id}`, {
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

      show_toast(`ID ${slot.id} saved.`);
      await load_slots();
    } catch (error) {
      error_message =
        error instanceof Error ? error.message : `Failed to save ID ${slot.id}.`;
    } finally {
      slot.saving = false;
    }
  }

  async function delete_slot(slot: slot_card_t) {
    slot.deleting = true;
    status_message = '';
    error_message = '';

    try {
      const response = await fetch(`${api_base}/?id=${slot.id}`, {
        method: 'DELETE'
      });

      if (!response.ok && response.status !== 204) {
        throw new Error(await parse_error(response));
      }

      show_toast(`ID ${slot.id} deleted.`);
      text_cards = text_cards.filter((item) => item.id !== slot.id);
      file_cards = file_cards.filter((item) => item.id !== slot.id);
      selected_text_swap_ids = selected_text_swap_ids.filter((id) => id !== slot.id);
      selected_file_swap_ids = selected_file_swap_ids.filter((id) => id !== slot.id);
      if (expanded_card_id === slot.id) expanded_card_id = null;
    } catch (error) {
      error_message =
        error instanceof Error ? error.message : `Failed to delete ID ${slot.id}.`;
    } finally {
      slot.deleting = false;
      pending_delete_card = null;
    }
  }

  function request_delete(slot: slot_card_t) {
    pending_delete_card = slot;
  }

  function toggle_text_swap_selection(id: number) {
    selected_file_swap_ids = [];

    if (selected_text_swap_ids.includes(id)) {
      selected_text_swap_ids = selected_text_swap_ids.filter((item) => item !== id);
      return;
    }

    if (selected_text_swap_ids.length < 2) {
      selected_text_swap_ids = [...selected_text_swap_ids, id];
      return;
    }

    selected_text_swap_ids = [selected_text_swap_ids[1], id];
  }

  function toggle_file_swap_selection(id: number) {
    selected_text_swap_ids = [];

    if (selected_file_swap_ids.includes(id)) {
      selected_file_swap_ids = selected_file_swap_ids.filter((item) => item !== id);
      return;
    }

    if (selected_file_swap_ids.length < 2) {
      selected_file_swap_ids = [...selected_file_swap_ids, id];
      return;
    }

    selected_file_swap_ids = [selected_file_swap_ids[1], id];
  }

  function is_file_swap_second(id: number) {
    return (
      selected_file_swap_ids.length === 2 &&
      selected_file_swap_ids[1] === id
    );
  }

  async function swap_selected(mode: 'text' | 'file') {
    const selected_ids =
      mode === 'text' ? selected_text_swap_ids : selected_file_swap_ids;

    if (selected_ids.length !== 2) return;

    const [id_1, id_2] = selected_ids;
    try {
      const response = await fetch(`${api_base}/swap?id1=${id_1}&id2=${id_2}`, {
        method: 'POST',
        headers: {
          Accept: 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(await parse_error(response));
      }

      selected_text_swap_ids = [];
      selected_file_swap_ids = [];
      show_toast(`IDs ${id_1} and ${id_2} swapped.`);
      await load_slots();
    } catch (error) {
      show_toast(
        error instanceof Error ? error.message : 'Failed to swap IDs.',
        'error'
      );
    }
  }

  function close_delete_dialog() {
    pending_delete_card = null;
  }

  async function copy_slot_text(slot: slot_card_t) {
    try {
      await copy_text(slot.draft);
      show_toast(`ID ${slot.id} copied.`);
    } catch {
      show_toast(`Failed to copy ID ${slot.id}.`, 'error');
    }
  }

  async function copy_text(value: string) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();

    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);

    if (!ok) {
      throw new Error('copy failed');
    }
  }

  function close_composer() {
    show_composer = false;
    new_content = '';
  }

  function close_expanded_card() {
    expanded_card_id = null;
  }

  function open_upload_picker() {
    if (upload_in_progress) return;
    file_input?.click();
  }

  async function handle_file_input_change(event: Event) {
    const target = event.currentTarget as HTMLInputElement;
    const file = target.files?.[0];
    target.value = '';

    if (!file) return;

    try {
      const file_limit_bytes = await fetch_file_limit_bytes();
      if (file_limit_bytes !== null && file.size > file_limit_bytes) {
        show_toast('File exceeds the current upload limit.', 'error');
        return;
      }
    } catch (error) {
      show_toast(
        error instanceof Error ? error.message : 'Failed to read upload limit.',
        'error'
      );
      return;
    }

    await upload_file(file);
  }

  async function upload_file(file: File) {
    upload_in_progress = true;
    upload_progress = 0;
    error_message = '';

    try {
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
          upload_progress = Math.round(
            (progress_event.loaded / progress_event.total) * 100
          );
        });

        request.addEventListener('load', async () => {
          if (request.status >= 200 && request.status < 300) {
            upload_progress = 100;
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

      show_toast('File uploaded.');
      await load_slots();
    } catch (error) {
      show_toast(
        error instanceof Error ? error.message : 'Upload failed.',
        'error'
      );
    } finally {
      upload_in_progress = false;
      upload_progress = 0;
    }
  }

  function queue_search() {
    if (search_timer) clearTimeout(search_timer);
    search_timer = setTimeout(() => {
      load_slots();
    }, 220);
  }

  onMount(load_slots);
</script>

<svelte:head>
  <title>karing-web</title>
  <meta
    name="description"
    content="Svelte + TypeScript based frontend shell for karing."
  />
</svelte:head>

<main class="app-shell">
  <AppHeader
    bind:search_query
    show_composer={show_composer}
    on_search_input={queue_search}
    on_toggle_composer={() => {
      show_composer = !show_composer;
      status_message = '';
    }}
  />

  <ComposerModal
    show={show_composer}
    bind:new_content
    {creating}
    on_close={close_composer}
    on_create={create_slot}
  />

  {#if error_message}
    <p class="notice error">{error_message}</p>
  {/if}

  <NotesBoard
    {loading}
    text_cards={text_cards}
    bind:sort_option
    format_timestamp={format_timestamp}
    on_sort_change={load_slots}
    on_save={save_slot}
    on_delete={request_delete}
    on_copy={copy_slot_text}
    selected_swap_ids={selected_text_swap_ids}
    on_toggle_swap={toggle_text_swap_selection}
    swap_target_id={text_swap_target_id}
    on_swap={() => swap_selected('text')}
    on_expand={(slot) => {
      expanded_card_id = slot.id;
      status_message = '';
    }}
  />

  <FilesSection
    file_cards={file_cards}
    bind:file_sort_option
    format_timestamp={format_timestamp}
    get_file_badge={get_file_badge}
    get_file_date={get_file_date}
    get_download_href={get_download_href}
    on_sort_change={load_slots}
    on_delete={request_delete}
    selected_swap_ids={selected_file_swap_ids}
    on_toggle_swap={toggle_file_swap_selection}
    swap_ready={file_swap_ready}
    on_swap={() => swap_selected('file')}
    on_open_upload={open_upload_picker}
    {upload_in_progress}
    {upload_progress}
  />

  <ExpandedEditorModal
    expanded_card={expanded_card}
    on_close={close_expanded_card}
    on_save={save_slot}
    on_delete={request_delete}
    on_copy={copy_slot_text}
  />

  <DeleteConfirmModal
    pending_delete_card={pending_delete_card}
    on_close={close_delete_dialog}
    on_confirm={delete_slot}
  />

  <ToastMessage message={status_message} kind={toast_kind} />

  <input
    bind:this={file_input}
    type="file"
    hidden
    on:change={handle_file_input_change}
  />
</main>
