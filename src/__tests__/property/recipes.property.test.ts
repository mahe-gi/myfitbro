import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as SQLite from 'expo-sqlite';
import * as fc from 'fast-check';

async function openTestDb(): Promise<SQLite.SQLiteDatabase> {
  const testDb = await SQLite.openDatabaseAsync(':memory:');
  await testDb.execAsync('PRAGMA foreign_keys = ON');
  await testDb.execAsync(`
    CREATE TABLE IF NOT EXISTS Recipe (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      name     TEXT    NOT NULL UNIQUE,
      calories INTEGER NOT NULL,
      protein  REAL    NOT NULL,
      carbs    REAL    NOT NULL,
      fat      REAL    NOT NULL
    );
  `);
  return testDb;
}

const arbRecipe = fc.record({
  name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  calories: fc.integer({ min: 0, max: 5000 }),
  protein: fc.float({ min: 0, max: Math.fround(500), noNaN: true }),
  carbs: fc.float({ min: 0, max: Math.fround(500), noNaN: true }),
  fat: fc.float({ min: 0, max: Math.fround(500), noNaN: true }),
});

describe('recipes property tests', () => {
  let testDb: SQLite.SQLiteDatabase;

  beforeEach(async () => {
    testDb = await openTestDb();
  });

  afterEach(async () => {
    await testDb.closeAsync();
  });

  // Feature: fitness-tracker-app, Property 8: Recipe round-trip
  // Validates: Requirements 8.1, 8.4
  it('Property 8: creating a recipe and reading it back returns identical fields', async () => {
    await fc.assert(
      fc.asyncProperty(arbRecipe, async (recipe) => {
        await testDb.runAsync('DELETE FROM Recipe');

        const result = await testDb.runAsync(
          'INSERT INTO Recipe (name, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?)',
          recipe.name,
          recipe.calories,
          recipe.protein,
          recipe.carbs,
          recipe.fat,
        );
        const id = result.lastInsertRowId;

        const row = await testDb.getFirstAsync<{
          id: number;
          name: string;
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
        }>('SELECT * FROM Recipe WHERE id = ?', id);

        expect(row).not.toBeNull();
        expect(row!.name).toBe(recipe.name);
        expect(row!.calories).toBe(recipe.calories);
        expect(row!.protein).toBeCloseTo(recipe.protein, 5);
        expect(row!.carbs).toBeCloseTo(recipe.carbs, 5);
        expect(row!.fat).toBeCloseTo(recipe.fat, 5);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: fitness-tracker-app, Property 9: Duplicate recipe name rejected
  // Validates: Requirements 8.5
  it('Property 9: creating a recipe with a duplicate name fails and leaves count unchanged', async () => {
    await fc.assert(
      fc.asyncProperty(arbRecipe, async (recipe) => {
        await testDb.runAsync('DELETE FROM Recipe');

        await testDb.runAsync(
          'INSERT INTO Recipe (name, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?)',
          recipe.name,
          recipe.calories,
          recipe.protein,
          recipe.carbs,
          recipe.fat,
        );

        const countBefore = await testDb.getFirstAsync<{ count: number }>(
          'SELECT COUNT(*) AS count FROM Recipe',
        );

        await expect(
          testDb.runAsync(
            'INSERT INTO Recipe (name, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?)',
            recipe.name,
            recipe.calories + 1,
            recipe.protein,
            recipe.carbs,
            recipe.fat,
          ),
        ).rejects.toThrow();

        const countAfter = await testDb.getFirstAsync<{ count: number }>(
          'SELECT COUNT(*) AS count FROM Recipe',
        );

        expect(countAfter!.count).toBe(countBefore!.count);
      }),
      { numRuns: 100 },
    );
  });
});
