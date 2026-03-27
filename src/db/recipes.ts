import type { Recipe } from '../types/db';
import { db } from './client';

export async function getAllRecipes(): Promise<Recipe[]> {
  const database = await db;
  return database.getAllAsync<Recipe>('SELECT * FROM Recipe ORDER BY name ASC');
}

export async function createRecipe(r: Omit<Recipe, 'id'>): Promise<number> {
  const database = await db;
  const result = await database.runAsync(
    'INSERT INTO Recipe (name, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?)',
    r.name,
    r.calories,
    r.protein,
    r.carbs,
    r.fat,
  );
  return result.lastInsertRowId;
}

export async function updateRecipe(id: number, r: Omit<Recipe, 'id'>): Promise<void> {
  const database = await db;
  await database.runAsync(
    'UPDATE Recipe SET name = ?, calories = ?, protein = ?, carbs = ?, fat = ? WHERE id = ?',
    r.name,
    r.calories,
    r.protein,
    r.carbs,
    r.fat,
    id,
  );
}

export async function deleteRecipe(id: number): Promise<void> {
  const database = await db;
  await database.runAsync('DELETE FROM Recipe WHERE id = ?', id);
}

export async function getRecipesForFoodLog(recipeIds: number[]): Promise<Recipe[]> {
  if (recipeIds.length === 0) return [];
  const database = await db;
  const placeholders = recipeIds.map(() => '?').join(', ');
  return database.getAllAsync<Recipe>(
    `SELECT * FROM Recipe WHERE id IN (${placeholders})`,
    ...recipeIds,
  );
}
