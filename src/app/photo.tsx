import { router } from 'expo-router';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Image } from 'react-native';
import { usePalette } from '../components/theme';
import { Body, Button, Card, MacroLine, Row, Screen, SectionTitle, Title } from '../components/ui';
import { setPendingDraft } from '../lib/draftStore';
import { formatWeight, perServing } from '../lib/nutrition';
import type { RecipeDraft } from '../lib/types';
import { claudeVision, type FoodIdentification } from '../services/foodVision';

/** Shrinks the photo before upload: faster, cheaper, and plenty of detail to recognise a dish. */
async function prepare(uri: string): Promise<string> {
  const ref = await ImageManipulator.manipulate(uri).resize({ width: 1024 }).renderAsync();
  const out = await ref.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  if (!out.base64) throw new Error('Could not read the photo.');
  return out.base64;
}

function toDraft(id: FoodIdentification, imageUri: string): RecipeDraft {
  return {
    name: id.dish,
    servings: id.servings > 0 ? id.servings : 1,
    instructions: id.instructions.map((s, i) => `${i + 1}. ${s}`).join('\n'),
    sourceUrl: null,
    imageUri,
    nutritionMode: 'ingredients',
    manual: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    ingredients: id.ingredients,
  };
}

export default function PhotoScreen() {
  const p = usePalette();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<FoodIdentification | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    claudeVision.isConfigured().then(setConfigured);
  }, []);

  const pick = async (source: 'camera' | 'library') => {
    setError(null);
    const perm =
      source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError(source === 'camera' ? 'Camera access is needed to take a photo.' : 'Photo access is needed to pick a picture.');
      return;
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8 };
    const res = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (res.canceled || !res.assets?.[0]) return;
    const photo = res.assets[0].uri;
    setUri(photo);
    setResult(null);
    setBusy(true);
    try {
      setResult(await claudeVision.identify(await prepare(photo)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const draft = result && uri ? toDraft(result, uri) : null;

  return (
    <Screen>
      {configured === false ? (
        <Card>
          <Body>Photo search uses Claude to recognise the dish. Add your Anthropic API key in Settings to turn it on.</Body>
          <Button title="Open Settings" small variant="secondary" onPress={() => router.navigate('/settings')} />
        </Card>
      ) : null}

      <Row>
        <Button title="Take a photo" onPress={() => pick('camera')} disabled={!configured || busy} style={{ flex: 1 }} />
        <Button title="Choose photo" variant="secondary" onPress={() => pick('library')} disabled={!configured || busy} style={{ flex: 1 }} />
      </Row>

      {uri ? <Image source={{ uri }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 14 }} /> : null}
      {busy ? <Body muted>Looking at your food…</Body> : null}
      {error ? <Body style={{ color: p.danger }}>{error}</Body> : null}

      {result && !result.isFood ? <Body>That doesn't look like food. Try another photo.</Body> : null}

      {result?.isFood && draft ? (
        <>
          <Title>{result.dish}</Title>
          <Body muted>
            {result.description} ({result.confidence} confidence)
          </Body>
          <Card>
            <Body muted style={{ fontSize: 13 }}>Estimated per serving</Body>
            <MacroLine macros={perServing(draft)} />
          </Card>
          <Row style={{ flexWrap: 'wrap' }}>
            <Button
              title="Save as recipe"
              onPress={() => {
                setPendingDraft(draft);
                router.push({ pathname: '/recipe/edit', params: { draft: '1' } });
              }}
            />
            <Button
              title="Log it now"
              variant="secondary"
              onPress={() => {
                const m = perServing(draft);
                router.push({
                  pathname: '/quick-add',
                  params: { name: result.dish, kcal: Math.round(m.kcal), protein: Math.round(m.protein), carbs: Math.round(m.carbs), fat: Math.round(m.fat) },
                });
              }}
            />
            <Button title="Find recipes on Google" variant="ghost" onPress={() => router.push({ pathname: '/search', params: { q: result.searchQuery || result.dish } })} />
          </Row>
          <SectionTitle>Estimated ingredients</SectionTitle>
          <Card>
            {result.ingredients.map((i, idx) => (
              <Row key={idx} style={{ justifyContent: 'space-between' }}>
                <Body style={{ flex: 1 }}>{i.name}</Body>
                <Body muted>{formatWeight(i.grams)}</Body>
              </Row>
            ))}
          </Card>
          <Body muted style={{ fontSize: 12 }}>Estimates from a photo can be off. Check weights before saving.</Body>
        </>
      ) : null}
    </Screen>
  );
}
