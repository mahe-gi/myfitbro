import type { ExercisePR } from '../types/db';
import { db } from './client';

export async function getPR(exerciseId: number): Promise<ExercisePR | null> {
  const database = await db;
  return database.getFirstAsync<ExercisePR>(
    'SELECT * FROM Exercise_PR WHERE exercise_id = ?',
    exerciseId,
  ) ?? null;
}

export async function upsertPR(exerciseId: number, weight: number): Promise<void> {
  const database = await db;
  await database.runAsync(
    'INSERT OR REPLACE INTO Exercise_PR (exercise_id, max_weight) VALUES (?, ?)',
    exerciseId,
    weight,
  );
}

export async function recomputePR(exerciseId: number): Promise<void> {
  const database = await db;
  const row = await database.getFirstAsync<{ max_weight: number | null }>(
    'SELECT MAX(weight) AS max_weight FROM Workout_Set WHERE exercise_id = ?',
    exerciseId,
  );
  if (row?.max_weight != null) {
    await upsertPR(exerciseId, row.max_weight);
  } else {
    await database.runAsync('DELETE FROM Exercise_PR WHERE exercise_id = ?', exerciseId);
  }
}
