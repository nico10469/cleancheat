import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { usePalette } from '../../components/theme';
import { Body, Button, Card, MacroLine, ProgressBar, Row, Screen, SectionTitle } from '../../components/ui';
import {
  addLog,
  deleteLog,
  getActivePlan,
  getDailyTotals,
  getGoals,
  getLog,
  getPlanEntries,
  listRecipes,
} from '../../db/repo';
import { addDays, fromISODate, planDayIndex, prettyDate, toISODate, weekStart } from '../../lib/dates';
import { addMacros, perServing, round, scaleMacros, ZERO } from '../../lib/nutrition';
import { DAY_NAMES, MEAL_SLOTS, type MealSlot } from '../../lib/types';
import { useReload } from '../../lib/useReload';

const SLOT_LABEL: Record<MealSlot, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' };

export default function TodayScreen() {
  const db = useSQLiteContext();
  const p = usePalette();
  const [date, setDate] = useState(toISODate(new Date()));

  const { data, reload } = useReload(async () => {
    const [goals, log, plan, recipes] = await Promise.all([getGoals(db), getLog(db, date), getActivePlan(db), listRecipes(db)]);
    const entries = plan ? (await getPlanEntries(db, plan.id)).filter((e) => e.day === planDayIndex(date)) : [];
    const monday = weekStart(date);
    const week = await getDailyTotals(db, monday, addDays(monday, 6));
    return { goals, log, plan, entries, recipes: new Map(recipes.map((r) => [r.id, r])), monday, week };
  }, [date]);

  if (!data) return <Screen><Body muted>Loading…</Body></Screen>;
  const { goals, log, entries, recipes, monday, week } = data;
  const totals = log.reduce((acc, e) => addMacros(acc, e), ZERO);
  const remaining = goals.kcal - totals.kcal;

  const logPlanned = async (entryId: number) => {
    const entry = entries.find((e) => e.id === entryId);
    const recipe = entry && recipes.get(entry.recipeId);
    if (!entry || !recipe) return;
    await addLog(db, {
      date,
      slot: entry.slot,
      name: recipe.name,
      recipeId: recipe.id,
      planEntryId: entry.id,
      servings: entry.servings,
      ...scaleMacros(perServing(recipe), entry.servings),
    });
    reload();
  };

  const remove = (id: number, name: string) =>
    Alert.alert('Remove entry', `Remove ${name} from ${prettyDate(date).toLowerCase()}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteLog(db, id).then(reload) },
    ]);

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Pressable onPress={() => setDate(addDays(date, -1))} hitSlop={12} accessibilityLabel="Previous day">
          <Ionicons name="chevron-back" size={24} color={p.primary} />
        </Pressable>
        <Pressable onPress={() => setDate(toISODate(new Date()))}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: p.text }}>{prettyDate(date)}</Text>
        </Pressable>
        <Pressable onPress={() => setDate(addDays(date, 1))} hitSlop={12} accessibilityLabel="Next day">
          <Ionicons name="chevron-forward" size={24} color={p.primary} />
        </Pressable>
      </Row>

      <Card>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View>
            <Text style={{ fontSize: 34, fontWeight: '800', color: p.text }}>{round(totals.kcal)}</Text>
            <Body muted>of {round(goals.kcal)} kcal</Body>
          </View>
          <Body muted style={{ color: remaining < 0 ? p.danger : p.muted }}>
            {remaining >= 0 ? `${round(remaining)} kcal left` : `${round(-remaining)} kcal over`}
          </Body>
        </Row>
        <ProgressBar value={totals.kcal} goal={goals.kcal} color={p.primary} />
        {(
          [
            ['Protein', totals.protein, goals.protein, p.protein],
            ['Carbs', totals.carbs, goals.carbs, p.carbs],
            ['Fat', totals.fat, goals.fat, p.fat],
          ] as const
        ).map(([label, value, goal, color]) => (
          <View key={label} style={{ gap: 4 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Body>{label}</Body>
              <Body muted>
                {round(value)} / {round(goal)} g
              </Body>
            </Row>
            <ProgressBar value={value} goal={goal} color={color} />
          </View>
        ))}
      </Card>

      <Row>
        <Button title="Log food" onPress={() => router.push({ pathname: '/quick-add', params: { date } })} style={{ flex: 1 }} />
        <Button title="Snap a meal" variant="secondary" onPress={() => router.push('/photo')} style={{ flex: 1 }} />
      </Row>

      <SectionTitle>Planned for {DAY_NAMES[planDayIndex(date)]}</SectionTitle>
      <Card>
        {entries.length === 0 ? (
          <Body muted>Nothing planned for this day. Add meals in the Week plan tab.</Body>
        ) : (
          MEAL_SLOTS.flatMap((slot) =>
            entries
              .filter((e) => e.slot === slot)
              .map((e) => {
                const recipe = recipes.get(e.recipeId);
                if (!recipe) return null;
                const logged = log.some((l) => l.planEntryId === e.id);
                return (
                  <Row key={e.id} style={{ justifyContent: 'space-between' }}>
                    <Pressable style={{ flex: 1 }} onPress={() => router.push(`/recipe/${recipe.id}`)}>
                      <Body muted style={{ fontSize: 12 }}>{SLOT_LABEL[slot]}</Body>
                      <Body>{recipe.name}</Body>
                      <MacroLine
                        macros={scaleMacros(perServing(recipe), e.servings)}
                        servingsLabel={e.servings === 1 ? undefined : `${e.servings} servings`}
                      />
                    </Pressable>
                    <Button title={logged ? 'Logged' : 'Log'} small variant={logged ? 'ghost' : 'secondary'} disabled={logged} onPress={() => logPlanned(e.id)} />
                  </Row>
                );
              }),
          )
        )}
      </Card>

      <SectionTitle>Eaten</SectionTitle>
      <Card>
        {log.length === 0 ? (
          <Body muted>Nothing logged yet.</Body>
        ) : (
          log.map((e) => (
            <Pressable key={e.id} onLongPress={() => remove(e.id, e.name)}>
              <Row style={{ justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Body>
                    {e.name}
                    <Text style={{ color: p.muted }}>  · {SLOT_LABEL[e.slot]}</Text>
                  </Body>
                  <MacroLine macros={e} servingsLabel={e.servings === 1 ? undefined : `${e.servings} servings`} />
                </View>
                <Pressable onPress={() => remove(e.id, e.name)} hitSlop={10} accessibilityLabel={`Remove ${e.name}`}>
                  <Ionicons name="close-circle-outline" size={22} color={p.muted} />
                </Pressable>
              </Row>
            </Pressable>
          ))
        )}
      </Card>

      <SectionTitle>This week</SectionTitle>
      <Card>
        <Row style={{ alignItems: 'flex-end', justifyContent: 'space-between', height: 110 }}>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => {
            const d = addDays(monday, i);
            const kcal = week.get(d)?.kcal ?? 0;
            const h = goals.kcal > 0 ? Math.min(kcal / goals.kcal, 1.3) * 70 : 0;
            const selected = d === date;
            return (
              <Pressable key={d} onPress={() => setDate(d)} style={{ alignItems: 'center', flex: 1, gap: 4 }}>
                <Text style={{ fontSize: 10, color: p.muted }}>{kcal ? round(kcal) : ''}</Text>
                <View
                  style={{
                    width: 18,
                    height: Math.max(h, 2),
                    borderRadius: 5,
                    backgroundColor: !kcal ? p.track : kcal > goals.kcal * 1.05 ? p.danger : p.primary,
                    opacity: selected || !kcal ? 1 : 0.5,
                  }}
                />
                <Text style={{ fontSize: 12, color: selected ? p.primary : p.muted, fontWeight: selected ? '700' : '400' }}>
                  {fromISODate(d).toLocaleDateString(undefined, { weekday: 'narrow' })}
                </Text>
              </Pressable>
            );
          })}
        </Row>
        <Body muted style={{ fontSize: 13 }}>
          Average {round([...week.values()].reduce((s, m) => s + m.kcal, 0) / Math.max(week.size, 1))} kcal on {week.size} logged{' '}
          {week.size === 1 ? 'day' : 'days'}
        </Body>
      </Card>
    </Screen>
  );
}
