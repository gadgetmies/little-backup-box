// In-memory sqlite EXIF_DATA fixture for mock mode (Mac/Windows dev,
// USE_MOCKS=true, Playwright).
//
// We use a real :memory: sqlite database rather than filtering a JS array so
// the same WHERE-clause builder runs in both real and mock modes — drift
// between the two would otherwise produce different filtered results in dev
// vs on-device. The rows themselves come from src/utils/viewMockFixture.js,
// which the static GitHub Pages mock (src/utils/mockApi.js) uses as well.
import sqlite3 from 'sqlite3';
import {
  buildMockViewRows,
  mockViewColumns,
  MOCK_INTEGER_COLUMNS,
} from '../../src/utils/viewMockFixture.js';

let cachedDb = null;
let cachedRowsById = null;

/** The fixture rows keyed by ID (used to map a row to its mock media file). */
export function getMockViewRow(id) {
  if (!cachedRowsById) {
    cachedRowsById = new Map(buildMockViewRows().map((row) => [Number(row.ID), row]));
  }
  return cachedRowsById.get(Number(id)) || null;
}

export async function getMockViewDb() {
  if (cachedDb) return cachedDb;

  const db = new sqlite3.Database(':memory:');
  const run = (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.run(sql, params, function cb(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });

  const rows = buildMockViewRows();
  const columns = mockViewColumns(rows);
  const columnSql = columns
    .map((col) => {
      if (col === 'ID') return 'ID integer primary key autoincrement';
      if (MOCK_INTEGER_COLUMNS.includes(col)) return `"${col}" integer default 0`;
      return `"${col}" text`;
    })
    .join(', ');
  await run(`CREATE TABLE EXIF_DATA (${columnSql})`);

  const placeholders = columns.map(() => '?').join(', ');
  const quotedCols = columns.map((c) => `"${c}"`).join(', ');
  for (const row of rows) {
    await run(
      `INSERT INTO EXIF_DATA (${quotedCols}) VALUES (${placeholders})`,
      columns.map((c) => (row[c] === undefined ? null : row[c]))
    );
  }

  cachedDb = db;
  return db;
}
