import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { usePalette } from '../../components/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const icon =
  (name: IconName) =>
  ({ color, size }: { color: ColorValue; size: number }) => <Ionicons name={name} color={color as string} size={size} />;

export default function TabsLayout() {
  const p = usePalette();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: p.primary,
        tabBarInactiveTintColor: p.muted,
        tabBarStyle: { backgroundColor: p.card, borderTopColor: p.border },
        headerStyle: { backgroundColor: p.card },
        headerTitleStyle: { color: p.text },
        sceneStyle: { backgroundColor: p.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: icon('pie-chart-outline') }} />
      <Tabs.Screen name="plan" options={{ title: 'Week plan', tabBarIcon: icon('calendar-outline') }} />
      <Tabs.Screen name="shopping" options={{ title: 'Shopping', tabBarIcon: icon('cart-outline') }} />
      <Tabs.Screen name="recipes" options={{ title: 'Recipes', tabBarIcon: icon('book-outline') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('settings-outline') }} />
    </Tabs>
  );
}
