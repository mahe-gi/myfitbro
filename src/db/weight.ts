import type { WeightEntry } from '../types/db';
import { db } from './client';

export async function upsertWeightEntry(date: string, value: number): Promise<void> {
  const database = await db;
  await database.runAsync(
    'INSERT OR REPLACE INTO Weight_Entry (date, value) VALUES (?, ?)',
    date,
    value,
  );
}

export async function getWeightHistory(): Promise<WeightEntry[]> {
  const database = await db;
  return database.getAllAsync<WeightEntry>('SELECT * FROM Weight_Entry ORDER BY date ASC');
}

export async function getTodayWeight(date: string): Promise<WeightEntry | null> {
  const database = await db;
  return database.getFirstAsync<WeightEntry>(
    'SELECT * FROM Weight_Entry WHERE date = ?',
    date,
  );
}
