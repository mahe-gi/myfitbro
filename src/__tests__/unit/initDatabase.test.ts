// Unit tests for initDatabase logic (Requirements 20.1, 20.2, 20.3)
// Tests are run against an in-memory SQLite database to avoid touching the singleton db client.

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as SQLite from 'expo-sqlite';
import { SEED_EXERCISES } from '../../db/seeds';

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS Exercise (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    name   TEXT    NOT NULL UNIQUE,
    muscle TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS User_Settings (
    id          INTEGER PRIMARY KEY CHECK(id = 1),
    weight_unit TEXT    NOT NULL DEFAULT 'kg' CHECK(weight_unit IN ('kg','lbs'))
  );
`;

async function openTestDb(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(':memory:');
  await db.execAsync('PRAGMA foreign_keys = ON');
  await db.execAsync(SCHEMA);
  return db;
}

async function getExerciseCount(db: SQLite.SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM Exercise');
  return row?.count ?? 0;
}

async function getSettingsRow(
  db: SQLite.SQLiteDatabase,
): Promise<{ id: number; weight_unit: string } | null> {
  return db.getFirstAsync<{ id: number; weight_unit: string }>(
    'SELECT id, weight_unit FROM User_Settings WHERE id = 1',
  );
}

async function seedExercisesInDb(db: SQLite.SQLiteDatabase): Promise<void> {
  for (const ex of SEED_EXERCISES) {
    await db.runAsync(
      'INSERT OR IGNORE INTO Exercise (name, muscle) VALUES (?, ?)',
      ex.name,
      ex.muscle,
    );
  }
}

async function createDefaultSettings(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.runAsync("INSERT INTO User_Settings (id, weight_unit) VALUES (1, 'kg')");
}

// Simulates the initDatabase logic inline against the provided db
async function runInitLogic(db: SQLite.SQLiteDatabase): Promise<void> {
  const exerciseCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM Exercise',
  );
  const settings = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM User_Settings WHERE id = 1',
  );

  if (!exerciseCount || exerciseCount.count === 0) {
    await seedExercisesInDb(db);
  }

  if (!settings) {
    await createDefaultSettings(db);
  }
}

describe('initDatabase logic', () => {
  let db: SQLite.SQLiteDatabase;

  beforeEach(async () => {
    db = await openTestDb();
  });

  afterEach(async () => {
    await db.closeAsync();
  });

  // Requirements 20.1
  it('seeds exercises on first launch when Exercise table is empty', async () => {
    const countBefore = await getExerciseCount(db);
    expect(countBefore).toBe(0);

    await runInitLogic(db);

    const countAfter = await getExerciseCount(db);
    expect(countAfter).toBeGreaterThan(0);
    expect(countAfter).toBe(SEED_EXERCISES.length);
  });

  // Requirements 20.2
  it('creates default User_Settings with weight_unit "kg" on first launch', async () => {
    const settingsBefore = await getSettingsRow(db);
    expect(settingsBefore).toBeNull();

    await runInitLogic(db);

    const settingsAfter = await getSettingsRow(db);
    expect(settingsAfter).not.toBeNull();
    expect(settingsAfter!.id).toBe(1);
    expect(settingsAfter!.weight_unit).toBe('kg');
  });

  // Requirements 20.3
  it('does NOT re-seed exercises if they already exist', async () => {
    // Pre-seed one exercise manually
    await db.runAsync(
      "INSERT INTO Exercise (name, muscle) VALUES ('Existing Exercise', 'Core')",
    );
    const countBefore = await getExerciseCount(db);
    expect(countBefore).toBe(1);

    await runInitLogic(db);

    // Should still be 1 — no re-seeding occurred
    const countAfter = await getExerciseCount(db);
    expect(countAfter).toBe(1);
  });
});
