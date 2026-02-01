import { Database } from 'bun:sqlite';
import { join } from 'node:path';

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

// Migration for existing databases
try {
  db.run("ALTER TABLE user_preferences ADD COLUMN accepted_locations TEXT");
  db.run("ALTER TABLE user_preferences ADD COLUMN rejected_locations TEXT");
  db.run("ALTER TABLE user_job_status ADD COLUMN is_favorite INTEGER DEFAULT 0");
} catch (e) {
  // Columns likely already exist
}

export default db;
