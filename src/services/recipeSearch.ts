import * as WebBrowser from 'expo-web-browser';
import { extractRecipeFromHtml } from '../lib/recipeImport';
import type { RecipeDraft } from '../lib/types';
import { getKey } from './keys';

export type SearchResult = {
  title: string;
  url: string;
  snippet: string;
  thumbnail: string | null;
  /** Google detected structured recipe data on the page, so import is likely to work. */
  hasRecipeData: boolean;
};

export interface RecipeSearchProvider {
  readonly name: string;
  isConfigured(): Promise<boolean>;
  search(query: string, start?: number): Promise<SearchResult[]>;
}

export class SearchError extends Error {}

/** Google Programmable Search (Custom Search JSON API). Needs an API key and a search engine ID (cx). */
export const googleCustomSearch: RecipeSearchProvider = {
  name: 'Google',
  async isConfigured() {
    return Boolean((await getKey('googleApiKey')) && (await getKey('googleCx')));
  },
  async search(query, start = 1) {
    const key = await getKey('googleApiKey');
    const cx = await getKey('googleCx');
    if (!key || !cx) throw new SearchError('Add a Google API key and search engine ID in Settings.');
    const q = /recipe/i.test(query) ? query : `${query} recipe`;
    const url =
      'https://www.googleapis.com/customsearch/v1?' +
      new URLSearchParams({ key, cx, q, start: String(start), num: '10' }).toString();
    const res = await fetch(url);
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      throw new SearchError(body?.error?.message ?? `Google search failed (HTTP ${res.status}).`);
    }
    return (body?.items ?? []).map(
      (item: any): SearchResult => ({
        title: item.title ?? item.link,
        url: item.link,
        snippet: item.snippet ?? '',
        thumbnail: item.pagemap?.cse_thumbnail?.[0]?.src ?? item.pagemap?.cse_image?.[0]?.src ?? null,
        hasRecipeData: Boolean(item.pagemap?.recipe),
      }),
    );
  },
};

/** Works without any key: opens a normal Google search in an in-app browser. */
export async function openGoogleInBrowser(query: string): Promise<void> {
  const q = /recipe/i.test(query) ? query : `${query} recipe`;
  await WebBrowser.openBrowserAsync(`https://www.google.com/search?q=${encodeURIComponent(q)}`);
}

/** Downloads a recipe page and reads its schema.org Recipe data. */
export async function importRecipeFromUrl(url: string): Promise<RecipeDraft> {
  let target = url.trim();
  if (!/^https?:\/\//i.test(target)) target = `https://${target}`;
  const res = await fetch(target, { headers: { Accept: 'text/html' } });
  if (!res.ok) throw new SearchError(`Couldn't open that page (HTTP ${res.status}).`);
  const html = await res.text();
  const draft = extractRecipeFromHtml(html, target);
  if (!draft) throw new SearchError("That page doesn't publish recipe data CleanCheat can read. You can still create the recipe by hand.");
  return draft;
}
