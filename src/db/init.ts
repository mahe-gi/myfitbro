import { db } from './client';
import { applySchema } from './schema';
import { seedExercises } from './exercises';
import { SEED_EXERCISES } from './seeds';

export async function initDatabase(): Promise<void> {
  await applySchema();

  const database = await db;

  const exerciseCount = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM Exercise',
  );

  const settings = await database.getFirstAsync<{ id: number }>(
    'SELECT id FROM User_Settings WHERE id = 1',
  );

  if (!exerciseCount || exerciseCount.count === 0) {
    await seedExercises(SEED_EXERCISES);
  }

  if (!settings) {
    await database.runAsync(
      "INSERT INTO User_Settings (id, weight_unit) VALUES (1, 'kg')",
    );
  }
}
