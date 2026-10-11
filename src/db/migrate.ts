import type { SQLiteDatabase } from 'expo-sqlite';
import { SEED_PLAN, SEED_RECIPES } from './seed';

const SCHEMA_VERSION = 1;

export async function migrate(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;
  if (version >= SCHEMA_VERSION) return;

  if (version < 1) {
    await db.execAsync(`
      CREATE TABLE recipes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        servings REAL NOT NULL DEFAULT 1,
        instructions TEXT NOT NULL DEFAULT '',
        source_url TEXT,
        image_uri TEXT,
        nutrition_mode TEXT NOT NULL DEFAULT 'ingredients',
        kcal REAL NOT NULL DEFAULT 0,
        protein REAL NOT NULL DEFAULT 0,
        carbs REAL NOT NULL DEFAULT 0,
        fat REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE ingredients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
        position INTEGER NOT NULL DEFAULT 0,
        name TEXT NOT NULL,
        grams REAL NOT NULL DEFAULT 0,
        kcal_100 REAL NOT NULL DEFAULT 0,
        protein_100 REAL NOT NULL DEFAULT 0,
        carbs_100 REAL NOT NULL DEFAULT 0,
        fat_100 REAL NOT NULL DEFAULT 0
      );
      CREATE INDEX ingredients_recipe ON ingredients(recipe_id);
      CREATE TABLE plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE plan_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_id INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
        day INTEGER NOT NULL,
        slot TEXT NOT NULL,
        recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
        servings REAL NOT NULL DEFAULT 1
      );
      CREATE INDEX plan_entries_plan ON plan_entries(plan_id);
      CREATE TABLE food_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        slot TEXT NOT NULL,
        name TEXT NOT NULL,
        recipe_id INTEGER,
        plan_entry_id INTEGER,
        servings REAL NOT NULL DEFAULT 1,
        kcal REAL NOT NULL DEFAULT 0,
        protein REAL NOT NULL DEFAULT 0,
        carbs REAL NOT NULL DEFAULT 0,
        fat REAL NOT NULL DEFAULT 0
      );
      CREATE INDEX food_log_date ON food_log(date);
      CREATE TABLE shopping_checks (
        plan_id INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
        item_key TEXT NOT NULL,
        checked INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (plan_id, item_key)
      );
      CREATE TABLE shopping_extras (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_id INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        checked INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    await seed(db);
  }

  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}

async function seed(db: SQLiteDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    const ids: number[] = [];
    for (const r of SEED_RECIPES) {
      const res = await db.runAsync(
        'INSERT INTO recipes (name, servings, instructions, nutrition_mode) VALUES (?, ?, ?, ?)',
        r.name,
        r.servings,
        r.instructions,
        'ingredients',
      );
      ids.push(res.lastInsertRowId);
      for (const [position, i] of r.ingredients.entries()) {
        await db.runAsync(
          'INSERT INTO ingredients (recipe_id, position, name, grams, kcal_100, protein_100, carbs_100, fat_100) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          res.lastInsertRowId,
          position,
          i.name,
          i.grams,
          i.kcalPer100,
          i.proteinPer100,
          i.carbsPer100,
          i.fatPer100,
        );
      }
    }
    const plan = await db.runAsync('INSERT INTO plans (name, is_active) VALUES (?, 1)', SEED_PLAN.name);
    for (const e of SEED_PLAN.entries) {
      await db.runAsync(
        'INSERT INTO plan_entries (plan_id, day, slot, recipe_id, servings) VALUES (?, ?, ?, ?, ?)',
        plan.lastInsertRowId,
        e.day,
        e.slot,
        ids[e.recipe],
        e.servings,
      );
    }
  });
}
