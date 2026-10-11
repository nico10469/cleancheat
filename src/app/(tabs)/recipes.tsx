import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { Body, Button, Card, Field, MacroLine, Row, Screen } from '../../components/ui';
import { listRecipes } from '../../db/repo';
import { perServing } from '../../lib/nutrition';
import { useReload } from '../../lib/useReload';

export default function RecipesScreen() {
  const db = useSQLiteContext();
  const [query, setQuery] = useState('');
  const { data: recipes } = useReload(() => listRecipes(db), []);
  const q = query.trim().toLowerCase();
  const filtered = (recipes ?? []).filter(
    (r) => !q || r.name.toLowerCase().includes(q) || r.ingredients.some((i) => i.name.toLowerCase().includes(q)),
  );

  return (
    <Screen>
      <Row>
        <Button title="New recipe" onPress={() => router.push('/recipe/edit')} style={{ flex: 1 }} />
        <Button title="Search Google" variant="secondary" onPress={() => router.push({ pathname: '/search', params: { q: query } })} style={{ flex: 1 }} />
      </Row>
      <Button title="Identify a dish from a photo" variant="secondary" onPress={() => router.push('/photo')} />
      <Field placeholder="Search your recipes or ingredients" value={query} onChangeText={setQuery} autoCorrect={false} />
      {recipes && filtered.length === 0 ? (
        <Body muted>No saved recipes match “{query}”. Try Search Google to find one online.</Body>
      ) : null}
      {filtered.map((r) => (
        <Pressable key={r.id} onPress={() => router.push(`/recipe/${r.id}`)}>
          <Card>
            <Row>
              {r.imageUri ? <Image source={{ uri: r.imageUri }} style={{ width: 48, height: 48, borderRadius: 8 }} /> : null}
              <View style={{ flex: 1 }}>
                <Body style={{ fontWeight: '600' }}>{r.name}</Body>
                <MacroLine macros={perServing(r)} servingsLabel="per serving" />
              </View>
            </Row>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}
