export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type RawPocketBaseRecord = Record<string, any> & {
  id: string;
  created?: string;
  updated?: string;
  created_at?: string;
  updated_at?: string;
};

export type PocketBaseRecord = {
  id: string;
  created?: string;
  updated?: string;
  created_at: string;
  updated_at: string;
};

export type UserProfile = PocketBaseRecord & {
  email: string | null;
  username: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  cosmetic_theme?: string | null;
  banner_style?: string | null;
  featured_badge?: string | null;
};

export type MusicFile = PocketBaseRecord & {
  title: string;
  composer: string | null;
  description?: string | null;
  genre: string | null;
  bpm: number | null;
  source_url?: string | null;
  source_name?: string | null;
  license?: string | null;
  permission_note?: string | null;
  import_status?: string | null;
  file_hash?: string | null;
  midi_url: string | null;
  pdf_url: string | null;
  midi_file?: string | null;
  pdf_file?: string | null;
  downloads: number;
  uploaded_by: string | null;
};


export type ImportJob = PocketBaseRecord & {
  source_url: string | null;
  source_type: string | null;
  title: string | null;
  composer: string | null;
  description: string | null;
  genre: string | null;
  bpm: number | null;
  license: string | null;
  permission_note: string | null;
  midi_path: string | null;
  pdf_path: string | null;
  status: "pending" | "ready" | "importing" | "imported" | "skipped" | "error" | string;
  dedupe_key: string;
  file_hash: string | null;
  error_message: string | null;
  music_file: string | null;
  created_by: string | null;
};
export type XpEvent = RawPocketBaseRecord & {
  user_id: string;
  event_key: string;
  action: string;
  label: string;
  xp: number;
  credits: number;
  target_collection?: string | null;
  target_id?: string | null;
  metadata?: string | null;
};

export type UserReward = RawPocketBaseRecord & {
  user_id: string;
  item_key: string;
  item_type: string;
  label: string;
  description?: string | null;
  metadata?: string | null;
  purchase_event?: string | null;
};

export type PocketBaseAuth = {
  token: string;
  user: UserProfile;
};

export type PocketBaseList<T> = {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
  items: T[];
};

export type PocketBaseError = Error & {
  status?: number;
};
