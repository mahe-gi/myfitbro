import type { Exercise } from '../types/db';
import { db } from './client';

export async function getAllExercises(): Promise<Exercise[]> {
  const database = await db;
  return database.getAllAsync<Exercise>('SELECT * FROM Exercise ORDER BY name ASC');
}

export async function seedExercises(exercises: Omit<Exercise, 'id'>[]): Promise<void> {
  const database = await db;
  for (const exercise of exercises) {
    await database.runAsync(
      'INSERT OR IGNORE INTO Exercise (name, muscle) VALUES (?, ?)',
      exercise.name,
      exercise.muscle,
    );
  }
}
