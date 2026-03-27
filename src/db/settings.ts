import type { UserSettings, WeightUnit } from '../types/db';
import { db } from './client';

export async function getSettings(): Promise<UserSettings> {
  const database = await db;
  const row = await database.getFirstAsync<UserSettings>(
    'SELECT * FROM User_Settings WHERE id = 1',
  );
  if (row) return row;
  await database.runAsync(
    "INSERT INTO User_Settings (id, weight_unit) VALUES (1, 'kg')",
  );
  return { id: 1, weight_unit: 'kg' };
}

export async function updateWeightUnit(unit: WeightUnit): Promise<void> {
  const database = await db;
  await database.runAsync(
    'UPDATE User_Settings SET weight_unit = ? WHERE id = 1',
    unit,
  );
}
