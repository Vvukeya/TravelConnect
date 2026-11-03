import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const dataDir = path.resolve(process.env.TC_DATA_DIR || path.join(base, 'data'));
mkdirSync(dataDir, { recursive: true, mode: 0o700 });
const db = new DatabaseSync(path.join(dataDir, 'travelconnect.sqlite'));
db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;');
db.exec(`
CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL,
 email TEXT NOT NULL UNIQUE,
 phone TEXT NOT NULL DEFAULT '',
 password_salt TEXT NOT NULL,
 password_hash TEXT NOT NULL,
 role TEXT NOT NULL DEFAULT 'passenger' CHECK(role IN ('passenger','driver','admin')),
 driver_status TEXT NOT NULL DEFAULT 'none' CHECK(driver_status IN ('none','pending','approved','rejected')),
 vehicle TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 created_at TEXT NOT NULL,
 expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_session_user ON sessions(user_id);
CREATE TABLE IF NOT EXISTS trips (
 id TEXT PRIMARY KEY,
 driver_id TEXT NOT NULL REFERENCES users(id),
 from_city TEXT NOT NULL,
 to_city TEXT NOT NULL,
 date TEXT NOT NULL,
 depart TEXT NOT NULL,
 arrive TEXT NOT NULL DEFAULT 'TBC',
 price INTEGER NOT NULL CHECK(price BETWEEN 1 AND 50000),
 seats_total INTEGER NOT NULL CHECK(seats_total BETWEEN 1 AND 8),
 seats_left INTEGER NOT NULL CHECK(seats_left >= 0 AND seats_left <= seats_total),
 vehicle TEXT NOT NULL,
 pickup TEXT NOT NULL,
 dropoff TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('published','cancelled')),
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_trips_route ON trips(from_city,to_city,date,status);
CREATE TABLE IF NOT EXISTS bookings (
 id TEXT PRIMARY KEY,
 passenger_id TEXT NOT NULL REFERENCES users(id),
 trip_id TEXT NOT NULL REFERENCES trips(id),
 seats INTEGER NOT NULL CHECK(seats BETWEEN 1 AND 8),
 total INTEGER NOT NULL CHECK(total > 0),
 status TEXT NOT NULL DEFAULT 'reserved' CHECK(status IN ('reserved','cancelled')),
 request_id TEXT NOT NULL,
 created_at TEXT NOT NULL,
 cancelled_at TEXT,
 UNIQUE(passenger_id, request_id)
);
CREATE INDEX IF NOT EXISTS ix_booking_trip ON bookings(trip_id,status);
CREATE TABLE IF NOT EXISTS messages (
 id TEXT PRIMARY KEY,
 trip_id TEXT NOT NULL REFERENCES trips(id),
 author_id TEXT NOT NULL REFERENCES users(id),
 content TEXT NOT NULL CHECK(length(content) BETWEEN 1 AND 1000),
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_message_trip ON messages(trip_id,created_at);
CREATE TABLE IF NOT EXISTS audit_events (
 id TEXT PRIMARY KEY,
 actor_id TEXT,
 action TEXT NOT NULL,
 details TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL
);
`);
export { db };
export function transaction(fn) {
 db.exec('BEGIN IMMEDIATE');
 try { const out = fn(); db.exec('COMMIT'); return out; }
 catch(e) { db.exec('ROLLBACK'); throw e; }
}
export function audit(actor,action,details='') {
 db.prepare('INSERT INTO audit_events(id,actor_id,action,details,created_at) VALUES(?,?,?,?,?)').run(randomUUID(), actor, action, String(details).slice(0,500), new Date().toISOString());
}
