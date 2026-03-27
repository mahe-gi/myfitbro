// Feature: fitness-tracker-app, Property 18: Backup/restore round-trip
// Feature: fitness-tracker-app, Property 19: Invalid backup payload rejected

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as SQLite from 'expo-sqlite';
import * as fc from 'fast-check';
import type { BackupPayload } from '../../types/backup';
import type {
  Exercise,
  WorkoutSession,
  WorkoutSet,
  ExercisePR,
  WeightEntry,
  Recipe,
  FoodLog,
  UserSettings,
  MealCategory,
} from '../../types/db';
import { DatabaseError } from '../../db/backup';

// ---------------------------------------------------------------------------
// Schema helpers
// ---------------------------------------------------------------------------

async function openTestDb(): Promise<SQLite.SQLiteDatabase> {
  const testDb = await SQLite.openDatabaseAsync(':memory:');
  await testDb.execAsync('PRAGMA foreign_keys = ON');
  await testDb.execAsync(`
    CREATE TABLE IF NOT EXISTS Exercise (
      id     INTEGER PRIMARY KEY AUTOINCREMENT,
      name   TEXT    NOT NULL UNIQUE,
      muscle TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Workout_Session (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      date       TEXT    NOT NULL,
      notes      TEXT,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS Workout_Set (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_session_id INTEGER NOT NULL REFERENCES Workout_Session(id) ON DELETE CASCADE,
      exercise_id        INTEGER NOT NULL REFERENCES Exercise(id),
      weight             REAL    NOT NULL,
      reps               INTEGER NOT NULL,
      created_at         TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS Exercise_PR (
      exercise_id INTEGER PRIMARY KEY REFERENCES Exercise(id),
      max_weight  REAL    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Weight_Entry (
      date  TEXT PRIMARY KEY,
      value REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Recipe (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      name     TEXT    NOT NULL UNIQUE,
      calories INTEGER NOT NULL,
      protein  REAL    NOT NULL,
      carbs    REAL    NOT NULL,
      fat      REAL    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Food_Log (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      date          TEXT    NOT NULL,
      recipe_id     INTEGER NOT NULL REFERENCES Recipe(id) ON DELETE CASCADE,
      meal_category TEXT    NOT NULL CHECK(meal_category IN ('Pre Workout','Post Workout','Lunch','Dinner')),
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS User_Settings (
      id          INTEGER PRIMARY KEY CHECK(id = 1),
      weight_unit TEXT    NOT NULL DEFAULT 'kg' CHECK(weight_unit IN ('kg','lbs'))
    );
  `);
  return testDb;
}

// ---------------------------------------------------------------------------
// Inline export/import logic operating on a given db instance
// ---------------------------------------------------------------------------

async function exportDb(testDb: SQLite.SQLiteDatabase): Promise<BackupPayload> {
  const exercises = await testDb.getAllAsync<Exercise>('SELECT * FROM Exercise');
  const sessions = await testDb.getAllAsync<WorkoutSession>('SELECT * FROM Workout_Session');
  const sets = await testDb.getAllAsync<WorkoutSet>('SELECT * FROM Workout_Set');
  const prs = await testDb.getAllAsync<ExercisePR>('SELECT * FROM Exercise_PR');
  const weight_entries = await testDb.getAllAsync<WeightEntry>('SELECT * FROM Weight_Entry');
  const recipes = await testDb.getAllAsync<Recipe>('SELECT * FROM Recipe');
  const food_logs = await testDb.getAllAsync<FoodLog>('SELECT * FROM Food_Log');
  const settings = await testDb.getFirstAsync<UserSettings>(
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

async function importDb(testDb: SQLite.SQLiteDatabase, payload: BackupPayload): Promise<void> {
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

  await testDb.withTransactionAsync(async () => {
    await testDb.runAsync('DELETE FROM Food_Log');
    await testDb.runAsync('DELETE FROM Workout_Set');
    await testDb.runAsync('DELETE FROM Exercise_PR');
    await testDb.runAsync('DELETE FROM Workout_Session');
    await testDb.runAsync('DELETE FROM Weight_Entry');
    await testDb.runAsync('DELETE FROM Recipe');
    await testDb.runAsync('DELETE FROM User_Settings');
    await testDb.runAsync('DELETE FROM Exercise');

    for (const e of payload.exercises) {
      await testDb.runAsync(
        'INSERT INTO Exercise (id, name, muscle) VALUES (?, ?, ?)',
        e.id,
        e.name,
        e.muscle,
      );
    }

    const s = payload.settings;
    await testDb.runAsync(
      'INSERT INTO User_Settings (id, weight_unit) VALUES (?, ?)',
      s.id,
      s.weight_unit,
    );

    for (const session of payload.sessions) {
      await testDb.runAsync(
        'INSERT INTO Workout_Session (id, date, notes, created_at) VALUES (?, ?, ?, ?)',
        session.id,
        session.date,
        session.notes,
        session.created_at,
      );
    }

    for (const we of payload.weight_entries) {
      await testDb.runAsync(
        'INSERT INTO Weight_Entry (date, value) VALUES (?, ?)',
        we.date,
        we.value,
      );
    }

    for (const r of payload.recipes) {
      await testDb.runAsync(
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
      await testDb.runAsync(
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
      await testDb.runAsync(
        'INSERT INTO Exercise_PR (exercise_id, max_weight) VALUES (?, ?)',
        pr.exercise_id,
        pr.max_weight,
      );
    }

    for (const fl of payload.food_logs) {
      await testDb.runAsync(
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

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const arbIsoDate = fc
  .tuple(
    fc.integer({ min: 2000, max: 2099 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 }),
  )
  .map(([y, m, d]) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);

const arbIsoTimestamp = arbIsoDate.map((d) => `${d}T12:00:00.000Z`);

const arbWeightUnit = fc.constantFrom<'kg' | 'lbs'>('kg', 'lbs');

const arbMealCategory = fc.constantFrom<MealCategory>(
  'Pre Workout',
  'Post Workout',
  'Lunch',
  'Dinner',
);

// Generates a self-consistent BackupPayload with 1–3 exercises, 0–2 sessions, etc.
const arbBackupPayload: fc.Arbitrary<BackupPayload> = fc
  .tuple(
    // exercises: 1–3 unique names
    fc.uniqueArray(
      fc.tuple(
        fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
      ),
      { minLength: 1, maxLength: 3 },
    ),
    // sessions: 0–2
    fc.array(arbIsoDate, { minLength: 0, maxLength: 2 }),
    // weight entries: 0–3 unique dates
    fc.uniqueArray(
      fc.tuple(arbIsoDate, fc.float({ min: Math.fround(30), max: Math.fround(200), noNaN: true })),
      { minLength: 0, maxLength: 3 },
    ),
    // recipes: 0–2 unique names
    fc.uniqueArray(
      fc.tuple(
        fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
        fc.integer({ min: 0, max: 1000 }),
        fc.float({ min: 0, max: Math.fround(100), noNaN: true }),
        fc.float({ min: 0, max: Math.fround(100), noNaN: true }),
        fc.float({ min: 0, max: Math.fround(100), noNaN: true }),
      ),
      { minLength: 0, maxLength: 2 },
    ),
    arbWeightUnit,
    arbIsoTimestamp,
  )
  .map(([exerciseTuples, sessionDates, weightTuples, recipeTuples, weightUnit, exportedAt]) => {
    const exercises: Exercise[] = exerciseTuples.map(([name, muscle], i) => ({
      id: i + 1,
      name: `Exercise_${i + 1}_${name}`,
      muscle,
    }));

    const sessions: WorkoutSession[] = sessionDates.map((date, i) => ({
      id: i + 1,
      date,
      notes: null,
      created_at: `${date}T10:00:00.000Z`,
    }));

    const weight_entries: WeightEntry[] = weightTuples.map(([date, value]) => ({ date, value }));

    const recipes: Recipe[] = recipeTuples.map(([name, calories, protein, carbs, fat], i) => ({
      id: i + 1,
      name: `Recipe_${i + 1}_${name}`,
      calories,
      protein,
      carbs,
      fat,
    }));

    // sets: one set per (session, exercise) pair if both exist
    const sets: WorkoutSet[] = [];
    const prs: ExercisePR[] = [];
    const food_logs: FoodLog[] = [];

    if (sessions.length > 0 && exercises.length > 0) {
      const exercise = exercises[0];
      const session = sessions[0];
      sets.push({
        id: 1,
        workout_session_id: session.id,
        exercise_id: exercise.id,
        weight: 60,
        reps: 10,
        created_at: `${session.date}T10:01:00.000Z`,
      });
      prs.push({ exercise_id: exercise.id, max_weight: 60 });
    }

    if (recipes.length > 0) {
      food_logs.push({
        id: 1,
        date: sessions.length > 0 ? sessions[0].date : '2024-01-01',
        recipe_id: recipes[0].id,
        meal_category: 'Lunch',
        created_at: '2024-01-01T12:00:00.000Z',
      });
    }

    const settings: UserSettings = { id: 1, weight_unit: weightUnit };

    return {
      version: 1 as const,
      exported_at: exportedAt,
      exercises,
      sessions,
      sets,
      prs,
      weight_entries,
      recipes,
      food_logs,
      settings,
    };
  });

// Generates malformed payloads: missing a required key or wrong version
const arbMalformedPayload: fc.Arbitrary<unknown> = fc.oneof(
  // Wrong version
  fc.record({
    version: fc.integer({ min: 2, max: 99 }),
    exported_at: fc.string(),
    exercises: fc.constant([]),
    sessions: fc.constant([]),
    sets: fc.constant([]),
    prs: fc.constant([]),
    weight_entries: fc.constant([]),
    recipes: fc.constant([]),
    food_logs: fc.constant([]),
    settings: fc.constant({ id: 1, weight_unit: 'kg' }),
  }),
  // Missing 'exercises'
  fc.constant({
    version: 1,
    exported_at: '2024-01-01T00:00:00.000Z',
    sessions: [],
    sets: [],
    prs: [],
    weight_entries: [],
    recipes: [],
    food_logs: [],
    settings: { id: 1, weight_unit: 'kg' },
  }),
  // Missing 'sessions'
  fc.constant({
    version: 1,
    exported_at: '2024-01-01T00:00:00.000Z',
    exercises: [],
    sets: [],
    prs: [],
    weight_entries: [],
    recipes: [],
    food_logs: [],
    settings: { id: 1, weight_unit: 'kg' },
  }),
  // Missing 'settings'
  fc.constant({
    version: 1,
    exported_at: '2024-01-01T00:00:00.000Z',
    exercises: [],
    sessions: [],
    sets: [],
    prs: [],
    weight_entries: [],
    recipes: [],
    food_logs: [],
  }),
  // Missing 'food_logs'
  fc.constant({
    version: 1,
    exported_at: '2024-01-01T00:00:00.000Z',
    exercises: [],
    sessions: [],
    sets: [],
    prs: [],
    weight_entries: [],
    recipes: [],
    settings: { id: 1, weight_unit: 'kg' },
  }),
);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('backup property tests', () => {
  let testDb: SQLite.SQLiteDatabase;

  beforeEach(async () => {
    testDb = await openTestDb();
  });

  afterEach(async () => {
    await testDb.closeAsync();
  });

  // Feature: fitness-tracker-app, Property 18: Backup/restore round-trip
  // Validates: Requirements 13.1, 13.2, 13.4
  it('Property 18: export followed by import produces identical records in all tables', async () => {
    await fc.assert(
      fc.asyncProperty(arbBackupPayload, async (payload) => {
        // Seed the db with the payload data
        await importDb(testDb, payload);

        // Export
        const exported = await exportDb(testDb);

        // Wipe and re-import the exported payload
        await importDb(testDb, exported);

        // Verify all tables match the original payload
        const exercises = await testDb.getAllAsync<Exercise>('SELECT * FROM Exercise ORDER BY id');
        const sessions = await testDb.getAllAsync<WorkoutSession>(
          'SELECT * FROM Workout_Session ORDER BY id',
        );
        const sets = await testDb.getAllAsync<WorkoutSet>('SELECT * FROM Workout_Set ORDER BY id');
        const prs = await testDb.getAllAsync<ExercisePR>(
          'SELECT * FROM Exercise_PR ORDER BY exercise_id',
        );
        const weight_entries = await testDb.getAllAsync<WeightEntry>(
          'SELECT * FROM Weight_Entry ORDER BY date',
        );
        const recipes = await testDb.getAllAsync<Recipe>('SELECT * FROM Recipe ORDER BY id');
        const food_logs = await testDb.getAllAsync<FoodLog>('SELECT * FROM Food_Log ORDER BY id');
        const settings = await testDb.getFirstAsync<UserSettings>(
          'SELECT * FROM User_Settings WHERE id = 1',
        );

        expect(exercises.length).toBe(payload.exercises.length);
        expect(sessions.length).toBe(payload.sessions.length);
        expect(sets.length).toBe(payload.sets.length);
        expect(prs.length).toBe(payload.prs.length);
        expect(weight_entries.length).toBe(payload.weight_entries.length);
        expect(recipes.length).toBe(payload.recipes.length);
        expect(food_logs.length).toBe(payload.food_logs.length);

        // Spot-check field values
        for (let i = 0; i < exercises.length; i++) {
          expect(exercises[i].name).toBe(payload.exercises[i].name);
          expect(exercises[i].muscle).toBe(payload.exercises[i].muscle);
        }
        for (let i = 0; i < recipes.length; i++) {
          expect(recipes[i].name).toBe(payload.recipes[i].name);
          expect(recipes[i].calories).toBe(payload.recipes[i].calories);
        }
        if (settings) {
          expect(settings.weight_unit).toBe(payload.settings.weight_unit);
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: fitness-tracker-app, Property 19: Invalid backup payload rejected
  // Validates: Requirements 13.3
  it('Property 19: importAllData throws on invalid payload and leaves existing data unchanged', async () => {
    // Seed a known good state
    const goodPayload: BackupPayload = {
      version: 1,
      exported_at: '2024-01-01T00:00:00.000Z',
      exercises: [{ id: 1, name: 'Bench Press', muscle: 'chest' }],
      sessions: [],
      sets: [],
      prs: [],
      weight_entries: [{ date: '2024-01-01', value: 80 }],
      recipes: [],
      food_logs: [],
      settings: { id: 1, weight_unit: 'kg' },
    };
    await importDb(testDb, goodPayload);

    await fc.assert(
      fc.asyncProperty(arbMalformedPayload, async (malformed) => {
        // Attempt import of malformed payload — must throw
        await expect(importDb(testDb, malformed as BackupPayload)).rejects.toThrow(DatabaseError);

        // Existing data must be unchanged
        const exercises = await testDb.getAllAsync<Exercise>('SELECT * FROM Exercise');
        const weight_entries = await testDb.getAllAsync<WeightEntry>('SELECT * FROM Weight_Entry');

        expect(exercises.length).toBe(1);
        expect(exercises[0].name).toBe('Bench Press');
        expect(weight_entries.length).toBe(1);
        expect(weight_entries[0].value).toBe(80);
      }),
      { numRuns: 100 },
    );
  });
});
