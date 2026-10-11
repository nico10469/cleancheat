import type { Ingredient, RecipeDraft } from './types';

/** Approximate grams per unit. Volumes assume water density, which is close enough for a shopping list. */
const UNIT_GRAMS: Record<string, number> = {
  g: 1, gr: 1, gram: 1, grams: 1, gramm: 1,
  kg: 1000, kilo: 1000, kilos: 1000, kilogram: 1000, kilograms: 1000,
  mg: 0.001,
  oz: 28.35, ounce: 28.35, ounces: 28.35,
  lb: 453.6, lbs: 453.6, pound: 453.6, pounds: 453.6,
  ml: 1, milliliter: 1, milliliters: 1, millilitre: 1, millilitres: 1,
  cl: 10, dl: 100,
  l: 1000, liter: 1000, liters: 1000, litre: 1000, litres: 1000,
  cup: 240, cups: 240,
  tbsp: 15, tablespoon: 15, tablespoons: 15, tbs: 15, tbl: 15,
  tsp: 5, teaspoon: 5, teaspoons: 5,
  pinch: 0.5, dash: 0.5,
  clove: 5, cloves: 5,
  slice: 30, slices: 30,
};

const UNICODE_FRACTIONS: Record<string, string> = {
  '½': '1/2', '⅓': '1/3', '⅔': '2/3', '¼': '1/4', '¾': '3/4', '⅛': '1/8',
};

function parseQuantity(raw: string): number | null {
  const s = raw.trim();
  let m = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (m) return Number(m[1]) + Number(m[2]) / Number(m[3]);
  m = s.match(/^(\d+)\/(\d+)$/);
  if (m) return Number(m[1]) / Number(m[2]);
  m = s.match(/^(\d+(?:[.,]\d+)?)\s*[-–]\s*(\d+(?:[.,]\d+)?)$/);
  if (m) return (Number(m[1].replace(',', '.')) + Number(m[2].replace(',', '.'))) / 2;
  m = s.match(/^\d+(?:[.,]\d+)?$/);
  if (m) return Number(s.replace(',', '.'));
  return null;
}

/**
 * Turns a free-text ingredient line ("200 g chicken breast", "1 ½ cups rice") into a name and
 * an estimated weight in grams. Counts without a unit ("2 eggs") get 0 g so the user fills them in.
 */
export function parseIngredientLine(line: string): { name: string; grams: number } {
  let s = line.replace(/[½⅓⅔¼¾⅛]/g, (c) => ` ${UNICODE_FRACTIONS[c]}`).replace(/\s+/g, ' ').trim();
  s = s.replace(/^[-•*]\s*/, '');
  const qty = s.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?\s*[-–]\s*\d+(?:[.,]\d+)?|\d+(?:[.,]\d+)?)\s*/);
  if (!qty) return { name: s, grams: 0 };
  const amount = parseQuantity(qty[1]) ?? 0;
  let rest = s.slice(qty[0].length);
  const unit = rest.match(/^([a-zA-Z]+)\b\.?\s*/);
  if (unit && UNIT_GRAMS[unit[1].toLowerCase()] !== undefined) {
    rest = rest.slice(unit[0].length).replace(/^of\s+/i, '');
    return { name: rest.trim() || s, grams: Math.round(amount * UNIT_GRAMS[unit[1].toLowerCase()]) };
  }
  return { name: rest.trim() || s, grams: 0 };
}

/** "350 kcal", "12.5 g", "350 calories" → number */
export function parseNutritionValue(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v !== 'string') return 0;
  const m = v.replace(',', '.').match(/\d+(?:\.\d+)?/);
  if (!m) return 0;
  let n = Number(m[0]);
  if (/\bkj\b/i.test(v) && !/kcal|cal/i.test(v)) n = n / 4.184;
  return n;
}

function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

function isRecipeNode(node: any): boolean {
  if (!node || typeof node !== 'object') return false;
  return asArray(node['@type']).some((t) => typeof t === 'string' && t.toLowerCase() === 'recipe');
}

function findRecipeNode(data: any): any | null {
  for (const node of asArray(data)) {
    if (isRecipeNode(node)) return node;
    if (node && typeof node === 'object') {
      const nested = findRecipeNode(node['@graph']) ?? findRecipeNode(node.mainEntity);
      if (nested) return nested;
    }
  }
  return null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_m, d) => String.fromCharCode(Number(d)));
}

function cleanText(s: unknown): string {
  if (typeof s !== 'string') return '';
  return decodeEntities(s.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim();
}

function instructionsText(v: any): string[] {
  const out: string[] = [];
  for (const step of asArray(v)) {
    if (typeof step === 'string') out.push(cleanText(step));
    else if (step && typeof step === 'object') {
      if (step.itemListElement) out.push(...instructionsText(step.itemListElement));
      else if (step.text) out.push(cleanText(step.text));
      else if (step.name) out.push(cleanText(step.name));
    }
  }
  return out.filter(Boolean);
}

function parseServings(v: any): number {
  for (const y of asArray(v)) {
    const n = typeof y === 'number' ? y : parseInt(String(y).match(/\d+/)?.[0] ?? '', 10);
    if (n > 0) return n;
  }
  return 1;
}

function imageUrl(v: any): string | null {
  const first = asArray(v)[0];
  if (typeof first === 'string') return first;
  if (first && typeof first === 'object' && typeof first.url === 'string') return first.url;
  return null;
}

/** Extracts a schema.org Recipe from a web page's JSON-LD. Most recipe sites publish one. */
export function extractRecipeFromHtml(html: string, sourceUrl: string | null = null): RecipeDraft | null {
  const scripts = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const [, body] of scripts) {
    let data: unknown;
    try {
      data = JSON.parse(body.trim());
    } catch {
      continue;
    }
    const node = findRecipeNode(data);
    if (node) return recipeFromSchema(node, sourceUrl);
  }
  return null;
}

export function recipeFromSchema(node: any, sourceUrl: string | null): RecipeDraft {
  const ingredients: Ingredient[] = asArray(node.recipeIngredient ?? node.ingredients).map((line: unknown) => {
    const { name, grams } = parseIngredientLine(cleanText(line));
    return { name, grams, kcalPer100: 0, proteinPer100: 0, carbsPer100: 0, fatPer100: 0 };
  });
  const n = node.nutrition ?? {};
  const manual = {
    kcal: parseNutritionValue(n.calories),
    protein: parseNutritionValue(n.proteinContent),
    carbs: parseNutritionValue(n.carbohydrateContent),
    fat: parseNutritionValue(n.fatContent),
  };
  return {
    name: cleanText(node.name) || 'Imported recipe',
    servings: parseServings(node.recipeYield),
    instructions: instructionsText(node.recipeInstructions).map((s, i) => `${i + 1}. ${s}`).join('\n'),
    sourceUrl,
    imageUri: imageUrl(node.image),
    // Imported ingredients have no per-100 g values, so the page's per-serving nutrition is the best source.
    nutritionMode: 'manual',
    manual,
    ingredients,
  };
}
