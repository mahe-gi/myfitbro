import { db } from './client';

export async function applySchema(): Promise<void> {
  const database = await db;

  await database.execAsync(`
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

    CREATE INDEX IF NOT EXISTS idx_workout_session_date
      ON Workout_Session(date);

    CREATE TABLE IF NOT EXISTS Workout_Set (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_session_id INTEGER NOT NULL REFERENCES Workout_Session(id) ON DELETE CASCADE,
      exercise_id        INTEGER NOT NULL REFERENCES Exercise(id),
      weight             REAL    NOT NULL,
      reps               INTEGER NOT NULL,
      created_at         TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_workout_set_session
      ON Workout_Set(workout_session_id);

    CREATE INDEX IF NOT EXISTS idx_workout_set_exercise
      ON Workout_Set(exercise_id);

    CREATE TABLE IF NOT EXISTS Exercise_PR (
      exercise_id INTEGER PRIMARY KEY REFERENCES Exercise(id),
      max_weight  REAL    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Weight_Entry (
      date  TEXT PRIMARY KEY,
      value REAL NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_weight_entry_date
      ON Weight_Entry(date);

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

    CREATE INDEX IF NOT EXISTS idx_food_log_date
      ON Food_Log(date);

    CREATE TABLE IF NOT EXISTS User_Settings (
      id          INTEGER PRIMARY KEY CHECK(id = 1),
      weight_unit TEXT    NOT NULL DEFAULT 'kg' CHECK(weight_unit IN ('kg','lbs'))
    );
  `);
}
