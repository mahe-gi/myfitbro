import type { WorkoutSession } from '../types/db';
import { db } from './client';

export async function createSession(date: string, notes?: string): Promise<number> {
  const database = await db;
  const result = await database.runAsync(
    'INSERT INTO Workout_Session (date, notes) VALUES (?, ?)',
    date,
    notes ?? null,
  );
  return result.lastInsertRowId;
}

export async function getSessionsForDate(date: string): Promise<WorkoutSession[]> {
  const database = await db;
  return database.getAllAsync<WorkoutSession>(
    'SELECT * FROM Workout_Session WHERE date = ?',
    date,
  );
}

export async function deleteSession(id: number): Promise<void> {
  const database = await db;
  await database.runAsync('DELETE FROM Workout_Session WHERE id = ?', id);
}
