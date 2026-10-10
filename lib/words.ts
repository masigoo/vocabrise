import { Word } from './types';
import starter from './vocabulary.json';
import { supabase } from './supabase';

export async function loadWords(): Promise<Word[]> {
  if (supabase) {
    const { data, error } = await supabase.from('vocabulary').select('*').order('id');
    if (!error && data?.length) return data as Word[];
    console.warn('Supabase vocabulary unavailable; using bundled vocabulary.', error?.message);
  }
  return starter as Word[];
}
