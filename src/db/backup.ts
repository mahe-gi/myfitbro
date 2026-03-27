import type { BackupPayload } from '../types/backup';
import { db } from './client';
import type {
  Exercise,
  WorkoutSession,
  WorkoutSet,
  ExercisePR,
  WeightEntry,
  Recipe,
  FoodLog,
  UserSettings,
} from '../types/db';

export class DatabaseError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export async function exportAllData(): Promise<BackupPayload> {
  const database = await db;

  const exercises = await database.getAllAsync<Exercise>('SELECT * FROM Exercise');
  const sessions = await database.getAllAsync<WorkoutSession>('SELECT * FROM Workout_Session');
  const sets = await database.getAllAsync<WorkoutSet>('SELECT * FROM Workout_Set');
  const prs = await database.getAllAsync<ExercisePR>('SELECT * FROM Exercise_PR');
  const weight_entries = await database.getAllAsync<WeightEntry>('SELECT * FROM Weight_Entry');
  const recipes = await database.getAllAsync<Recipe>('SELECT * FROM Recipe');
  const food_logs = await database.getAllAsync<FoodLog>('SELECT * FROM Food_Log');
  const settings = await database.getFirstAsync<UserSettings>(
    'SELECT * FROM User_Settings WHERE id = 1',
  );

  return {
    version: 1,
    exported_at: new Date().toISOString(),
    exercises,
    sessions,
    sets,
    prs,
    weight_entries,
    recipes,
    food_logs,
    settings: settings ?? { id: 1, weight_unit: 'kg' },
  };
}

export async function importAllData(payload: BackupPayload): Promise<void> {
  // Validate payload shape
  if (!payload || typeof payload !== 'object') {
    throw new DatabaseError('Invalid backup payload: expected an object');
  }
  if (payload.version !== 1) {
    throw new DatabaseError(
      `Invalid backup payload: unsupported version "${(payload as { version: unknown }).version}", expected 1`,
    );
  }
  const requiredKeys: (keyof BackupPayload)[] = [
    'exercises',
    'sessions',
    'sets',
    'prs',
    'weight_entries',
    'recipes',
    'food_logs',
    'settings',
  ];
  for (const key of requiredKeys) {
    if (!(key in payload)) {
      throw new DatabaseError(`Invalid backup payload: missing required key "${key}"`);
    }
  }

  const database = await db;

  await database.withTransactionAsync(async () => {
    // DELETE in FK-safe order
    await database.runAsync('DELETE FROM Food_Log');
    await database.runAsync('DELETE FROM Workout_Set');
    await database.runAsync('DELETE FROM Exercise_PR');
    await database.runAsync('DELETE FROM Workout_Session');
    await database.runAsync('DELETE FROM Weight_Entry');
    await database.runAsync('DELETE FROM Recipe');
    await database.runAsync('DELETE FROM User_Settings');
    await database.runAsync('DELETE FROM Exercise');

    // INSERT in FK-safe order
    for (const e of payload.exercises) {
      await database.runAsync(
        'INSERT INTO Exercise (id, name, muscle) VALUES (?, ?, ?)',
        e.id,
        e.name,
        e.muscle,
      );
    }

    const s = payload.settings;
    await database.runAsync(
      'INSERT INTO User_Settings (id, weight_unit) VALUES (?, ?)',
      s.id,
      s.weight_unit,
    );

    for (const session of payload.sessions) {
      await database.runAsync(
        'INSERT INTO Workout_Session (id, date, notes, created_at) VALUES (?, ?, ?, ?)',
        session.id,
        session.date,
        session.notes,
        session.created_at,
      );
    }

    for (const we of payload.weight_entries) {
      await database.runAsync(
        'INSERT INTO Weight_Entry (date, value) VALUES (?, ?)',
        we.date,
        we.value,
      );
    }

    for (const r of payload.recipes) {
      await database.runAsync(
        'INSERT INTO Recipe (id, name, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?)',
        r.id,
        r.name,
        r.calories,
        r.protein,
        r.carbs,
        r.fat,
      );
    }

    for (const ws of payload.sets) {
      await database.runAsync(
        'INSERT INTO Workout_Set (id, workout_session_id, exercise_id, weight, reps, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        ws.id,
        ws.workout_session_id,
        ws.exercise_id,
        ws.weight,
        ws.reps,
        ws.created_at,
      );
    }

    for (const pr of payload.prs) {
      await database.runAsync(
        'INSERT INTO Exercise_PR (exercise_id, max_weight) VALUES (?, ?)',
        pr.exercise_id,
        pr.max_weight,
      );
    }

    for (const fl of payload.food_logs) {
      await database.runAsync(
        'INSERT INTO Food_Log (id, date, recipe_id, meal_category, created_at) VALUES (?, ?, ?, ?, ?)',
        fl.id,
        fl.date,
        fl.recipe_id,
        fl.meal_category,
        fl.created_at,
      );
    }
  });
}
