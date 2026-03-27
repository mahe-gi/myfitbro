import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as SQLite from 'expo-sqlite';
import * as fc from 'fast-check';

// Helper: open a fresh in-memory db, apply full schema, enable foreign keys
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
  `);
  return testDb;
}

// Seed a single exercise and session, return their ids
async function seedExerciseAndSession(
  testDb: SQLite.SQLiteDatabase,
): Promise<{ exerciseId: number; sessionId: number }> {
  const exResult = await testDb.runAsync(
    "INSERT INTO Exercise (name, muscle) VALUES ('Test Exercise', 'chest')",
  );
  const sessionResult = await testDb.runAsync(
    "INSERT INTO Workout_Session (date, notes) VALUES ('2024-01-01', NULL)",
  );
  return { exerciseId: exResult.lastInsertRowId, sessionId: sessionResult.lastInsertRowId };
}

// Inline upsertPR — simulates what the store would do
async function upsertPR(
  testDb: SQLite.SQLiteDatabase,
  exerciseId: number,
  weight: number,
): Promise<void> {
  await testDb.runAsync(
    'INSERT OR REPLACE INTO Exercise_PR (exercise_id, max_weight) VALUES (?, ?)',
    exerciseId,
    weight,
  );
}

// Inline recomputePR — simulates what the store would do
async function recomputePR(testDb: SQLite.SQLiteDatabase, exerciseId: number): Promise<void> {
  const row = await testDb.getFirstAsync<{ max_weight: number | null }>(
    'SELECT MAX(weight) AS max_weight FROM Workout_Set WHERE exercise_id = ?',
    exerciseId,
  );
  if (row?.max_weight != null) {
    await upsertPR(testDb, exerciseId, row.max_weight);
  } else {
    await testDb.runAsync('DELETE FROM Exercise_PR WHERE exercise_id = ?', exerciseId);
  }
}

const arbWeight = fc.float({ min: Math.fround(0.5), max: Math.fround(500), noNaN: true });
const arbReps = fc.integer({ min: 1, max: 99 });

describe('PR cache property tests', () => {
  let testDb: SQLite.SQLiteDatabase;

  beforeEach(async () => {
    testDb = await openTestDb();
  });

  afterEach(async () => {
    await testDb.closeAsync();
  });

  // Feature: fitness-tracker-app, Property 13: PR cache correctness on insert
  // Validates: Requirements 15.1, 15.2, 15.3
  it('Property 13: after inserting sets and updating the PR cache, Exercise_PR.max_weight equals the max weight across all sets', async () => {
    const { exerciseId, sessionId } = await seedExerciseAndSession(testDb);

    await fc.assert(
      fc.asyncProperty(
        fc.array(arbWeight, { minLength: 1, maxLength: 10 }),
        async (weights) => {
          // Insert all sets and update PR cache after each insert (simulating store logic)
          for (const w of weights) {
            await testDb.runAsync(
              'INSERT INTO Workout_Set (workout_session_id, exercise_id, weight, reps) VALUES (?, ?, ?, 5)',
              sessionId,
              exerciseId,
              w,
            );

            // Simulate store: if w > current PR (or no PR), upsertPR
            const prRow = await testDb.getFirstAsync<{ max_weight: number }>(
              'SELECT max_weight FROM Exercise_PR WHERE exercise_id = ?',
              exerciseId,
            );
            if (prRow == null || w > prRow.max_weight) {
              await upsertPR(testDb, exerciseId, w);
            }
          }

          // The PR cache should equal the true max weight
          const expectedMax = Math.max(...weights);
          const prRow = await testDb.getFirstAsync<{ max_weight: number }>(
            'SELECT max_weight FROM Exercise_PR WHERE exercise_id = ?',
            exerciseId,
          );

          expect(prRow).not.toBeNull();
          expect(prRow!.max_weight).toBeCloseTo(expectedMax, 5);

          // Cleanup for next run
          await testDb.runAsync(
            'DELETE FROM Workout_Set WHERE workout_session_id = ?',
            sessionId,
          );
          await testDb.runAsync('DELETE FROM Exercise_PR WHERE exercise_id = ?', exerciseId);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: fitness-tracker-app, Property 14: PR cache correctness on delete
  // Validates: Requirements 17.4
  it('Property 14: after deleting the PR-matching set and recomputing, Exercise_PR reflects remaining max or is absent', async () => {
    const { exerciseId, sessionId } = await seedExerciseAndSession(testDb);

    await fc.assert(
      fc.asyncProperty(
        fc.array(arbWeight, { minLength: 1, maxLength: 10 }),
        async (weights) => {
          // Insert all sets
          const insertedIds: number[] = [];
          for (const w of weights) {
            const r = await testDb.runAsync(
              'INSERT INTO Workout_Set (workout_session_id, exercise_id, weight, reps) VALUES (?, ?, ?, 5)',
              sessionId,
              exerciseId,
              w,
            );
            insertedIds.push(r.lastInsertRowId);
          }

          // Set the PR to the current max (simulating what the store would have done)
          const currentMax = Math.max(...weights);
          await upsertPR(testDb, exerciseId, currentMax);

          // Find the id of a set whose weight equals the current PR (the one to delete)
          const prSetRow = await testDb.getFirstAsync<{ id: number }>(
            'SELECT id FROM Workout_Set WHERE exercise_id = ? AND weight = ? LIMIT 1',
            exerciseId,
            currentMax,
          );
          const prSetId = prSetRow!.id;

          // Delete that set
          await testDb.runAsync('DELETE FROM Workout_Set WHERE id = ?', prSetId);

          // Simulate store: recomputePR after deleting the PR-matching set
          await recomputePR(testDb, exerciseId);

          // Determine expected state
          const remainingWeights = weights.filter((_, i) => insertedIds[i] !== prSetId);

          if (remainingWeights.length === 0) {
            // No sets remain — PR row should be absent
            const prRow = await testDb.getFirstAsync<{ max_weight: number }>(
              'SELECT max_weight FROM Exercise_PR WHERE exercise_id = ?',
              exerciseId,
            );
            expect(prRow).toBeNull();
          } else {
            // PR should equal the max of remaining sets
            const expectedMax = Math.max(...remainingWeights);
            const prRow = await testDb.getFirstAsync<{ max_weight: number }>(
              'SELECT max_weight FROM Exercise_PR WHERE exercise_id = ?',
              exerciseId,
            );
            expect(prRow).not.toBeNull();
            expect(prRow!.max_weight).toBeCloseTo(expectedMax, 5);
          }

          // Cleanup for next run
          await testDb.runAsync(
            'DELETE FROM Workout_Set WHERE workout_session_id = ?',
            sessionId,
          );
          await testDb.runAsync('DELETE FROM Exercise_PR WHERE exercise_id = ?', exerciseId);
        },
      ),
      { numRuns: 100 },
    );
  });
});
