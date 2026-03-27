import * as SQLite from 'expo-sqlite';

async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  const database = await SQLite.openDatabaseAsync('fitness.db');
  await database.execAsync('PRAGMA journal_mode = WAL');
  await database.execAsync('PRAGMA foreign_keys = ON');
  return database;
}

export const db: Promise<SQLite.SQLiteDatabase> = openDatabase();
