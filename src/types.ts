export type api_record_t = {
  id: number;
  is_file: boolean;
  content?: string;
  filename?: string;
  mime?: string;
  created_at: number;
  updated_at?: number;
};

export type search_response_t = {
  success: boolean;
  message: string;
  data?: api_record_t[];
  code?: string;
};

export type sort_option_t = 'id-asc' | 'id-desc' | 'updated-asc' | 'updated-desc';

export type slot_card_t = api_record_t & {
  draft: string;
  saving: boolean;
  deleting: boolean;
};
