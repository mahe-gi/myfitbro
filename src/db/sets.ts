import type { WorkoutSet } from '../types/db';
import { db } from './client';

export async function insertSet(set: Omit<WorkoutSet, 'id' | 'created_at'>): Promise<number> {
  const database = await db;
  const result = await database.runAsync(
    'INSERT INTO Workout_Set (workout_session_id, exercise_id, weight, reps) VALUES (?, ?, ?, ?)',
    set.workout_session_id,
    set.exercise_id,
    set.weight,
    set.reps,
  );
  return result.lastInsertRowId;
}

export async function updateSet(id: number, weight: number, reps: number): Promise<void> {
  const database = await db;
  await database.runAsync(
    'UPDATE Workout_Set SET weight = ?, reps = ? WHERE id = ?',
    weight,
    reps,
    id,
  );
}

export async function deleteSet(id: number): Promise<void> {
  const database = await db;
  await database.runAsync('DELETE FROM Workout_Set WHERE id = ?', id);
}

export async function getSetsForSession(sessionId: number): Promise<WorkoutSet[]> {
  const database = await db;
  return database.getAllAsync<WorkoutSet>(
    'SELECT * FROM Workout_Set WHERE workout_session_id = ? ORDER BY created_at ASC',
    sessionId,
  );
}

export async function getLastSetWeightForExercise(exerciseId: number): Promise<number | null> {
  const database = await db;
  const row = await database.getFirstAsync<{ weight: number }>(
    'SELECT weight FROM Workout_Set WHERE exercise_id = ? ORDER BY created_at DESC LIMIT 1',
    exerciseId,
  );
  return row?.weight ?? null;
}
