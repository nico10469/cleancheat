import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { usePalette } from '../components/theme';
import { migrate } from '../db/migrate';

export default function RootLayout() {
  const p = usePalette();
  return (
    <SQLiteProvider databaseName="cleancheat.db" onInit={migrate}>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: p.card },
          headerTintColor: p.primary,
          headerTitleStyle: { color: p.text },
          contentStyle: { backgroundColor: p.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="recipe/[id]" options={{ title: 'Recipe' }} />
        <Stack.Screen name="recipe/edit" options={{ title: 'Edit recipe', presentation: 'modal' }} />
        <Stack.Screen name="search" options={{ title: 'Find recipes' }} />
        <Stack.Screen name="photo" options={{ title: 'Photo to recipe' }} />
        <Stack.Screen name="pick-recipe" options={{ title: 'Choose a recipe', presentation: 'modal' }} />
        <Stack.Screen name="quick-add" options={{ title: 'Log food', presentation: 'modal' }} />
      </Stack>
    </SQLiteProvider>
  );
}
