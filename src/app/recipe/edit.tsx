import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { usePalette } from '../../components/theme';
import { Body, Button, Card, Chip, Field, MacroLine, NumberField, Row, Screen, SectionTitle } from '../../components/ui';
import { getRecipe, saveRecipe } from '../../db/repo';
import { takePendingDraft } from '../../lib/draftStore';
import { ingredientMacros, perServing, round } from '../../lib/nutrition';
import type { Ingredient, RecipeDraft } from '../../lib/types';

type Row_ = Ingredient & { uid: number };
let nextUid = 1;
const withUid = (i: Ingredient): Row_ => ({ ...i, uid: nextUid++ });
const blankIngredient = (): Row_ => withUid({ name: '', grams: 0, kcalPer100: 0, proteinPer100: 0, carbsPer100: 0, fatPer100: 0 });

const EMPTY: RecipeDraft = {
  name: '',
  servings: 1,
  instructions: '',
  sourceUrl: null,
  imageUri: null,
  nutritionMode: 'ingredients',
  manual: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  ingredients: [],
};

export default function EditRecipeScreen() {
  const db = useSQLiteContext();
  const p = usePalette();
  const params = useLocalSearchParams<{ id?: string; draft?: string }>();
  const [draft, setDraft] = useState<RecipeDraft | null>(null);
  const [rows, setRows] = useState<Row_[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      let initial: RecipeDraft = EMPTY;
      if (params.draft) initial = takePendingDraft() ?? EMPTY;
      else if (params.id) initial = (await getRecipe(db, Number(params.id))) ?? EMPTY;
      setDraft(initial);
      setRows(initial.ingredients.length ? initial.ingredients.map(withUid) : [blankIngredient()]);
    })();
  }, [db, params.id, params.draft]);

  if (!draft) return <Screen><Body muted>Loading…</Body></Screen>;

  const update = (patch: Partial<RecipeDraft>) => setDraft({ ...draft, ...patch });
  const updateRow = (uid: number, patch: Partial<Ingredient>) => setRows((rs) => rs.map((r) => (r.uid === uid ? { ...r, ...patch } : r)));
  const current: RecipeDraft = { ...draft, ingredients: rows };
  const computed = perServing({ ...current, nutritionMode: 'ingredients' });

  const switchMode = (mode: RecipeDraft['nutritionMode']) => {
    // Seed the manual numbers with what the ingredients add up to, so switching never starts from zero.
    if (mode === 'manual' && draft.manual.kcal === 0) update({ nutritionMode: mode, manual: computed });
    else update({ nutritionMode: mode });
  };

  const save = async () => {
    setSaving(true);
    const id = await saveRecipe(db, current);
    if (params.id) router.back();
    else router.replace(`/recipe/${id}`);
  };

  return (
    <Screen>
      <Field label="Recipe name" value={draft.name} onChangeText={(name) => update({ name })} placeholder="e.g. Chicken curry" />
      <Row>
        <NumberField label="Servings the recipe makes" value={draft.servings} onChange={(servings) => update({ servings })} />
      </Row>

      <SectionTitle>Nutrition</SectionTitle>
      <Row style={{ flexWrap: 'wrap' }}>
        <Chip label="Calculate from ingredients" active={draft.nutritionMode === 'ingredients'} onPress={() => switchMode('ingredients')} />
        <Chip label="Enter per serving" active={draft.nutritionMode === 'manual'} onPress={() => switchMode('manual')} />
      </Row>
      <Card>
        {draft.nutritionMode === 'manual' ? (
          <>
            <Row>
              <NumberField label="kcal / serving" value={draft.manual.kcal} onChange={(kcal) => update({ manual: { ...draft.manual, kcal } })} />
              <NumberField label="Protein g" value={draft.manual.protein} onChange={(protein) => update({ manual: { ...draft.manual, protein } })} />
            </Row>
            <Row>
              <NumberField label="Carbs g" value={draft.manual.carbs} onChange={(carbs) => update({ manual: { ...draft.manual, carbs } })} />
              <NumberField label="Fat g" value={draft.manual.fat} onChange={(fat) => update({ manual: { ...draft.manual, fat } })} />
            </Row>
          </>
        ) : (
          <>
            <Body muted style={{ fontSize: 13 }}>Per serving, from the ingredients below</Body>
            <MacroLine macros={computed} />
          </>
        )}
      </Card>

      <SectionTitle>Ingredients</SectionTitle>
      {draft.nutritionMode === 'ingredients' ? (
        <Body muted style={{ fontSize: 13 }}>Weights are for the whole recipe. Nutrition values are per 100 g, as on food labels.</Body>
      ) : (
        <Body muted style={{ fontSize: 13 }}>Weights are for the whole recipe and feed your shopping list.</Body>
      )}
      {rows.map((r) => (
        <Card key={r.uid}>
          <Row>
            <View style={{ flex: 2 }}>
              <Field placeholder="Ingredient" value={r.name} onChangeText={(name) => updateRow(r.uid, { name })} />
            </View>
            <NumberField value={r.grams} onChange={(grams) => updateRow(r.uid, { grams })} style={{ flex: 1 }} />
            <Body muted>g</Body>
            <Pressable onPress={() => setRows((rs) => rs.filter((x) => x.uid !== r.uid))} hitSlop={8} accessibilityLabel="Remove ingredient">
              <Ionicons name="close" size={20} color={p.muted} />
            </Pressable>
          </Row>
          {draft.nutritionMode === 'ingredients' ? (
            <>
              <Row>
                <NumberField label="kcal/100g" value={r.kcalPer100} onChange={(kcalPer100) => updateRow(r.uid, { kcalPer100 })} />
                <NumberField label="P/100g" value={r.proteinPer100} onChange={(proteinPer100) => updateRow(r.uid, { proteinPer100 })} />
                <NumberField label="C/100g" value={r.carbsPer100} onChange={(carbsPer100) => updateRow(r.uid, { carbsPer100 })} />
                <NumberField label="F/100g" value={r.fatPer100} onChange={(fatPer100) => updateRow(r.uid, { fatPer100 })} />
              </Row>
              {r.grams > 0 ? <Body muted style={{ fontSize: 12 }}>{round(ingredientMacros(r).kcal)} kcal for {round(r.grams)} g</Body> : null}
            </>
          ) : null}
        </Card>
      ))}
      <Button title="+ Add ingredient" variant="secondary" onPress={() => setRows((rs) => [...rs, blankIngredient()])} />

      <SectionTitle>Method</SectionTitle>
      <Field
        value={draft.instructions}
        onChangeText={(instructions) => update({ instructions })}
        placeholder="Steps, one per line"
        multiline
        style={{ minHeight: 120, textAlignVertical: 'top' }}
      />

      <Button title="Save recipe" onPress={save} loading={saving} disabled={!draft.name.trim()} />
    </Screen>
  );
}
