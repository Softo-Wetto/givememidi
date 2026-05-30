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
};

export type MusicFile = PocketBaseRecord & {
  title: string;
  composer: string | null;
  genre: string | null;
  bpm: number | null;
  midi_url: string | null;
  pdf_url: string | null;
  midi_file?: string | null;
  pdf_file?: string | null;
  downloads: number;
  uploaded_by: string | null;
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
