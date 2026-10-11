import * as SecureStore from 'expo-secure-store';

/**
 * API keys live in the device keychain/keystore. A key can also be baked in at build time via
 * EXPO_PUBLIC_* env vars (see .env.example); a key saved in the app wins over the env var.
 */
export const KEY_NAMES = {
  googleApiKey: 'google_api_key',
  googleCx: 'google_cx',
  anthropicApiKey: 'anthropic_api_key',
} as const;

export type KeyName = keyof typeof KEY_NAMES;

const ENV_FALLBACK: Record<KeyName, string | undefined> = {
  googleApiKey: process.env.EXPO_PUBLIC_GOOGLE_API_KEY,
  googleCx: process.env.EXPO_PUBLIC_GOOGLE_CX,
  anthropicApiKey: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY,
};

export async function getKey(name: KeyName): Promise<string | null> {
  try {
    const stored = await SecureStore.getItemAsync(KEY_NAMES[name]);
    if (stored) return stored;
  } catch {
    // SecureStore is unavailable on web; fall through to the env var.
  }
  return ENV_FALLBACK[name] || null;
}

export async function setKey(name: KeyName, value: string): Promise<void> {
  const v = value.trim();
  if (v) await SecureStore.setItemAsync(KEY_NAMES[name], v);
  else await SecureStore.deleteItemAsync(KEY_NAMES[name]);
}

export async function getStoredKey(name: KeyName): Promise<string> {
  try {
    return (await SecureStore.getItemAsync(KEY_NAMES[name])) ?? '';
  } catch {
    return '';
  }
}
