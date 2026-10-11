import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Alert, Image, ScrollView, View } from 'react-native';
import { usePalette } from '../../components/theme';
import { Body, Button, Card, Chip, Divider, MacroLine, Row, Screen, SectionTitle, Title } from '../../components/ui';
import { addLog, addPlanEntry, deleteRecipe, getActivePlan, getRecipe } from '../../db/repo';
import { planDayIndex, toISODate } from '../../lib/dates';
import { formatWeight, ingredientMacros, ingredientsTotal, perServing, round } from '../../lib/nutrition';
import { DAY_NAMES, MEAL_SLOTS, type MealSlot } from '../../lib/types';
import { useReload } from '../../lib/useReload';

export default function RecipeDetailScreen() {
  const db = useSQLiteContext();
  const p = usePalette();
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  const { data } = useReload(async () => ({ recipe: await getRecipe(db, id), plan: await getActivePlan(db) }), [id]);
  const [day, setDay] = useState(planDayIndex(toISODate(new Date())));
  const [slot, setSlot] = useState<MealSlot>('dinner');
  const [added, setAdded] = useState<string | null>(null);

  if (!data) return <Screen><Body muted>Loading…</Body></Screen>;
  const { recipe, plan } = data;
  if (!recipe) return <Screen><Body muted>This recipe no longer exists.</Body></Screen>;

  const serving = perServing(recipe);
  const usesIngredients = recipe.nutritionMode === 'ingredients';
  const total = ingredientsTotal(recipe.ingredients);

  const addToPlan = async () => {
    if (!plan) return;
    await addPlanEntry(db, { planId: plan.id, day, slot, recipeId: recipe.id, servings: 1 });
    setAdded(`Added to ${DAY_NAMES[day]} ${slot} in “${plan.name}”.`);
  };

  const logToday = async () => {
    await addLog(db, { date: toISODate(new Date()), slot, name: recipe.name, recipeId: recipe.id, servings: 1, ...serving });
    setAdded('Logged one serving for today.');
  };

  const confirmDelete = () =>
    Alert.alert('Delete recipe', `Delete “${recipe.name}”? It will also be removed from your plans.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteRecipe(db, recipe.id);
          router.back();
        },
      },
    ]);

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <Button title="Edit" small variant="ghost" onPress={() => router.push({ pathname: '/recipe/edit', params: { id: recipe.id } })} />
          ),
        }}
      />
      {recipe.imageUri ? <Image source={{ uri: recipe.imageUri }} style={{ width: '100%', height: 200, borderRadius: 14 }} /> : null}
      <Title>{recipe.name}</Title>
      <Card>
        <Body muted style={{ fontSize: 13 }}>
          Per serving · recipe makes {recipe.servings} {recipe.servings === 1 ? 'serving' : 'servings'}
        </Body>
        <MacroLine macros={serving} />
      </Card>

      <SectionTitle>Add to plan or log</SectionTitle>
      <Card>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {DAY_NAMES.map((name, i) => (
            <Chip key={name} label={name.slice(0, 3)} active={day === i} onPress={() => setDay(i)} />
          ))}
        </ScrollView>
        <Row style={{ flexWrap: 'wrap' }}>
          {MEAL_SLOTS.map((s) => (
            <Chip key={s} label={s} active={slot === s} onPress={() => setSlot(s)} />
          ))}
        </Row>
        <Row>
          <Button title="Add to week plan" small onPress={addToPlan} disabled={!plan} />
          <Button title="Log for today" small variant="secondary" onPress={logToday} />
        </Row>
        {added ? <Body style={{ color: p.primary, fontSize: 13 }}>{added}</Body> : null}
      </Card>

      <SectionTitle>Ingredients</SectionTitle>
      <Card>
        {recipe.ingredients.length === 0 ? <Body muted>No ingredients listed.</Body> : null}
        {recipe.ingredients.map((i, idx) => (
          <View key={i.id ?? idx}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Body style={{ flex: 1 }}>{i.name}</Body>
              <Body muted>{i.grams ? formatWeight(i.grams) : '—'}</Body>
            </Row>
            {usesIngredients ? <MacroLine macros={ingredientMacros(i)} /> : null}
          </View>
        ))}
        {usesIngredients && recipe.ingredients.length > 0 ? (
          <>
            <Divider />
            <Body muted style={{ fontSize: 13 }}>Whole recipe: {round(total.kcal)} kcal</Body>
          </>
        ) : null}
      </Card>

      {recipe.instructions ? (
        <>
          <SectionTitle>Method</SectionTitle>
          <Card>
            <Body>{recipe.instructions}</Body>
          </Card>
        </>
      ) : null}

      {recipe.sourceUrl ? (
        <Button title="Open original recipe" variant="ghost" onPress={() => WebBrowser.openBrowserAsync(recipe.sourceUrl!)} />
      ) : null}
      <Button title="Delete recipe" variant="ghost" onPress={confirmDelete} />
    </Screen>
  );
}
