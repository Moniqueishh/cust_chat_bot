import Database from 'better-sqlite3';
import path from 'path';

const db = new Database('project_comms.db');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS threads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    projectId TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'open',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    lastMessageAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    installedAt DATETIME,
    completedAt DATETIME,
    expiresAt DATETIME,
    customerEmail TEXT,
    customerName TEXT
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    threadId INTEGER NOT NULL,
    senderType TEXT NOT NULL,
    body TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (threadId) REFERENCES threads(id)
  );

  CREATE TABLE IF NOT EXISTS stats_daily (
    date TEXT PRIMARY KEY,
    messagesCustomer INTEGER DEFAULT 0,
    messagesInstaller INTEGER DEFAULT 0,
    threadsCreated INTEGER DEFAULT 0,
    categories JSON DEFAULT '{}'
  );

  CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    count INTEGER DEFAULT 0,
    resetAt INTEGER NOT NULL
  );
`);

// Add missing columns if they don't exist (migration)
const addColumn = (table: string, column: string, type: string) => {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    console.log(`Added column ${column} to ${table}`);
  } catch (e) {
    // Column likely already exists
  }
};

addColumn('threads', 'lastMessageText', 'TEXT');
addColumn('threads', 'lastMessageSender', 'TEXT');
addColumn('threads', 'needsResponse', 'INTEGER DEFAULT 0');
addColumn('threads', 'unreadForCustomer', 'INTEGER DEFAULT 0');
addColumn('threads', 'unreadForInstaller', 'INTEGER DEFAULT 0');
addColumn('messages', 'category', 'TEXT');
addColumn('messages', 'responseTime', 'INTEGER');

export default db;
