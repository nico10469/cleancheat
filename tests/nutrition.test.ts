import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildShoppingList, normalizeIngredientName, perServing } from '../src/lib/nutrition.ts';
import type { Recipe } from '../src/lib/types.ts';

const oats: Recipe = {
  id: 1,
  name: 'Overnight oats',
  servings: 2,
  instructions: '',
  sourceUrl: null,
  imageUri: null,
  nutritionMode: 'ingredients',
  manual: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  ingredients: [
    { name: 'Rolled oats', grams: 100, kcalPer100: 380, proteinPer100: 13, carbsPer100: 60, fatPer100: 7 },
    { name: 'Milk', grams: 300, kcalPer100: 50, proteinPer100: 3.4, carbsPer100: 5, fatPer100: 1.8 },
  ],
};

const eggs: Recipe = {
  ...oats,
  id: 2,
  name: 'Scrambled eggs',
  servings: 1,
  ingredients: [
    { name: 'Eggs', grams: 120, kcalPer100: 143, proteinPer100: 12.6, carbsPer100: 0.7, fatPer100: 9.5 },
    { name: 'milk', grams: 30, kcalPer100: 50, proteinPer100: 3.4, carbsPer100: 5, fatPer100: 1.8 },
  ],
};

test('per-serving macros come from ingredient weights', () => {
  const m = perServing(oats);
  assert.equal(m.kcal, (380 + 150) / 2);
  assert.ok(Math.abs(m.protein - (13 + 10.2) / 2) < 1e-9);
});

test('manual mode uses the stored per-serving values', () => {
  const m = perServing({ ...oats, nutritionMode: 'manual', manual: { kcal: 410, protein: 20, carbs: 50, fat: 12 } });
  assert.deepEqual(m, { kcal: 410, protein: 20, carbs: 50, fat: 12 });
});

test('ingredient names merge across case and plurals', () => {
  assert.equal(normalizeIngredientName('Eggs'), 'egg');
  assert.equal(normalizeIngredientName('Tomatoes (ripe)'), 'tomato');
  assert.equal(normalizeIngredientName('Berries'), 'berry');
  assert.equal(normalizeIngredientName('Hummus'), 'hummus');
  assert.equal(normalizeIngredientName('Swiss chard'), 'swiss chard');
});

test('shopping list scales by planned servings and merges ingredients', () => {
  const recipes = new Map([
    [1, oats],
    [2, eggs],
  ]);
  const list = buildShoppingList(
    [
      { recipeId: 1, servings: 1 }, // half the oats recipe
      { recipeId: 1, servings: 1 },
      { recipeId: 2, servings: 2 }, // double eggs
      { recipeId: 99, servings: 1 }, // deleted recipe is ignored
    ],
    recipes,
  );
  const byKey = Object.fromEntries(list.map((i) => [i.key, i]));
  assert.equal(byKey['rolled oat'].grams, 100);
  assert.equal(byKey['milk'].grams, 300 + 60);
  assert.deepEqual(byKey['milk'].usedIn, ['Overnight oats', 'Scrambled eggs']);
  assert.equal(byKey['egg'].grams, 240);
});
