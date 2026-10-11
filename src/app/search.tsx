import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { usePalette } from '../components/theme';
import { Body, Button, Card, Field, Row, Screen, SectionTitle } from '../components/ui';
import { setPendingDraft } from '../lib/draftStore';
import { googleCustomSearch, importRecipeFromUrl, openGoogleInBrowser, type SearchResult } from '../services/recipeSearch';

export default function SearchScreen() {
  const p = usePalette();
  const params = useLocalSearchParams<{ q?: string }>();
  const [query, setQuery] = useState(params.q ?? '');
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [link, setLink] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    googleCustomSearch.isConfigured().then((ok) => {
      setConfigured(ok);
      if (ok && params.q) runSearch(params.q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runSearch = async (q = query) => {
    if (!q.trim()) return;
    setError(null);
    if (!configured && !(await googleCustomSearch.isConfigured())) {
      await openGoogleInBrowser(q);
      return;
    }
    setSearching(true);
    try {
      setResults(await googleCustomSearch.search(q));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSearching(false);
    }
  };

  const importUrl = async (url: string) => {
    setError(null);
    setImporting(url);
    try {
      setPendingDraft(await importRecipeFromUrl(url));
      router.push({ pathname: '/recipe/edit', params: { draft: '1' } });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setImporting(null);
    }
  };

  return (
    <Screen>
      <Field
        placeholder="e.g. high protein lasagna"
        value={query}
        onChangeText={setQuery}
        returnKeyType="search"
        onSubmitEditing={() => runSearch()}
        autoFocus={!params.q}
      />
      <Button title={configured === false ? 'Search on Google' : 'Search'} onPress={() => runSearch()} loading={searching} disabled={!query.trim()} />
      {configured === false ? (
        <Body muted style={{ fontSize: 13 }}>
          Opens Google in your browser. Copy the link of a recipe you like and paste it below to import it. Add a Google API key in
          Settings to see results right here.
        </Body>
      ) : null}

      <SectionTitle>Import from a link</SectionTitle>
      <Card>
        <Field placeholder="https://…" value={link} onChangeText={setLink} autoCapitalize="none" autoCorrect={false} keyboardType="url" />
        <Button title="Import recipe" variant="secondary" onPress={() => importUrl(link)} loading={importing === link} disabled={!link.trim()} />
      </Card>

      {error ? <Body style={{ color: p.danger }}>{error}</Body> : null}

      {results ? <SectionTitle>Results</SectionTitle> : null}
      {results?.length === 0 ? <Body muted>No results. Try different words.</Body> : null}
      {results?.map((r) => (
        <Card key={r.url}>
          <Row style={{ alignItems: 'flex-start' }}>
            {r.thumbnail ? <Image source={{ uri: r.thumbnail }} style={{ width: 64, height: 64, borderRadius: 8 }} /> : null}
            <View style={{ flex: 1, gap: 2 }}>
              <Body style={{ fontWeight: '600' }}>{r.title}</Body>
              <Body muted style={{ fontSize: 12 }} numberOfLines={1}>
                {r.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
              </Body>
              <Body muted style={{ fontSize: 13 }} numberOfLines={2}>
                {r.snippet}
              </Body>
            </View>
          </Row>
          <Row>
            <Button title={r.hasRecipeData ? 'Import' : 'Try import'} small onPress={() => importUrl(r.url)} loading={importing === r.url} />
            <Button title="Open" small variant="ghost" onPress={() => WebBrowser.openBrowserAsync(r.url)} />
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
