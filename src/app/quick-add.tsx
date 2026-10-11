import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { RecipePicker } from '../components/RecipePicker';
import { Body, Button, Card, Chip, Field, MacroLine, NumberField, Row, Screen, SectionTitle } from '../components/ui';
import { addLog } from '../db/repo';
import { prettyDate, toISODate } from '../lib/dates';
import { perServing, scaleMacros } from '../lib/nutrition';
import { MEAL_SLOTS, type Macros, type MealSlot, type Recipe } from '../lib/types';

function slotForNow(): MealSlot {
  const h = new Date().getHours();
  if (h < 11) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h >= 18 && h < 22) return 'dinner';
  return 'snack';
}

type Params = { date?: string; name?: string; kcal?: string; protein?: string; carbs?: string; fat?: string };

export default function QuickAddScreen() {
  const db = useSQLiteContext();
  const params = useLocalSearchParams<Params>();
  const date = params.date ?? toISODate(new Date());
  const prefilled = Boolean(params.name);
  const [mode, setMode] = useState<'recipe' | 'manual'>(prefilled ? 'manual' : 'recipe');
  const [slot, setSlot] = useState<MealSlot>(slotForNow());
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [servings, setServings] = useState(1);
  const [name, setName] = useState(params.name ?? '');
  const [manual, setManual] = useState<Macros>({
    kcal: Number(params.kcal) || 0,
    protein: Number(params.protein) || 0,
    carbs: Number(params.carbs) || 0,
    fat: Number(params.fat) || 0,
  });
  const [saving, setSaving] = useState(false);

  const canSave = mode === 'recipe' ? Boolean(recipe) && servings > 0 : name.trim().length > 0;

  const save = async () => {
    setSaving(true);
    if (mode === 'recipe' && recipe) {
      await addLog(db, { date, slot, name: recipe.name, recipeId: recipe.id, servings, ...scaleMacros(perServing(recipe), servings) });
    } else {
      await addLog(db, { date, slot, name: name.trim(), servings: 1, ...manual });
    }
    router.back();
  };

  return (
    <Screen>
      <Body muted>Logging for {prettyDate(date).toLowerCase()}</Body>
      <Row style={{ flexWrap: 'wrap' }}>
        {MEAL_SLOTS.map((s) => (
          <Chip key={s} label={s[0].toUpperCase() + s.slice(1)} active={slot === s} onPress={() => setSlot(s)} />
        ))}
      </Row>
      <Row>
        <Chip label="From my recipes" active={mode === 'recipe'} onPress={() => setMode('recipe')} />
        <Chip label="Enter calories & macros" active={mode === 'manual'} onPress={() => setMode('manual')} />
      </Row>

      {mode === 'recipe' ? (
        <>
          {recipe ? (
            <Card>
              <Body style={{ fontWeight: '600' }}>{recipe.name}</Body>
              <Row>
                <NumberField label="Servings eaten" value={servings} onChange={setServings} />
              </Row>
              <MacroLine macros={scaleMacros(perServing(recipe), servings)} />
            </Card>
          ) : null}
          <Button title="Add to log" onPress={save} disabled={!canSave} loading={saving} />
          <SectionTitle>Pick a recipe</SectionTitle>
          <RecipePicker onPick={setRecipe} selectedId={recipe?.id} />
        </>
      ) : (
        <Card>
          <Field label="What did you eat?" value={name} onChangeText={setName} placeholder="e.g. Cappuccino" />
          <Row>
            <NumberField label="kcal" value={manual.kcal} onChange={(kcal) => setManual({ ...manual, kcal })} />
            <NumberField label="Protein g" value={manual.protein} onChange={(protein) => setManual({ ...manual, protein })} />
          </Row>
          <Row>
            <NumberField label="Carbs g" value={manual.carbs} onChange={(carbs) => setManual({ ...manual, carbs })} />
            <NumberField label="Fat g" value={manual.fat} onChange={(fat) => setManual({ ...manual, fat })} />
          </Row>
          <Button title="Add to log" onPress={save} disabled={!canSave} loading={saving} />
        </Card>
      )}
    </Screen>
  );
}
