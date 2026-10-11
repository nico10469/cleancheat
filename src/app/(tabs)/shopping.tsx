import Ionicons from '@expo/vector-icons/Ionicons';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, Pressable, Share, Text, View } from 'react-native';
import { usePalette } from '../../components/theme';
import { Body, Button, Card, Field, Row, Screen, SectionTitle } from '../../components/ui';
import {
  addShoppingExtra,
  deleteShoppingExtra,
  getActivePlan,
  getPlanEntries,
  getShoppingChecks,
  getShoppingExtras,
  listRecipes,
  resetShopping,
  setShoppingCheck,
  setShoppingExtraChecked,
} from '../../db/repo';
import { buildShoppingList, formatWeight } from '../../lib/nutrition';
import { useReload } from '../../lib/useReload';

export default function ShoppingScreen() {
  const db = useSQLiteContext();
  const p = usePalette();
  const [extra, setExtra] = useState('');

  const { data, reload } = useReload(async () => {
    const plan = await getActivePlan(db);
    if (!plan) return null;
    const [entries, recipes, checks, extras] = await Promise.all([
      getPlanEntries(db, plan.id),
      listRecipes(db),
      getShoppingChecks(db, plan.id),
      getShoppingExtras(db, plan.id),
    ]);
    const items = buildShoppingList(entries, new Map(recipes.map((r) => [r.id, r])));
    return { plan, items, checks, extras };
  }, []);

  if (data === undefined) return <Screen><Body muted>Loading…</Body></Screen>;
  if (data === null) return <Screen><Body muted>Create a weekly plan first.</Body></Screen>;
  const { plan, items, checks, extras } = data;
  const sorted = [...items].sort((a, b) => Number(checks.has(a.key)) - Number(checks.has(b.key)));
  const remaining = items.filter((i) => !checks.has(i.key)).length + extras.filter((e) => !e.checked).length;

  const toggle = (key: string) => setShoppingCheck(db, plan.id, key, !checks.has(key)).then(reload);

  const share = () => {
    const lines = [
      ...items.filter((i) => !checks.has(i.key)).map((i) => `• ${i.name}${i.grams ? ` – ${formatWeight(i.grams)}` : ''}`),
      ...extras.filter((e) => !e.checked).map((e) => `• ${e.name}`),
    ];
    Share.share({ message: `Shopping list (${plan.name})\n${lines.join('\n')}` });
  };

  const reset = () =>
    Alert.alert('Start a new week?', 'This unticks every item and clears the extra items you added.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => resetShopping(db, plan.id).then(reload) },
    ]);

  return (
    <Screen>
      <Card>
        <Text style={{ fontSize: 18, fontWeight: '700', color: p.text }}>{plan.name}</Text>
        <Body muted style={{ fontSize: 13 }}>
          Built from every meal in your active plan for the week. {remaining} {remaining === 1 ? 'item' : 'items'} left to buy.
        </Body>
        <Row>
          <Button title="Share list" small variant="secondary" onPress={share} />
          <Button title="New week" small variant="ghost" onPress={reset} />
        </Row>
      </Card>

      <SectionTitle>From your plan</SectionTitle>
      <Card>
        {sorted.length === 0 ? <Body muted>Add meals to your plan to build the list.</Body> : null}
        {sorted.map((item) => {
          const done = checks.has(item.key);
          return (
            <Pressable key={item.key} onPress={() => toggle(item.key)} accessibilityRole="checkbox" accessibilityState={{ checked: done }}>
              <Row style={{ paddingVertical: 4 }}>
                <Ionicons name={done ? 'checkbox' : 'square-outline'} size={22} color={done ? p.muted : p.primary} />
                <View style={{ flex: 1 }}>
                  <Body style={done ? { textDecorationLine: 'line-through', color: p.muted } : undefined}>{item.name}</Body>
                  <Text style={{ fontSize: 12, color: p.muted }} numberOfLines={1}>
                    {item.usedIn.join(', ')}
                  </Text>
                </View>
                <Body muted>{item.grams ? formatWeight(item.grams) : 'as needed'}</Body>
              </Row>
            </Pressable>
          );
        })}
      </Card>

      <SectionTitle>Extras</SectionTitle>
      <Card>
        {extras.map((e) => (
          <Row key={e.id} style={{ paddingVertical: 4 }}>
            <Pressable onPress={() => setShoppingExtraChecked(db, e.id, !e.checked).then(reload)} style={{ flexDirection: 'row', gap: 8, flex: 1, alignItems: 'center' }}>
              <Ionicons name={e.checked ? 'checkbox' : 'square-outline'} size={22} color={e.checked ? p.muted : p.primary} />
              <Body style={e.checked ? { textDecorationLine: 'line-through', color: p.muted } : undefined}>{e.name}</Body>
            </Pressable>
            <Pressable onPress={() => deleteShoppingExtra(db, e.id).then(reload)} hitSlop={10} accessibilityLabel={`Remove ${e.name}`}>
              <Ionicons name="close" size={20} color={p.muted} />
            </Pressable>
          </Row>
        ))}
        <Row>
          <View style={{ flex: 1 }}>
            <Field
              placeholder="Add something else (e.g. coffee)"
              value={extra}
              onChangeText={setExtra}
              returnKeyType="done"
              onSubmitEditing={() => {
                if (!extra.trim()) return;
                addShoppingExtra(db, plan.id, extra).then(() => {
                  setExtra('');
                  reload();
                });
              }}
            />
          </View>
          <Button
            title="Add"
            small
            disabled={!extra.trim()}
            onPress={() =>
              addShoppingExtra(db, plan.id, extra).then(() => {
                setExtra('');
                reload();
              })
            }
          />
        </Row>
      </Card>
    </Screen>
  );
}
