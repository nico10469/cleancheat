import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { listRecipes } from '../db/repo';
import { perServing } from '../lib/nutrition';
import type { Recipe } from '../lib/types';
import { useReload } from '../lib/useReload';
import { usePalette } from './theme';
import { Body, Card, Field, MacroLine } from './ui';

/** Searchable list of saved recipes. */
export function RecipePicker({ onPick, selectedId }: { onPick: (r: Recipe) => void; selectedId?: number }) {
  const db = useSQLiteContext();
  const p = usePalette();
  const [query, setQuery] = useState('');
  const { data: recipes } = useReload(() => listRecipes(db), []);
  const q = query.trim().toLowerCase();
  const filtered = (recipes ?? []).filter(
    (r) => !q || r.name.toLowerCase().includes(q) || r.ingredients.some((i) => i.name.toLowerCase().includes(q)),
  );
  return (
    <View style={{ gap: 8 }}>
      <Field placeholder="Search your recipes" value={query} onChangeText={setQuery} autoCorrect={false} />
      {recipes && filtered.length === 0 ? <Body muted>No recipes match.</Body> : null}
      {filtered.map((r) => (
        <Pressable key={r.id} onPress={() => onPick(r)}>
          <Card style={selectedId === r.id ? { borderWidth: 2, borderColor: p.primary } : undefined}>
            <Body style={{ fontWeight: '600' }}>{r.name}</Body>
            <MacroLine macros={perServing(r)} servingsLabel="per serving" />
          </Card>
        </Pressable>
      ))}
    </View>
  );
}
