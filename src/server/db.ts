import { Database } from 'bun:sqlite';
import { join } from 'node:path';
import { classifyEmploymentType } from './utils/employmentType';
import { postedDateFromAge } from './utils/age';

const db = new Database(join(process.cwd(), 'jobs.db'));
db.exec('PRAGMA journal_mode = WAL');

// Initialize tables
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
  );
`);

db.run(`
  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company TEXT NOT NULL,
    role TEXT NOT NULL,
    location TEXT NOT NULL,
    terms TEXT NOT NULL,
    application_link TEXT UNIQUE NOT NULL,
    source TEXT NOT NULL,
    age_text TEXT NOT NULL,
    date_added TEXT NOT NULL,
    parsed_date TEXT
  );
`);

db.run(`
  CREATE TABLE IF NOT EXISTS user_job_status (
    user_id INTEGER NOT NULL,
    job_id INTEGER NOT NULL,
    status TEXT CHECK(status IN ('unprocessed', 'applied', 'skipped')) DEFAULT 'unprocessed',
    is_favorite INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, job_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (job_id) REFERENCES jobs(id)
  );
`);

db.run(`
  CREATE TABLE IF NOT EXISTS user_preferences (
    user_id INTEGER PRIMARY KEY,
    accepted_titles TEXT, -- JSON array
    rejected_titles TEXT, -- JSON array
    accepted_locations TEXT, -- JSON array
    rejected_locations TEXT, -- JSON array
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Idempotent column migrations for databases created before a column existed.
// Each ALTER MUST be guarded independently: bundling them in one try means a
// pre-existing column throws and silently skips every later ALTER (which is how
// `is_favorite` went missing and broke the /jobs query).
const COLUMN_MIGRATIONS = [
  "ALTER TABLE user_preferences ADD COLUMN accepted_locations TEXT",
  "ALTER TABLE user_preferences ADD COLUMN rejected_locations TEXT",
  "ALTER TABLE user_job_status ADD COLUMN is_favorite INTEGER DEFAULT 0",
  "ALTER TABLE jobs ADD COLUMN employment_type TEXT",
  "ALTER TABLE user_preferences ADD COLUMN employment_types TEXT",
  "ALTER TABLE user_preferences ADD COLUMN disciplines TEXT",
];
for (const stmt of COLUMN_MIGRATIONS) {
  try {
    db.run(stmt);
  } catch (e) {
    // Column likely already exists.
  }
}

/**
 * Backfill `employment_type` for any rows scraped before the column existed.
 * Runs cheaply on every startup: once classified, no rows match the WHERE clause.
 */
function backfillEmploymentTypes(): void {
  const rows = db
    .prepare("SELECT id, role, terms, source FROM jobs WHERE employment_type IS NULL")
    .all() as { id: number; role: string; terms: string; source: string }[];
  if (rows.length === 0) return;

  const update = db.prepare("UPDATE jobs SET employment_type = ? WHERE id = ?");
  const tx = db.transaction((items: typeof rows) => {
    for (const row of items) {
      update.run(classifyEmploymentType(row.role, row.terms, row.source), row.id);
    }
  });
  tx(rows);
}

backfillEmploymentTypes();

/**
 * Backfill `parsed_date` for legacy rows that only have a relative `age_text`,
 * inferring the posting date from age + when the row was added. Enables accurate
 * time-range filtering. Idempotent: once set, rows no longer match the WHERE clause.
 */
function backfillParsedDates(): void {
  const rows = db
    .prepare("SELECT id, age_text, date_added FROM jobs WHERE parsed_date IS NULL")
    .all() as { id: number; age_text: string; date_added: string }[];
  if (rows.length === 0) return;

  const update = db.prepare("UPDATE jobs SET parsed_date = ? WHERE id = ?");
  const tx = db.transaction((items: typeof rows) => {
    for (const row of items) {
      const posted = postedDateFromAge(row.age_text, row.date_added);
      if (posted) update.run(posted, row.id);
    }
  });
  tx(rows);
}

backfillParsedDates();

export default db;
