import { Database } from './supabase';

export type TypeUser = Database['public']['Tables']['users']['Row'];
export type TypeTask = Database['public']['Tables']['tasks']['Row'];
