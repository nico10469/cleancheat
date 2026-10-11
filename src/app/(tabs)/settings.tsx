import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { usePalette } from '../../components/theme';
import { Body, Button, Card, Field, NumberField, Row, Screen, SectionTitle } from '../../components/ui';
import { getGoals, saveGoals } from '../../db/repo';
import { kcalFromMacros, round } from '../../lib/nutrition';
import type { Goals } from '../../lib/types';
import { getStoredKey, setKey } from '../../services/keys';

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const p = usePalette();
  const [goals, setGoals] = useState<Goals | null>(null);
  const [keys, setKeys] = useState({ anthropicApiKey: '', googleApiKey: '', googleCx: '' });
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setGoals(await getGoals(db));
      setKeys({
        anthropicApiKey: await getStoredKey('anthropicApiKey'),
        googleApiKey: await getStoredKey('googleApiKey'),
        googleCx: await getStoredKey('googleCx'),
      });
    })();
  }, [db]);

  if (!goals) return <Screen><Body muted>Loading…</Body></Screen>;
  const macroKcal = kcalFromMacros(goals);

  return (
    <Screen>
      <SectionTitle>Daily goals</SectionTitle>
      <Card>
        <Row>
          <NumberField label="Calories (kcal)" value={goals.kcal} onChange={(kcal) => setGoals({ ...goals, kcal })} />
          <NumberField label="Protein (g)" value={goals.protein} onChange={(protein) => setGoals({ ...goals, protein })} />
        </Row>
        <Row>
          <NumberField label="Carbs (g)" value={goals.carbs} onChange={(carbs) => setGoals({ ...goals, carbs })} />
          <NumberField label="Fat (g)" value={goals.fat} onChange={(fat) => setGoals({ ...goals, fat })} />
        </Row>
        <Body muted style={{ fontSize: 13, color: Math.abs(macroKcal - goals.kcal) > 150 ? p.danger : p.muted }}>
          Your macros add up to {round(macroKcal)} kcal.
        </Body>
        <Button
          title="Save goals"
          onPress={() => saveGoals(db, goals).then(() => setSaved('Goals saved.'))}
        />
      </Card>

      <SectionTitle>Photo to recipe</SectionTitle>
      <Card>
        <Body muted style={{ fontSize: 13 }}>
          Uses Claude to recognise dishes. Create a key at console.anthropic.com. It's stored only in this device's secure storage.
        </Body>
        <Field
          label="Anthropic API key"
          value={keys.anthropicApiKey}
          onChangeText={(anthropicApiKey) => setKeys({ ...keys, anthropicApiKey })}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="sk-ant-…"
        />
      </Card>

      <SectionTitle>Google recipe search</SectionTitle>
      <Card>
        <Body muted style={{ fontSize: 13 }}>
          Optional. Without these, “Search Google” opens your browser instead. With a Programmable Search Engine ID and a Custom Search
          API key from Google Cloud, results show inside the app.
        </Body>
        <Field
          label="Google API key"
          value={keys.googleApiKey}
          onChangeText={(googleApiKey) => setKeys({ ...keys, googleApiKey })}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Field
          label="Search engine ID (cx)"
          value={keys.googleCx}
          onChangeText={(googleCx) => setKeys({ ...keys, googleCx })}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </Card>
      <Button
        title="Save keys"
        onPress={async () => {
          await setKey('anthropicApiKey', keys.anthropicApiKey);
          await setKey('googleApiKey', keys.googleApiKey);
          await setKey('googleCx', keys.googleCx);
          setSaved('Keys saved.');
        }}
      />
      {saved ? <Body style={{ color: p.primary }}>{saved}</Body> : null}
      <Body muted style={{ fontSize: 12 }}>All your recipes, plans and logs are stored on this device.</Body>
    </Screen>
  );
}
