import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractRecipeFromHtml, parseIngredientLine, parseNutritionValue } from '../src/lib/recipeImport.ts';

test('ingredient lines become name + grams', () => {
  assert.deepEqual(parseIngredientLine('200 g chicken breast'), { name: 'chicken breast', grams: 200 });
  assert.deepEqual(parseIngredientLine('1 ½ cups of rice'), { name: 'rice', grams: 360 });
  assert.deepEqual(parseIngredientLine('2 tbsp. olive oil'), { name: 'olive oil', grams: 30 });
  assert.deepEqual(parseIngredientLine('1.5kg potatoes'), { name: 'potatoes', grams: 1500 });
  assert.deepEqual(parseIngredientLine('2 eggs'), { name: 'eggs', grams: 0 });
  assert.deepEqual(parseIngredientLine('salt to taste'), { name: 'salt to taste', grams: 0 });
  assert.deepEqual(parseIngredientLine('1/2 lb ground beef'), { name: 'ground beef', grams: 227 });
});

test('nutrition strings parse to numbers', () => {
  assert.equal(parseNutritionValue('350 kcal'), 350);
  assert.equal(parseNutritionValue('12,5 g'), 12.5);
  assert.equal(parseNutritionValue(undefined), 0);
});

test('extracts a schema.org Recipe nested in @graph', () => {
  const html = `<html><head>
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","name":"x"}</script>
    <script type="application/ld+json">
    {"@context":"https://schema.org","@graph":[
      {"@type":"Organization","name":"Site"},
      {"@type":["Recipe"],"name":"Lemon Chicken &amp; Rice","recipeYield":["4","4 servings"],
       "image":{"url":"https://example.com/a.jpg"},
       "recipeIngredient":["500 g chicken thighs","1 cup rice","1 lemon"],
       "recipeInstructions":[{"@type":"HowToSection","itemListElement":[{"@type":"HowToStep","text":"Brown the chicken."}]},{"@type":"HowToStep","text":"Add <b>rice</b>."}],
       "nutrition":{"@type":"NutritionInformation","calories":"520 kcal","proteinContent":"38 g","carbohydrateContent":"45 g","fatContent":"18 g"}}
    ]}
    </script></head></html>`;
  const r = extractRecipeFromHtml(html, 'https://example.com/lemon');
  assert.ok(r);
  assert.equal(r.name, 'Lemon Chicken & Rice');
  assert.equal(r.servings, 4);
  assert.equal(r.imageUri, 'https://example.com/a.jpg');
  assert.equal(r.instructions, '1. Brown the chicken.\n2. Add rice.');
  assert.deepEqual(r.manual, { kcal: 520, protein: 38, carbs: 45, fat: 18 });
  assert.deepEqual(
    r.ingredients.map((i) => [i.name, i.grams]),
    [
      ['chicken thighs', 500],
      ['rice', 240],
      ['lemon', 0],
    ],
  );
});

test('returns null when a page has no recipe', () => {
  assert.equal(extractRecipeFromHtml('<html><body>hi</body></html>'), null);
});
