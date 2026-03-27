/**
 * Mock for expo-sqlite using better-sqlite3 for in-memory SQLite in Jest tests.
 * Provides the same async API as expo-sqlite v2.
 */
const BetterSQLite = require('better-sqlite3');

class MockSQLiteRunResult {
  constructor(info) {
    // better-sqlite3 uses lastInsertRowid (lowercase 'i'), not lastInsertRowId
    const rowid = info.lastInsertRowid ?? info.lastInsertRowId;
    this.lastInsertRowId = typeof rowid === 'bigint' ? Number(rowid) : rowid;
    this.changes = typeof info.changes === 'bigint'
      ? Number(info.changes)
      : info.changes;
  }
}

class MockSQLiteDatabase {
  constructor(path) {
    this._path = path;
    this._db = new BetterSQLite(path === ':memory:' ? ':memory:' : path);
    // Enable foreign keys by default
    this._db.pragma('foreign_keys = ON');
  }

  async closeAsync() {
    this._db.close();
  }

  async execAsync(source) {
    // Split on semicolons and execute each statement
    const statements = source
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    for (const stmt of statements) {
      this._db.exec(stmt);
    }
  }

  async runAsync(source, ...params) {
    const flatParams = params.flat();
    const stmt = this._db.prepare(source);
    const info = stmt.run(...flatParams);
    return new MockSQLiteRunResult(info);
  }

  async getFirstAsync(source, ...params) {
    const flatParams = params.flat();
    const stmt = this._db.prepare(source);
    const row = stmt.get(...flatParams);
    return row ?? null;
  }

  async getAllAsync(source, ...params) {
    const flatParams = params.flat();
    const stmt = this._db.prepare(source);
    return stmt.all(...flatParams);
  }

  async withTransactionAsync(task) {
    this._db.exec('BEGIN');
    try {
      await task();
      this._db.exec('COMMIT');
    } catch (e) {
      try {
        this._db.exec('ROLLBACK');
      } catch (_) {}
      throw e;
    }
  }
}

async function openDatabaseAsync(name, _options) {
  return new MockSQLiteDatabase(name);
}

module.exports = {
  openDatabaseAsync,
  MockSQLiteDatabase,
};
