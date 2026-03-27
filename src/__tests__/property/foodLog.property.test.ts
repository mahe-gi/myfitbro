import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as SQLite from 'expo-sqlite';
import * as fc from 'fast-check';
import type { MealCategory } from '../../types/db';

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

    CREATE TABLE IF NOT EXISTS Food_Log (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      date          TEXT    NOT NULL,
      recipe_id     INTEGER NOT NULL REFERENCES Recipe(id) ON DELETE CASCADE,
      meal_category TEXT    NOT NULL CHECK(meal_category IN ('Pre Workout','Post Workout','Lunch','Dinner')),
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_food_log_date ON Food_Log(date);
  `);
  return testDb;
}

const MEAL_CATEGORIES: MealCategory[] = ['Pre Workout', 'Post Workout', 'Lunch', 'Dinner'];

const arbIsoDate = fc
  .tuple(
    fc.integer({ min: 2000, max: 2099 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 }),
  )
  .map(([y, m, d]) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);

const arbMealCategory = fc.constantFrom(...MEAL_CATEGORIES);

const arbRecipe = fc.record({
  name: fc.string({ minLength: 1, maxLength: 80 }).filter(s => s.trim().length > 0),
  calories: fc.integer({ min: 0, max: 2000 }),
  protein: fc.float({ min: 0, max: Math.fround(200), noNaN: true }),
  carbs: fc.float({ min: 0, max: Math.fround(200), noNaN: true }),
  fat: fc.float({ min: 0, max: Math.fround(200), noNaN: true }),
});

// Helper: insert a recipe and return its id
async function insertRecipe(
  db: SQLite.SQLiteDatabase,
  recipe: { name: string; calories: number; protein: number; carbs: number; fat: number },
): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO Recipe (name, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?)',
    recipe.name,
    recipe.calories,
    recipe.protein,
    recipe.carbs,
    recipe.fat,
  );
  return result.lastInsertRowId;
}

describe('foodLog property tests', () => {
  let testDb: SQLite.SQLiteDatabase;

  beforeEach(async () => {
    testDb = await openTestDb();
  });

  afterEach(async () => {
    await testDb.closeAsync();
  });

  // Feature: fitness-tracker-app, Property 10: Food log round-trip
  // Validates: Requirements 9.1, 9.4
  it('Property 10: inserting a food log entry and querying by date returns a matching record', async () => {
    await fc.assert(
      fc.asyncProperty(arbIsoDate, arbMealCategory, arbRecipe, async (date, mealCategory, recipe) => {
        await testDb.runAsync('DELETE FROM Food_Log');
        await testDb.runAsync('DELETE FROM Recipe');

        const recipeId = await insertRecipe(testDb, recipe);

        await testDb.runAsync(
          'INSERT INTO Food_Log (date, recipe_id, meal_category) VALUES (?, ?, ?)',
          date,
          recipeId,
          mealCategory,
        );

        const rows = await testDb.getAllAsync<{
          recipe_id: number;
          meal_category: string;
        }>(
          `SELECT fl.recipe_id, fl.meal_category
           FROM Food_Log fl
           JOIN Recipe r ON fl.recipe_id = r.id
           WHERE fl.date = ?
           ORDER BY fl.created_at ASC`,
          date,
        );

        const match = rows.find(r => r.recipe_id === recipeId && r.meal_category === mealCategory);
        expect(match).toBeDefined();
      }),
      { numRuns: 100 },
    );
  });

  // Feature: fitness-tracker-app, Property 11: Daily macro totals correctness
  // Validates: Requirements 10.1, 10.2, 10.3, 14.1
  it('Property 11: getDailyMacros returns the arithmetic sum of all linked recipe macros for the date', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbIsoDate,
        fc.array(fc.record({ recipe: arbRecipe, mealCategory: arbMealCategory }), {
          minLength: 1,
          maxLength: 5,
        }),
        async (date, entries) => {
          await testDb.runAsync('DELETE FROM Food_Log');
          await testDb.runAsync('DELETE FROM Recipe');

          let expectedCalories = 0;
          let expectedProtein = 0;
          let expectedCarbs = 0;
          let expectedFat = 0;

          for (const entry of entries) {
            const recipeId = await insertRecipe(testDb, entry.recipe);
            await testDb.runAsync(
              'INSERT INTO Food_Log (date, recipe_id, meal_category) VALUES (?, ?, ?)',
              date,
              recipeId,
              entry.mealCategory,
            );
            expectedCalories += entry.recipe.calories;
            expectedProtein += entry.recipe.protein;
            expectedCarbs += entry.recipe.carbs;
            expectedFat += entry.recipe.fat;
          }

          const row = await testDb.getFirstAsync<{
            calories: number | null;
            protein: number | null;
            carbs: number | null;
            fat: number | null;
          }>(
            `SELECT SUM(r.calories) AS calories, SUM(r.protein) AS protein,
                    SUM(r.carbs) AS carbs, SUM(r.fat) AS fat
             FROM Food_Log fl
             JOIN Recipe r ON fl.recipe_id = r.id
             WHERE fl.date = ?`,
            date,
          );

          const calories = row?.calories ?? 0;
          const protein = row?.protein ?? 0;
          const carbs = row?.carbs ?? 0;
          const fat = row?.fat ?? 0;

          expect(calories).toBeCloseTo(expectedCalories, 3);
          expect(protein).toBeCloseTo(expectedProtein, 3);
          expect(carbs).toBeCloseTo(expectedCarbs, 3);
          expect(fat).toBeCloseTo(expectedFat, 3);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: fitness-tracker-app, Property 12: Recipe update reflects in food log totals
  // Validates: Requirements 14.2, 18.2
  it('Property 12: updating a recipe macro values reflects in getDailyMacros for dates containing that recipe', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbIsoDate,
        arbMealCategory,
        arbRecipe,
        arbRecipe,
        async (date, mealCategory, originalRecipe, updatedRecipe) => {
          await testDb.runAsync('DELETE FROM Food_Log');
          await testDb.runAsync('DELETE FROM Recipe');

          const recipeId = await insertRecipe(testDb, originalRecipe);

          await testDb.runAsync(
            'INSERT INTO Food_Log (date, recipe_id, meal_category) VALUES (?, ?, ?)',
            date,
            recipeId,
            mealCategory,
          );

          // Update the recipe macros
          await testDb.runAsync(
            'UPDATE Recipe SET name = ?, calories = ?, protein = ?, carbs = ?, fat = ? WHERE id = ?',
            updatedRecipe.name,
            updatedRecipe.calories,
            updatedRecipe.protein,
            updatedRecipe.carbs,
            updatedRecipe.fat,
            recipeId,
          );

          const row = await testDb.getFirstAsync<{
            calories: number | null;
            protein: number | null;
            carbs: number | null;
            fat: number | null;
          }>(
            `SELECT SUM(r.calories) AS calories, SUM(r.protein) AS protein,
                    SUM(r.carbs) AS carbs, SUM(r.fat) AS fat
             FROM Food_Log fl
             JOIN Recipe r ON fl.recipe_id = r.id
             WHERE fl.date = ?`,
            date,
          );

          expect(row?.calories ?? 0).toBeCloseTo(updatedRecipe.calories, 3);
          expect(row?.protein ?? 0).toBeCloseTo(updatedRecipe.protein, 3);
          expect(row?.carbs ?? 0).toBeCloseTo(updatedRecipe.carbs, 3);
          expect(row?.fat ?? 0).toBeCloseTo(updatedRecipe.fat, 3);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: fitness-tracker-app, Property 16: Recipe deletion cascades to food log
  // Validates: Requirements 18.4
  it('Property 16: deleting a recipe removes all food log entries referencing that recipe_id', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbIsoDate,
        fc.array(arbMealCategory, { minLength: 1, maxLength: 5 }),
        arbRecipe,
        async (date, mealCategories, recipe) => {
          await testDb.runAsync('DELETE FROM Food_Log');
          await testDb.runAsync('DELETE FROM Recipe');

          const recipeId = await insertRecipe(testDb, recipe);

          for (const mealCategory of mealCategories) {
            await testDb.runAsync(
              'INSERT INTO Food_Log (date, recipe_id, meal_category) VALUES (?, ?, ?)',
              date,
              recipeId,
              mealCategory,
            );
          }

          const countBefore = await testDb.getFirstAsync<{ count: number }>(
            'SELECT COUNT(*) AS count FROM Food_Log WHERE recipe_id = ?',
            recipeId,
          );
          expect(countBefore!.count).toBe(mealCategories.length);

          await testDb.runAsync('DELETE FROM Recipe WHERE id = ?', recipeId);

          const countAfter = await testDb.getFirstAsync<{ count: number }>(
            'SELECT COUNT(*) AS count FROM Food_Log WHERE recipe_id = ?',
            recipeId,
          );
          expect(countAfter!.count).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
