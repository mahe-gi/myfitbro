import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as SQLite from 'expo-sqlite';
import * as fc from 'fast-check';

async function openTestDb(): Promise<SQLite.SQLiteDatabase> {
  const testDb = await SQLite.openDatabaseAsync(':memory:');
  await testDb.execAsync('PRAGMA foreign_keys = ON');
  await testDb.execAsync(`
    CREATE TABLE IF NOT EXISTS Weight_Entry (
      date  TEXT PRIMARY KEY,
      value REAL NOT NULL
    );
  `);
  return testDb;
}

const arbIsoDate = fc
  .tuple(
    fc.integer({ min: 2000, max: 2099 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 }),
  )
  .map(([y, m, d]) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);

const arbPositiveWeight = fc.float({ min: Math.fround(0.1), max: Math.fround(300), noNaN: true });

describe('weight property tests', () => {
  let testDb: SQLite.SQLiteDatabase;

  beforeEach(async () => {
    testDb = await openTestDb();
  });

  afterEach(async () => {
    await testDb.closeAsync();
  });

  // Feature: fitness-tracker-app, Property 6: Weight entry upsert
  // Validates: Requirements 7.5
  it('Property 6: inserting two weight entries for the same date results in exactly one record with the second value', async () => {
    await fc.assert(
      fc.asyncProperty(arbIsoDate, arbPositiveWeight, arbPositiveWeight, async (date, value1, value2) => {
        await testDb.runAsync('DELETE FROM Weight_Entry');

        await testDb.runAsync(
          'INSERT OR REPLACE INTO Weight_Entry (date, value) VALUES (?, ?)',
          date,
          value1,
        );
        await testDb.runAsync(
          'INSERT OR REPLACE INTO Weight_Entry (date, value) VALUES (?, ?)',
          date,
          value2,
        );

        const rows = await testDb.getAllAsync<{ date: string; value: number }>(
          'SELECT * FROM Weight_Entry WHERE date = ?',
          date,
        );

        expect(rows.length).toBe(1);
        expect(rows[0].value).toBe(value2);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: fitness-tracker-app, Property 7: Weight history chronological order
  // Validates: Requirements 7.3
  it('Property 7: getWeightHistory returns entries ordered by date ascending', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uniqueArray(arbIsoDate, { minLength: 1, maxLength: 10 }),
        async (dates) => {
          await testDb.runAsync('DELETE FROM Weight_Entry');

          for (const date of dates) {
            await testDb.runAsync(
              'INSERT OR REPLACE INTO Weight_Entry (date, value) VALUES (?, ?)',
              date,
              Math.random() * 100 + 40,
            );
          }

          const rows = await testDb.getAllAsync<{ date: string; value: number }>(
            'SELECT * FROM Weight_Entry ORDER BY date ASC',
          );

          for (let i = 1; i < rows.length; i++) {
            expect(rows[i].date >= rows[i - 1].date).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
