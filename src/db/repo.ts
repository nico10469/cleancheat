import type { SQLiteDatabase } from 'expo-sqlite';
import type { Goals, Ingredient, LogEntry, Macros, MealSlot, Plan, PlanEntry, Recipe, RecipeDraft } from '../lib/types';

type RecipeRow = {
  id: number;
  name: string;
  servings: number;
  instructions: string;
  source_url: string | null;
  image_uri: string | null;
  nutrition_mode: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

type IngredientRow = {
  id: number;
  recipe_id: number;
  name: string;
  grams: number;
  kcal_100: number;
  protein_100: number;
  carbs_100: number;
  fat_100: number;
};

function toIngredient(r: IngredientRow): Ingredient {
  return {
    id: r.id,
    name: r.name,
    grams: r.grams,
    kcalPer100: r.kcal_100,
    proteinPer100: r.protein_100,
    carbsPer100: r.carbs_100,
    fatPer100: r.fat_100,
  };
}

function toRecipe(r: RecipeRow, ingredients: Ingredient[]): Recipe {
  return {
    id: r.id,
    name: r.name,
    servings: r.servings,
    instructions: r.instructions,
    sourceUrl: r.source_url,
    imageUri: r.image_uri,
    nutritionMode: r.nutrition_mode === 'manual' ? 'manual' : 'ingredients',
    manual: { kcal: r.kcal, protein: r.protein, carbs: r.carbs, fat: r.fat },
    ingredients,
  };
}

// ---------- Recipes ----------

export async function listRecipes(db: SQLiteDatabase): Promise<Recipe[]> {
  const rows = await db.getAllAsync<RecipeRow>('SELECT * FROM recipes ORDER BY name COLLATE NOCASE');
  const ingRows = await db.getAllAsync<IngredientRow>('SELECT * FROM ingredients ORDER BY recipe_id, position');
  const byRecipe = new Map<number, Ingredient[]>();
  for (const i of ingRows) {
    const list = byRecipe.get(i.recipe_id) ?? [];
    list.push(toIngredient(i));
    byRecipe.set(i.recipe_id, list);
  }
  return rows.map((r) => toRecipe(r, byRecipe.get(r.id) ?? []));
}

export async function getRecipe(db: SQLiteDatabase, id: number): Promise<Recipe | null> {
  const row = await db.getFirstAsync<RecipeRow>('SELECT * FROM recipes WHERE id = ?', id);
  if (!row) return null;
  const ings = await db.getAllAsync<IngredientRow>('SELECT * FROM ingredients WHERE recipe_id = ? ORDER BY position', id);
  return toRecipe(row, ings.map(toIngredient));
}

export async function saveRecipe(db: SQLiteDatabase, draft: RecipeDraft): Promise<number> {
  let id = draft.id;
  await db.withTransactionAsync(async () => {
    const values = [
      draft.name.trim() || 'Untitled recipe',
      draft.servings > 0 ? draft.servings : 1,
      draft.instructions,
      draft.sourceUrl,
      draft.imageUri,
      draft.nutritionMode,
      draft.manual.kcal,
      draft.manual.protein,
      draft.manual.carbs,
      draft.manual.fat,
    ] as const;
    if (id) {
      await db.runAsync(
        `UPDATE recipes SET name = ?, servings = ?, instructions = ?, source_url = ?, image_uri = ?,
         nutrition_mode = ?, kcal = ?, protein = ?, carbs = ?, fat = ? WHERE id = ?`,
        ...values,
        id,
      );
      await db.runAsync('DELETE FROM ingredients WHERE recipe_id = ?', id);
    } else {
      const res = await db.runAsync(
        `INSERT INTO recipes (name, servings, instructions, source_url, image_uri, nutrition_mode, kcal, protein, carbs, fat)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ...values,
      );
      id = res.lastInsertRowId;
    }
    for (const [position, i] of draft.ingredients.entries()) {
      if (!i.name.trim()) continue;
      await db.runAsync(
        `INSERT INTO ingredients (recipe_id, position, name, grams, kcal_100, protein_100, carbs_100, fat_100)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        id!,
        position,
        i.name.trim(),
        i.grams,
        i.kcalPer100,
        i.proteinPer100,
        i.carbsPer100,
        i.fatPer100,
      );
    }
  });
  return id!;
}

export async function deleteRecipe(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM recipes WHERE id = ?', id);
}

// ---------- Plans ----------

export async function listPlans(db: SQLiteDatabase): Promise<Plan[]> {
  const rows = await db.getAllAsync<{ id: number; name: string; is_active: number }>('SELECT * FROM plans ORDER BY id');
  return rows.map((r) => ({ id: r.id, name: r.name, isActive: r.is_active === 1 }));
}

export async function getActivePlan(db: SQLiteDatabase): Promise<Plan | null> {
  const plans = await listPlans(db);
  return plans.find((p) => p.isActive) ?? plans[0] ?? null;
}

export async function setActivePlan(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('UPDATE plans SET is_active = CASE WHEN id = ? THEN 1 ELSE 0 END', id);
}

/** Creates a plan, optionally copying every meal from another plan, and makes it active. */
export async function createPlan(db: SQLiteDatabase, name: string, copyFrom?: number): Promise<number> {
  let id = 0;
  await db.withTransactionAsync(async () => {
    const res = await db.runAsync('INSERT INTO plans (name) VALUES (?)', name.trim() || 'New plan');
    id = res.lastInsertRowId;
    if (copyFrom) {
      await db.runAsync(
        `INSERT INTO plan_entries (plan_id, day, slot, recipe_id, servings)
         SELECT ?, day, slot, recipe_id, servings FROM plan_entries WHERE plan_id = ?`,
        id,
        copyFrom,
      );
    }
    await db.runAsync('UPDATE plans SET is_active = CASE WHEN id = ? THEN 1 ELSE 0 END', id);
  });
  return id;
}

export async function renamePlan(db: SQLiteDatabase, id: number, name: string): Promise<void> {
  await db.runAsync('UPDATE plans SET name = ? WHERE id = ?', name.trim() || 'Plan', id);
}

export async function deletePlan(db: SQLiteDatabase, id: number): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM plans WHERE id = ?', id);
    const active = await db.getFirstAsync<{ id: number }>('SELECT id FROM plans WHERE is_active = 1');
    if (!active) await db.runAsync('UPDATE plans SET is_active = 1 WHERE id = (SELECT MIN(id) FROM plans)');
  });
}

type PlanEntryRow = { id: number; plan_id: number; day: number; slot: MealSlot; recipe_id: number; servings: number };

export async function getPlanEntries(db: SQLiteDatabase, planId: number): Promise<PlanEntry[]> {
  const rows = await db.getAllAsync<PlanEntryRow>('SELECT * FROM plan_entries WHERE plan_id = ? ORDER BY day, id', planId);
  return rows.map((r) => ({ id: r.id, planId: r.plan_id, day: r.day, slot: r.slot, recipeId: r.recipe_id, servings: r.servings }));
}

export async function addPlanEntry(db: SQLiteDatabase, e: Omit<PlanEntry, 'id'>): Promise<void> {
  await db.runAsync(
    'INSERT INTO plan_entries (plan_id, day, slot, recipe_id, servings) VALUES (?, ?, ?, ?, ?)',
    e.planId,
    e.day,
    e.slot,
    e.recipeId,
    e.servings,
  );
}

export async function updatePlanEntryServings(db: SQLiteDatabase, id: number, servings: number): Promise<void> {
  await db.runAsync('UPDATE plan_entries SET servings = ? WHERE id = ?', servings, id);
}

export async function deletePlanEntry(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM plan_entries WHERE id = ?', id);
}

// ---------- Food log ----------

type LogRow = {
  id: number;
  date: string;
  slot: MealSlot;
  name: string;
  recipe_id: number | null;
  plan_entry_id: number | null;
  servings: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type LoggedEntry = LogEntry & { planEntryId: number | null };

export async function getLog(db: SQLiteDatabase, date: string): Promise<LoggedEntry[]> {
  const rows = await db.getAllAsync<LogRow>('SELECT * FROM food_log WHERE date = ? ORDER BY id', date);
  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    slot: r.slot,
    name: r.name,
    recipeId: r.recipe_id,
    planEntryId: r.plan_entry_id,
    servings: r.servings,
    kcal: r.kcal,
    protein: r.protein,
    carbs: r.carbs,
    fat: r.fat,
  }));
}

/** Macros are stored as totals for the logged amount, so later recipe edits don't rewrite history. */
export async function addLog(
  db: SQLiteDatabase,
  e: { date: string; slot: MealSlot; name: string; recipeId?: number | null; planEntryId?: number | null; servings: number } & Macros,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO food_log (date, slot, name, recipe_id, plan_entry_id, servings, kcal, protein, carbs, fat)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    e.date,
    e.slot,
    e.name,
    e.recipeId ?? null,
    e.planEntryId ?? null,
    e.servings,
    e.kcal,
    e.protein,
    e.carbs,
    e.fat,
  );
}

export async function deleteLog(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM food_log WHERE id = ?', id);
}

/** Daily totals for a date range, for the weekly overview. */
export async function getDailyTotals(db: SQLiteDatabase, from: string, to: string): Promise<Map<string, Macros>> {
  const rows = await db.getAllAsync<{ date: string } & Macros>(
    `SELECT date, SUM(kcal) AS kcal, SUM(protein) AS protein, SUM(carbs) AS carbs, SUM(fat) AS fat
     FROM food_log WHERE date BETWEEN ? AND ? GROUP BY date`,
    from,
    to,
  );
  return new Map(rows.map((r) => [r.date, { kcal: r.kcal, protein: r.protein, carbs: r.carbs, fat: r.fat }]));
}

// ---------- Settings ----------

export const DEFAULT_GOALS: Goals = { kcal: 2000, protein: 150, carbs: 200, fat: 65 };

export async function getSetting(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
  return row?.value ?? null;
}

export async function setSetting(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    value,
  );
}

export async function getGoals(db: SQLiteDatabase): Promise<Goals> {
  const raw = await getSetting(db, 'goals');
  if (!raw) return DEFAULT_GOALS;
  try {
    return { ...DEFAULT_GOALS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_GOALS;
  }
}

export async function saveGoals(db: SQLiteDatabase, goals: Goals): Promise<void> {
  await setSetting(db, 'goals', JSON.stringify(goals));
}

// ---------- Shopping list ----------

export async function getShoppingChecks(db: SQLiteDatabase, planId: number): Promise<Set<string>> {
  const rows = await db.getAllAsync<{ item_key: string }>(
    'SELECT item_key FROM shopping_checks WHERE plan_id = ? AND checked = 1',
    planId,
  );
  return new Set(rows.map((r) => r.item_key));
}

export async function setShoppingCheck(db: SQLiteDatabase, planId: number, key: string, checked: boolean): Promise<void> {
  await db.runAsync(
    `INSERT INTO shopping_checks (plan_id, item_key, checked) VALUES (?, ?, ?)
     ON CONFLICT(plan_id, item_key) DO UPDATE SET checked = excluded.checked`,
    planId,
    key,
    checked ? 1 : 0,
  );
}

export type ShoppingExtra = { id: number; name: string; checked: boolean };

export async function getShoppingExtras(db: SQLiteDatabase, planId: number): Promise<ShoppingExtra[]> {
  const rows = await db.getAllAsync<{ id: number; name: string; checked: number }>(
    'SELECT id, name, checked FROM shopping_extras WHERE plan_id = ? ORDER BY id',
    planId,
  );
  return rows.map((r) => ({ id: r.id, name: r.name, checked: r.checked === 1 }));
}

export async function addShoppingExtra(db: SQLiteDatabase, planId: number, name: string): Promise<void> {
  await db.runAsync('INSERT INTO shopping_extras (plan_id, name) VALUES (?, ?)', planId, name.trim());
}

export async function setShoppingExtraChecked(db: SQLiteDatabase, id: number, checked: boolean): Promise<void> {
  await db.runAsync('UPDATE shopping_extras SET checked = ? WHERE id = ?', checked ? 1 : 0, id);
}

export async function deleteShoppingExtra(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM shopping_extras WHERE id = ?', id);
}

/** Starts a fresh shopping week: unticks everything and removes extra items. */
export async function resetShopping(db: SQLiteDatabase, planId: number): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM shopping_checks WHERE plan_id = ?', planId);
    await db.runAsync('DELETE FROM shopping_extras WHERE plan_id = ?', planId);
  });
}
