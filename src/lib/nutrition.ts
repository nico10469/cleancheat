import type { Ingredient, Macros, PlanEntry, Recipe, ShoppingItem } from './types';

export const ZERO: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

export function addMacros(a: Macros, b: Macros): Macros {
  return {
    kcal: a.kcal + b.kcal,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
  };
}

export function scaleMacros(m: Macros, factor: number): Macros {
  return {
    kcal: m.kcal * factor,
    protein: m.protein * factor,
    carbs: m.carbs * factor,
    fat: m.fat * factor,
  };
}

export function ingredientMacros(i: Ingredient): Macros {
  const f = (i.grams || 0) / 100;
  return {
    kcal: i.kcalPer100 * f,
    protein: i.proteinPer100 * f,
    carbs: i.carbsPer100 * f,
    fat: i.fatPer100 * f,
  };
}

/** Whole-recipe totals computed from ingredient weights. */
export function ingredientsTotal(ingredients: Ingredient[]): Macros {
  return ingredients.map(ingredientMacros).reduce(addMacros, ZERO);
}

export function perServing(recipe: Pick<Recipe, 'servings' | 'nutritionMode' | 'manual' | 'ingredients'>): Macros {
  if (recipe.nutritionMode === 'manual') return recipe.manual;
  const servings = recipe.servings > 0 ? recipe.servings : 1;
  return scaleMacros(ingredientsTotal(recipe.ingredients), 1 / servings);
}

/** Calories implied by macros (4/4/9 kcal per gram). */
export function kcalFromMacros(m: Pick<Macros, 'protein' | 'carbs' | 'fat'>): number {
  return m.protein * 4 + m.carbs * 4 + m.fat * 9;
}

export function round(n: number, digits = 0): number {
  const p = 10 ** digits;
  return Math.round(n * p) / p;
}

function singular(word: string): string {
  if (word.length <= 3) return word;
  if (/(ch|sh|x|o)es$/.test(word)) return word.slice(0, -2);
  if (/ies$/.test(word)) return word.slice(0, -3) + 'y';
  if (/[^sui]s$/.test(word)) return word.slice(0, -1);
  return word;
}

/** Key used to merge the same ingredient across recipes ("Eggs" and "egg" become one line). */
export function normalizeIngredientName(name: string): string {
  const words = name
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^\p{L}\p{N} ]+/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return '';
  words[words.length - 1] = singular(words[words.length - 1]);
  return words.join(' ');
}

/**
 * Aggregates ingredient weights across every entry of a weekly plan.
 * Each entry contributes the recipe's ingredients scaled by entry servings / recipe servings.
 */
export function buildShoppingList(entries: Pick<PlanEntry, 'recipeId' | 'servings'>[], recipes: Map<number, Recipe>): ShoppingItem[] {
  const items = new Map<string, ShoppingItem>();
  for (const entry of entries) {
    const recipe = recipes.get(entry.recipeId);
    if (!recipe) continue;
    const factor = entry.servings / (recipe.servings > 0 ? recipe.servings : 1);
    for (const ing of recipe.ingredients) {
      const key = normalizeIngredientName(ing.name);
      if (!key) continue;
      const existing = items.get(key);
      const grams = (ing.grams || 0) * factor;
      if (existing) {
        existing.grams += grams;
        if (!existing.usedIn.includes(recipe.name)) existing.usedIn.push(recipe.name);
      } else {
        items.set(key, { key, name: ing.name.trim(), grams, usedIn: [recipe.name] });
      }
    }
  }
  return [...items.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function formatWeight(grams: number): string {
  if (grams <= 0) return '';
  if (grams >= 1000) return `${round(grams / 1000, 2)} kg`;
  return `${Math.ceil(grams)} g`;
}
