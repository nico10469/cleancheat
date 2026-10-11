import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { usePalette } from '../../components/theme';
import { Body, Button, Card, Chip, Field, MacroLine, Row, Screen, SectionTitle } from '../../components/ui';
import {
  createPlan,
  deletePlan,
  deletePlanEntry,
  getActivePlan,
  getGoals,
  getPlanEntries,
  listPlans,
  listRecipes,
  renamePlan,
  setActivePlan,
  updatePlanEntryServings,
} from '../../db/repo';
import { planDayIndex, toISODate } from '../../lib/dates';
import { addMacros, perServing, round, scaleMacros, ZERO } from '../../lib/nutrition';
import { DAY_NAMES, MEAL_SLOTS, type MealSlot } from '../../lib/types';
import { useReload } from '../../lib/useReload';

const SLOT_LABEL: Record<MealSlot, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snacks' };

export default function PlanScreen() {
  const db = useSQLiteContext();
  const p = usePalette();
  const [day, setDay] = useState(planDayIndex(toISODate(new Date())));
  const [renaming, setRenaming] = useState<string | null>(null);

  const { data, reload } = useReload(async () => {
    const [plans, active, recipes, goals] = await Promise.all([listPlans(db), getActivePlan(db), listRecipes(db), getGoals(db)]);
    const entries = active ? await getPlanEntries(db, active.id) : [];
    return { plans, active, entries, recipes: new Map(recipes.map((r) => [r.id, r])), goals };
  }, []);

  if (!data) return <Screen><Body muted>Loading…</Body></Screen>;
  const { plans, active, entries, recipes, goals } = data;

  const entryMacros = (e: (typeof entries)[number]) => {
    const r = recipes.get(e.recipeId);
    return r ? scaleMacros(perServing(r), e.servings) : ZERO;
  };
  const dayTotals = (d: number) => entries.filter((e) => e.day === d).map(entryMacros).reduce(addMacros, ZERO);
  const weekAvg = scaleMacros([0, 1, 2, 3, 4, 5, 6].map(dayTotals).reduce(addMacros, ZERO), 1 / 7);
  const today = dayTotals(day);

  const newPlan = (copy: boolean) => {
    const name = copy && active ? `${active.name} (copy)` : 'New plan';
    createPlan(db, name, copy ? active?.id : undefined).then(reload);
  };

  const confirmDelete = () => {
    if (!active) return;
    if (plans.length <= 1) {
      Alert.alert('Keep at least one plan', 'Create another plan before deleting this one.');
      return;
    }
    Alert.alert('Delete plan', `Delete “${active.name}” and all its meals?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deletePlan(db, active.id).then(reload) },
    ]);
  };

  const changeServings = (id: number, current: number, delta: number) => {
    const next = Math.max(0.5, current + delta);
    updatePlanEntryServings(db, id, next).then(reload);
  };

  return (
    <Screen>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {plans.map((plan) => (
          <Chip key={plan.id} label={plan.name} active={plan.id === active?.id} onPress={() => setActivePlan(db, plan.id).then(reload)} />
        ))}
      </ScrollView>

      {active ? (
        <Card>
          {renaming !== null ? (
            <Row>
              <View style={{ flex: 1 }}>
                <Field value={renaming} onChangeText={setRenaming} autoFocus />
              </View>
              <Button
                title="Save"
                small
                onPress={() => renamePlan(db, active.id, renaming).then(() => {
                  setRenaming(null);
                  reload();
                })}
              />
            </Row>
          ) : (
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: p.text }}>{active.name}</Text>
                <Body muted style={{ fontSize: 13 }}>Active plan · used for your shopping list</Body>
              </View>
              <Pressable onPress={() => setRenaming(active.name)} hitSlop={10} accessibilityLabel="Rename plan">
                <Ionicons name="pencil" size={18} color={p.primary} />
              </Pressable>
            </Row>
          )}
          <Body muted style={{ fontSize: 13 }}>
            Daily average {round(weekAvg.kcal)} kcal · P {round(weekAvg.protein)}g · C {round(weekAvg.carbs)}g · F {round(weekAvg.fat)}g
          </Body>
          <Row style={{ flexWrap: 'wrap' }}>
            <Button title="New plan" small variant="secondary" onPress={() => newPlan(false)} />
            <Button title="Duplicate" small variant="secondary" onPress={() => newPlan(true)} />
            <Button title="Delete" small variant="ghost" onPress={confirmDelete} />
          </Row>
        </Card>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {DAY_NAMES.map((name, i) => (
          <Chip key={name} label={name.slice(0, 3)} active={day === i} onPress={() => setDay(i)} />
        ))}
      </ScrollView>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: p.text }}>{DAY_NAMES[day]}</Text>
          <Body muted style={{ color: today.kcal > goals.kcal * 1.05 ? p.danger : p.muted }}>
            {round(today.kcal)} / {round(goals.kcal)} kcal
          </Body>
        </Row>
        <MacroLine macros={today} />
      </Card>

      {active
        ? MEAL_SLOTS.map((slot) => {
            const slotEntries = entries.filter((e) => e.day === day && e.slot === slot);
            return (
              <View key={slot} style={{ gap: 8 }}>
                <SectionTitle
                  right={
                    <Button
                      title="+ Add"
                      small
                      variant="ghost"
                      onPress={() => router.push({ pathname: '/pick-recipe', params: { planId: active.id, day, slot } })}
                    />
                  }
                >
                  {SLOT_LABEL[slot]}
                </SectionTitle>
                {slotEntries.length === 0 ? (
                  <Body muted style={{ fontSize: 13 }}>Nothing planned.</Body>
                ) : (
                  slotEntries.map((e) => {
                    const r = recipes.get(e.recipeId);
                    if (!r) return null;
                    return (
                      <Card key={e.id}>
                        <Row style={{ justifyContent: 'space-between' }}>
                          <Pressable style={{ flex: 1 }} onPress={() => router.push(`/recipe/${r.id}`)}>
                            <Body style={{ fontWeight: '600' }}>{r.name}</Body>
                            <MacroLine macros={entryMacros(e)} />
                          </Pressable>
                          <Pressable onPress={() => deletePlanEntry(db, e.id).then(reload)} hitSlop={10} accessibilityLabel={`Remove ${r.name}`}>
                            <Ionicons name="trash-outline" size={20} color={p.muted} />
                          </Pressable>
                        </Row>
                        <Row>
                          <Body muted style={{ fontSize: 13 }}>Servings</Body>
                          <Button title="−" small variant="secondary" onPress={() => changeServings(e.id, e.servings, -0.5)} />
                          <Body>{e.servings}</Body>
                          <Button title="+" small variant="secondary" onPress={() => changeServings(e.id, e.servings, 0.5)} />
                        </Row>
                      </Card>
                    );
                  })
                )}
              </View>
            );
          })
        : null}
    </Screen>
  );
}
