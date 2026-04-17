<script lang="ts">
  import { onMount } from 'svelte';
  import AppHeader from './components/AppHeader.svelte';
  import ComposerModal from './components/ComposerModal.svelte';
  import NotesBoard from './components/NotesBoard.svelte';
  import FilesSection from './components/FilesSection.svelte';
  import ExpandedEditorModal from './components/ExpandedEditorModal.svelte';
  import DeleteConfirmModal from './components/DeleteConfirmModal.svelte';
  import ToastMessage from './components/ToastMessage.svelte';
  import { SEARCH_DEBOUNCE_MS, TOAST_DURATION_MS } from './lib/constants';
  import { copy_text } from './lib/clipboard';
  import {
    create_text_slot,
    delete_slot_record,
    fetch_file_limit_bytes,
    load_slot_records,
    save_text_slot,
    swap_slot_records,
    upload_slot_file
  } from './lib/karing_api';
  import {
    format_timestamp,
    get_download_href,
    get_file_badge,
    get_file_date
  } from './lib/records';
  import { toggle_swap_selection } from './lib/swap';
  import type { sort_option_t, slot_card_t } from './types';

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
    }, TOAST_DURATION_MS);
  }

  function apply_records(records: {
    text_cards: slot_card_t[];
    file_cards: slot_card_t[];
  }) {
    text_cards = records.text_cards;
    file_cards = records.file_cards;
    selected_text_swap_ids = selected_text_swap_ids.filter((id) =>
      records.text_cards.some((record) => record.id === id) ||
      records.file_cards.some((record) => record.id === id)
    );
    selected_file_swap_ids = selected_file_swap_ids.filter((id) =>
      records.text_cards.some((record) => record.id === id) ||
      records.file_cards.some((record) => record.id === id)
    );
  }

  async function load_slots() {
    loading = true;
    error_message = '';

    try {
      apply_records(
        await load_slot_records(
          api_base,
          search_query,
          sort_option,
          file_sort_option
        )
      );
    } catch (error) {
      error_message =
        error instanceof Error ? error.message : 'Failed to load notes.';
    } finally {
      loading = false;
    }
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
      await create_text_slot(api_base, content);
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
      await save_text_slot(api_base, slot.id, content);
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
      await delete_slot_record(api_base, slot.id);
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
    selected_text_swap_ids = toggle_swap_selection(selected_text_swap_ids, id);
  }

  function toggle_file_swap_selection(id: number) {
    selected_text_swap_ids = [];
    selected_file_swap_ids = toggle_swap_selection(selected_file_swap_ids, id);
  }

  async function swap_selected(mode: 'text' | 'file') {
    const selected_ids =
      mode === 'text' ? selected_text_swap_ids : selected_file_swap_ids;

    if (selected_ids.length !== 2) return;

    const [id_1, id_2] = selected_ids;
    try {
      await swap_slot_records(api_base, id_1, id_2);
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
      const file_limit_bytes = await fetch_file_limit_bytes(api_base);
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
      await upload_slot_file(api_base, file, (progress) => {
        upload_progress = progress;
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
    }, SEARCH_DEBOUNCE_MS);
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
    get_download_href={(record) => get_download_href(api_base, record)}
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
