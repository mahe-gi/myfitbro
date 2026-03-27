import type { FoodLog, Recipe } from '../types/db';
import { db } from './client';

export async function addFoodLogEntry(
  entry: Omit<FoodLog, 'id' | 'created_at'>,
): Promise<number> {
  const database = await db;
  const result = await database.runAsync(
    'INSERT INTO Food_Log (date, recipe_id, meal_category) VALUES (?, ?, ?)',
    entry.date,
    entry.recipe_id,
    entry.meal_category,
  );
  return result.lastInsertRowId;
}

export async function getFoodLogForDate(date: string): Promise<(FoodLog & Recipe)[]> {
  const database = await db;
  return database.getAllAsync<FoodLog & Recipe>(
    `SELECT fl.id, fl.date, fl.recipe_id, fl.meal_category, fl.created_at,
            r.name, r.calories, r.protein, r.carbs, r.fat
     FROM Food_Log fl
     JOIN Recipe r ON fl.recipe_id = r.id
     WHERE fl.date = ?
     ORDER BY fl.created_at ASC`,
    date,
  );
}

export async function deleteFoodLogEntry(id: number): Promise<void> {
  const database = await db;
  await database.runAsync('DELETE FROM Food_Log WHERE id = ?', id);
}

export async function getDailyMacros(
  date: string,
): Promise<{ calories: number; protein: number; carbs: number; fat: number }> {
  const database = await db;
  const row = await database.getFirstAsync<{
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
  return {
    calories: row?.calories ?? 0,
    protein: row?.protein ?? 0,
    carbs: row?.carbs ?? 0,
    fat: row?.fat ?? 0,
  };
}
