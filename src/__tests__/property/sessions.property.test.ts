import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as SQLite from 'expo-sqlite';
import * as fc from 'fast-check';

// Helper: open a fresh in-memory db, apply schema, enable foreign keys
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
  `);
  return testDb;
}

// Arbitrary: ISO date string YYYY-MM-DD
const arbIsoDate = fc
  .tuple(
    fc.integer({ min: 2000, max: 2099 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 }),
  )
  .map(([y, m, d]) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);

// Arbitrary: optional notes (null or non-empty string)
const arbNotes = fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: null });

describe('sessions property tests', () => {
  let testDb: SQLite.SQLiteDatabase;

  beforeEach(async () => {
    testDb = await openTestDb();
  });

  afterEach(async () => {
    await testDb.closeAsync();
  });

  // Feature: fitness-tracker-app, Property 1: Session round-trip
  it('Property 1: inserting a session and reading it back returns identical date and notes', async () => {
    await fc.assert(
      fc.asyncProperty(arbIsoDate, arbNotes, async (date, notes) => {
        // Insert session
        const result = await testDb.runAsync(
          'INSERT INTO Workout_Session (date, notes) VALUES (?, ?)',
          date,
          notes,
        );
        const id = result.lastInsertRowId;

        // Read back by id
        const row = await testDb.getFirstAsync<{ id: number; date: string; notes: string | null }>(
          'SELECT id, date, notes FROM Workout_Session WHERE id = ?',
          id,
        );

        expect(row).not.toBeNull();
        expect(row!.date).toBe(date);
        expect(row!.notes).toBe(notes);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: fitness-tracker-app, Property 4: ON DELETE CASCADE from session to sets
  it('Property 4: deleting a session removes all its associated sets from Workout_Set', async () => {
    // Seed one exercise to satisfy the FK on Workout_Set
    await testDb.runAsync(
      "INSERT INTO Exercise (name, muscle) VALUES ('Test Exercise', 'chest')",
    );
    const exerciseRow = await testDb.getFirstAsync<{ id: number }>(
      "SELECT id FROM Exercise WHERE name = 'Test Exercise'",
    );
    const exerciseId = exerciseRow!.id;

    await fc.assert(
      fc.asyncProperty(
        arbIsoDate,
        arbNotes,
        fc.array(
          fc.record({
            weight: fc.float({ min: 0.5, max: 500, noNaN: true }),
            reps: fc.integer({ min: 1, max: 99 }),
          }),
          { minLength: 1, maxLength: 10 },
        ),
        async (date, notes, sets) => {
          // Insert session
          const sessionResult = await testDb.runAsync(
            'INSERT INTO Workout_Session (date, notes) VALUES (?, ?)',
            date,
            notes,
          );
          const sessionId = sessionResult.lastInsertRowId;

          // Insert sets linked to this session
          for (const s of sets) {
            await testDb.runAsync(
              'INSERT INTO Workout_Set (workout_session_id, exercise_id, weight, reps) VALUES (?, ?, ?, ?)',
              sessionId,
              exerciseId,
              s.weight,
              s.reps,
            );
          }

          // Verify sets exist before deletion
          const setsBefore = await testDb.getAllAsync<{ id: number }>(
            'SELECT id FROM Workout_Set WHERE workout_session_id = ?',
            sessionId,
          );
          expect(setsBefore.length).toBe(sets.length);

          // Delete the session
          await testDb.runAsync('DELETE FROM Workout_Session WHERE id = ?', sessionId);

          // All sets for this session should be gone (ON DELETE CASCADE)
          const setsAfter = await testDb.getAllAsync<{ id: number }>(
            'SELECT id FROM Workout_Set WHERE workout_session_id = ?',
            sessionId,
          );
          expect(setsAfter.length).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
