import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { RecipePicker } from '../components/RecipePicker';
import { Body, Button, Row, Screen } from '../components/ui';
import { addPlanEntry } from '../db/repo';
import { DAY_NAMES, MEAL_SLOTS, type MealSlot } from '../lib/types';

export default function PickRecipeScreen() {
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{ planId: string; day: string; slot: string }>();
  const planId = Number(params.planId);
  const day = Number(params.day);
  const slot = (MEAL_SLOTS as readonly string[]).includes(params.slot) ? (params.slot as MealSlot) : 'lunch';

  return (
    <Screen>
      <Body muted>
        Adding to {DAY_NAMES[day]} · {slot}
      </Body>
      <Row>
        <Button title="New recipe" small variant="secondary" onPress={() => router.push('/recipe/edit')} />
        <Button title="Search Google" small variant="secondary" onPress={() => router.push('/search')} />
      </Row>
      <RecipePicker
        onPick={async (r) => {
          await addPlanEntry(db, { planId, day, slot, recipeId: r.id, servings: 1 });
          router.back();
        }}
      />
    </Screen>
  );
}
