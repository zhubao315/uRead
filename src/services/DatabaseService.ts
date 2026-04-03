import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';

export class DatabaseService {
  private db: Database | null = null;
  private dbPath: string;

  constructor() {
    this.dbPath = process.env.DATABASE_PATH || './data/uread.db';
    this.ensureDataDirectory();
  }

  private ensureDataDirectory(): void {
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  public async initialize(): Promise<void> {
    try {
      // Ensure data directory exists
      this.ensureDataDirectory();

      // Open database connection
      this.db = await open({
        filename: this.dbPath,
        driver: sqlite3.Database
      });

      // Enable foreign key constraints
      await this.db.exec('PRAGMA foreign_keys = ON;');

      // Run migrations
      await this.runMigrations();

      console.log(`✅ Database initialized at ${this.dbPath}`);
    } catch (error) {
      throw new Error(`Failed to initialize database: ${error}`);
    }
  }

  private async runMigrations(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const migrations = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        avatar TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,

      // Books table
      `CREATE TABLE IF NOT EXISTS books (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        isbn TEXT,
        publisher TEXT,
        publish_year INTEGER,
        cover_url TEXT,
        description TEXT,
        pages INTEGER,
        language TEXT DEFAULT 'en',
        status TEXT CHECK(status IN ('reading', 'completed', 'wishlist')) DEFAULT 'wishlist',
        rating REAL CHECK(rating >= 1 AND rating <= 5),
        tags TEXT, -- JSON array stored as string
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,

      // Notes table
      `CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        book_id TEXT NOT NULL,
        type TEXT CHECK(type IN ('highlight', 'note', 'summary')) DEFAULT 'note',
        content TEXT NOT NULL,
        position INTEGER,
        quote TEXT,
        color TEXT,
        tags TEXT, -- JSON array stored as string
        is_public BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
      );`,

      // BookLists table
      `CREATE TABLE IF NOT EXISTS booklists (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        type TEXT CHECK(type IN ('personal', 'curated', 'shared')) DEFAULT 'personal',
        books TEXT, -- JSON array of book IDs
        tags TEXT, -- JSON array stored as string
        is_public BOOLEAN DEFAULT FALSE,
        collaborators TEXT, -- JSON array of user IDs
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );`,

      // KnowledgeCards table
      `CREATE TABLE IF NOT EXISTS knowledge_cards (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        source_book_id TEXT NOT NULL,
        source_note_id TEXT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT CHECK(type IN ('concept', 'fact', 'quote', 'idea')) DEFAULT 'concept',
        category TEXT,
        tags TEXT, -- JSON array stored as string
        related_cards TEXT, -- JSON array of card IDs
        metadata TEXT, -- JSON object stored as string
        is_template BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (source_book_id) REFERENCES books(id) ON DELETE CASCADE,
        FOREIGN KEY (source_note_id) REFERENCES notes(id) ON DELETE CASCADE
      );`,

      // Indexes for better query performance
      `CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);`,
      `CREATE INDEX IF NOT EXISTS idx_notes_book_id ON notes(book_id);`,
      `CREATE INDEX IF NOT EXISTS idx_knowledge_cards_user_id ON knowledge_cards(user_id);`,
      `CREATE INDEX IF NOT EXISTS idx_knowledge_cards_source_book ON knowledge_cards(source_book_id);`
    ];

    for (const migration of migrations) {
      await this.db.exec(migration);
    }
  }

  public getConnection(): Database {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  public async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}