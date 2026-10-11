import type { Ingredient, MealSlot } from '../lib/types';

type SeedRecipe = { name: string; servings: number; instructions: string; ingredients: Ingredient[] };

// [name, grams, kcal, protein, carbs, fat] with nutrition per 100 g (typical values, raw/dry weights).
type Row = [string, number, number, number, number, number];
const ing = (rows: Row[]): Ingredient[] =>
  rows.map(([name, grams, kcalPer100, proteinPer100, carbsPer100, fatPer100]) => ({
    name,
    grams,
    kcalPer100,
    proteinPer100,
    carbsPer100,
    fatPer100,
  }));

export const SEED_RECIPES: SeedRecipe[] = [
  {
    name: 'Greek yogurt bowl',
    servings: 1,
    instructions: '1. Spoon the yogurt into a bowl.\n2. Top with blueberries and walnuts.\n3. Drizzle with honey.',
    ingredients: ing([
      ['Greek yogurt 2%', 200, 73, 10, 3.9, 2],
      ['Blueberries', 80, 57, 0.7, 14.5, 0.3],
      ['Walnuts', 15, 654, 15, 14, 65],
      ['Honey', 10, 304, 0.3, 82, 0],
    ]),
  },
  {
    name: 'Overnight oats',
    servings: 1,
    instructions: '1. Mix oats, chia seeds and milk in a jar.\n2. Refrigerate overnight.\n3. Top with sliced banana.',
    ingredients: ing([
      ['Rolled oats', 60, 379, 13.2, 67.7, 6.5],
      ['Milk', 200, 50, 3.4, 4.8, 1.8],
      ['Banana', 100, 89, 1.1, 22.8, 0.3],
      ['Chia seeds', 10, 486, 16.5, 42.1, 30.7],
    ]),
  },
  {
    name: 'Veggie omelette',
    servings: 1,
    instructions: '1. Sauté pepper and spinach in the oil.\n2. Pour in beaten eggs and cook until set.\n3. Crumble feta on top and fold.',
    ingredients: ing([
      ['Eggs', 150, 143, 12.6, 0.7, 9.5],
      ['Spinach', 50, 23, 2.9, 3.6, 0.4],
      ['Bell pepper', 60, 31, 1, 6, 0.3],
      ['Feta cheese', 30, 264, 14.2, 4.1, 21.3],
      ['Olive oil', 5, 884, 0, 0, 100],
    ]),
  },
  {
    name: 'Chicken rice bowl',
    servings: 2,
    instructions: '1. Cook the rice.\n2. Sear sliced chicken in oil, add soy sauce.\n3. Steam broccoli and serve everything together.',
    ingredients: ing([
      ['Chicken breast', 300, 120, 22.5, 0, 2.6],
      ['Basmati rice', 150, 356, 8, 78, 0.6],
      ['Broccoli', 200, 34, 2.8, 6.6, 0.4],
      ['Olive oil', 15, 884, 0, 0, 100],
      ['Soy sauce', 20, 53, 8.1, 4.9, 0.6],
    ]),
  },
  {
    name: 'Salmon with quinoa',
    servings: 2,
    instructions: '1. Cook quinoa.\n2. Roast salmon and asparagus at 200°C for 12–15 min with oil and lemon.\n3. Serve over quinoa.',
    ingredients: ing([
      ['Salmon fillet', 300, 208, 20, 0, 13],
      ['Quinoa', 140, 368, 14.1, 64.2, 6.1],
      ['Asparagus', 200, 20, 2.2, 3.9, 0.1],
      ['Lemon', 50, 29, 1.1, 9.3, 0.3],
      ['Olive oil', 10, 884, 0, 0, 100],
    ]),
  },
  {
    name: 'Red lentil soup',
    servings: 4,
    instructions: '1. Soften onion and carrot in oil.\n2. Add lentils, tomatoes and stock.\n3. Simmer 25 min and blend.',
    ingredients: ing([
      ['Red lentils', 250, 352, 24.6, 60, 1.1],
      ['Carrot', 200, 41, 0.9, 9.6, 0.2],
      ['Onion', 150, 40, 1.1, 9.3, 0.1],
      ['Canned tomatoes', 400, 20, 1, 3.5, 0.2],
      ['Vegetable stock', 1000, 5, 0.2, 0.9, 0.1],
      ['Olive oil', 15, 884, 0, 0, 100],
    ]),
  },
  {
    name: 'Turkey hummus wrap',
    servings: 1,
    instructions: '1. Spread hummus on the tortilla.\n2. Add turkey, lettuce and tomato.\n3. Roll up tightly.',
    ingredients: ing([
      ['Whole wheat tortilla', 60, 310, 9, 51, 8],
      ['Turkey breast slices', 80, 104, 17, 4, 2],
      ['Hummus', 30, 166, 7.9, 14.3, 9.6],
      ['Lettuce', 30, 15, 1.4, 2.9, 0.2],
      ['Tomato', 60, 18, 0.9, 3.9, 0.2],
    ]),
  },
  {
    name: 'Beef noodle stir-fry',
    servings: 2,
    instructions: '1. Boil noodles.\n2. Stir-fry beef in sesame oil, add vegetables.\n3. Toss with noodles and soy sauce.',
    ingredients: ing([
      ['Lean beef strips', 300, 137, 21.4, 0, 5],
      ['Egg noodles', 150, 384, 14, 71, 4.4],
      ['Stir-fry vegetables', 300, 40, 2, 7, 0.3],
      ['Soy sauce', 30, 53, 8.1, 4.9, 0.6],
      ['Sesame oil', 10, 884, 0, 0, 100],
    ]),
  },
  {
    name: 'Apple & peanut butter',
    servings: 1,
    instructions: 'Slice the apple and dip in peanut butter.',
    ingredients: ing([
      ['Apple', 180, 52, 0.3, 13.8, 0.2],
      ['Peanut butter', 30, 588, 25, 20, 50],
    ]),
  },
  {
    name: 'Protein smoothie',
    servings: 1,
    instructions: 'Blend everything until smooth.',
    ingredients: ing([
      ['Whey protein', 30, 400, 80, 8, 6],
      ['Banana', 100, 89, 1.1, 22.8, 0.3],
      ['Milk', 250, 50, 3.4, 4.8, 1.8],
      ['Peanut butter', 15, 588, 25, 20, 50],
    ]),
  },
];

// Indexes into SEED_RECIPES.
const BREAKFAST = [0, 1, 2, 0, 1, 2, 1];
const LUNCH = [6, 5, 3, 6, 5, 4, 7];
const DINNER = [3, 4, 7, 5, 3, 7, 4];
const SNACK = [8, 9, 8, 9, 8, 9, 8];

export const SEED_PLAN: {
  name: string;
  entries: { day: number; slot: MealSlot; recipe: number; servings: number }[];
} = {
  name: 'Balanced week',
  entries: [0, 1, 2, 3, 4, 5, 6].flatMap((day) => [
    { day, slot: 'breakfast' as const, recipe: BREAKFAST[day], servings: 1 },
    { day, slot: 'lunch' as const, recipe: LUNCH[day], servings: 1 },
    { day, slot: 'dinner' as const, recipe: DINNER[day], servings: 1 },
    { day, slot: 'snack' as const, recipe: SNACK[day], servings: 1 },
  ]),
};
