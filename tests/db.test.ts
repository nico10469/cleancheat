import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import { migrate } from '../src/db/migrate.ts';
import * as repo from '../src/db/repo.ts';
import { buildShoppingList, perServing } from '../src/lib/nutrition.ts';

/** Minimal stand-in for expo-sqlite's async API on top of node:sqlite, to exercise the real SQL. */
function fakeDb(): SQLiteDatabase {
  const d = new DatabaseSync(':memory:');
  const flat = (params: unknown[]) => (params.length === 1 && Array.isArray(params[0]) ? params[0] : params) as any[];
  const db = {
    execAsync: async (sql: string) => d.exec(sql),
    getFirstAsync: async (sql: string, ...p: unknown[]) => d.prepare(sql).get(...flat(p)) ?? null,
    getAllAsync: async (sql: string, ...p: unknown[]) => d.prepare(sql).all(...flat(p)),
    runAsync: async (sql: string, ...p: unknown[]) => {
      const r = d.prepare(sql).run(...flat(p));
      return { lastInsertRowId: Number(r.lastInsertRowid), changes: Number(r.changes) };
    },
    withTransactionAsync: async (task: () => Promise<void>) => {
      d.exec('BEGIN');
      try {
        await task();
        d.exec('COMMIT');
      } catch (e) {
        d.exec('ROLLBACK');
        throw e;
      }
    },
  };
  return db as unknown as SQLiteDatabase;
}

test('migration seeds recipes and an active weekly plan', async () => {
  const db = fakeDb();
  await migrate(db);
  await migrate(db); // second run is a no-op
  const recipes = await repo.listRecipes(db);
  assert.equal(recipes.length, 10);
  const plan = await repo.getActivePlan(db);
  assert.ok(plan);
  const entries = await repo.getPlanEntries(db, plan.id);
  assert.equal(entries.length, 28);
  for (const r of recipes) assert.ok(perServing(r).kcal > 100, `${r.name} has calories`);
  const list = buildShoppingList(entries, new Map(recipes.map((r) => [r.id, r])));
  assert.ok(list.find((i) => i.key === 'olive oil'));
});

test('recipes, plans, log, goals and shopping state round-trip', async () => {
  const db = fakeDb();
  await migrate(db);
  const id = await repo.saveRecipe(db, {
    name: 'Tuna salad',
    servings: 2,
    instructions: 'Mix.',
    sourceUrl: null,
    imageUri: null,
    nutritionMode: 'manual',
    manual: { kcal: 350, protein: 30, carbs: 10, fat: 20 },
    ingredients: [{ name: 'Tuna', grams: 160, kcalPer100: 0, proteinPer100: 0, carbsPer100: 0, fatPer100: 0 }],
  });
  const saved = await repo.getRecipe(db, id);
  assert.equal(saved?.ingredients[0].name, 'Tuna');
  assert.deepEqual(perServing(saved!), { kcal: 350, protein: 30, carbs: 10, fat: 20 });

  const copy = await repo.createPlan(db, 'Cut', (await repo.getActivePlan(db))!.id);
  assert.equal((await repo.getActivePlan(db))!.id, copy);
  assert.equal((await repo.getPlanEntries(db, copy)).length, 28);
  await repo.addPlanEntry(db, { planId: copy, day: 0, slot: 'lunch', recipeId: id, servings: 1 });
  await repo.deleteRecipe(db, id); // cascades out of the plan
  assert.equal((await repo.getPlanEntries(db, copy)).length, 28);
  await repo.deletePlan(db, copy);
  assert.ok((await repo.getActivePlan(db))!.isActive);

  await repo.addLog(db, { date: '2026-10-12', slot: 'snack', name: 'Apple', servings: 1, kcal: 95, protein: 0.5, carbs: 25, fat: 0.3 });
  assert.equal((await repo.getLog(db, '2026-10-12')).length, 1);
  assert.equal((await repo.getDailyTotals(db, '2026-10-12', '2026-10-18')).get('2026-10-12')?.kcal, 95);

  await repo.saveGoals(db, { kcal: 1800, protein: 140, carbs: 160, fat: 60 });
  assert.equal((await repo.getGoals(db)).kcal, 1800);

  const planId = (await repo.getActivePlan(db))!.id;
  await repo.setShoppingCheck(db, planId, 'egg', true);
  await repo.addShoppingExtra(db, planId, 'Coffee');
  assert.ok((await repo.getShoppingChecks(db, planId)).has('egg'));
  await repo.resetShopping(db, planId);
  assert.equal((await repo.getShoppingChecks(db, planId)).size, 0);
  assert.equal((await repo.getShoppingExtras(db, planId)).length, 0);
});
