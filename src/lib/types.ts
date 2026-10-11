export type Macros = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type Ingredient = {
  id?: number;
  name: string;
  grams: number;
  /** Nutrition per 100 g of this ingredient. */
  kcalPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatPer100: number;
};

/**
 * 'ingredients': per-serving macros are computed from the ingredient list.
 * 'manual': the user (or an imported page) gave per-serving macros directly.
 */
export type NutritionMode = 'ingredients' | 'manual';

export type Recipe = {
  id: number;
  name: string;
  servings: number;
  instructions: string;
  sourceUrl: string | null;
  imageUri: string | null;
  nutritionMode: NutritionMode;
  manual: Macros;
  ingredients: Ingredient[];
};

export type RecipeDraft = Omit<Recipe, 'id'> & { id?: number };

export const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];

export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export type Plan = {
  id: number;
  name: string;
  isActive: boolean;
};

export type PlanEntry = {
  id: number;
  planId: number;
  /** 0 = Monday … 6 = Sunday */
  day: number;
  slot: MealSlot;
  recipeId: number;
  servings: number;
};

export type LogEntry = Macros & {
  id: number;
  date: string;
  slot: MealSlot;
  name: string;
  recipeId: number | null;
  servings: number;
};

export type Goals = Macros;

export type ShoppingItem = {
  key: string;
  name: string;
  grams: number;
  /** Recipes that need this ingredient, for display. */
  usedIn: string[];
};
