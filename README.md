# CleanCheat

A weekly diet tracker for Android and iOS, built with Expo (React Native + TypeScript).

## Features

- **Calories & macros tracker** (Today tab): daily calories, protein, carbs and fat against your goals, one-tap logging of planned meals, free-form entries, and a week-at-a-glance chart.
- **Weekly diet plan** (Week plan tab): breakfast, lunch, dinner and snacks for each day. Keep several plans (e.g. "Bulk", "Cut"), duplicate them, and pick which one is active. Change servings per meal.
- **Weekly shopping list** (Shopping tab): generated from the active plan. Ingredient weights are scaled by planned servings and merged across recipes ("Eggs" + "egg"). Tick items off, add extras, share the list, start a new week.
- **Recipe database** (Recipes tab): create recipes with ingredient weights and nutrition per 100 g (macros are calculated for you), or enter per-serving calories and macros directly. Search Google and import any recipe page that publishes schema.org recipe data (most big recipe sites do), or paste a link.
- **Photo to recipe**: take or pick a photo of a dish; Claude identifies it and estimates ingredients, weights and macros. Save it as a recipe, log it straight away, or search Google for recipes of that dish.

Ten sample recipes and a "Balanced week" plan are created on first launch.

All data stays on the device (SQLite). There are no accounts and no backend.

## Run it

```bash
npm install
npx expo start
```

Then press `a` for an Android emulator, `i` for the iOS simulator, or scan the QR code with a development build on your phone. The app uses native modules (camera, SQLite, secure storage) that are in Expo Go, but if your Expo Go version doesn't match SDK 57, make a development build:

```bash
npx expo run:android   # or: npx expo run:ios
# or in the cloud: npx eas-cli@latest build --profile development
```

## API keys (optional)

The tracker, plans, shopping list and recipe editor work without any keys. Two features use external APIs; enter the keys in the app's **Settings** tab (stored in the device keychain/keystore), or put them in `.env.local` (see `.env.example`).

| Feature | What you need |
| --- | --- |
| Photo to recipe | An Anthropic API key from console.anthropic.com. Uses the `claude-opus-5-5` model. |
| Google results inside the app | A Google Custom Search JSON API key and a Programmable Search Engine ID (`cx`). Without them, "Search Google" opens Google in the browser, and you import a recipe by pasting its link. |

Both providers sit behind small interfaces (`src/services/foodVision.ts`, `src/services/recipeSearch.ts`) so they can be swapped.

## Project layout

```
src/app/            screens (Expo Router): (tabs)/index, plan, shopping, recipes, settings;
                    recipe/[id], recipe/edit, search, photo, quick-add, pick-recipe
src/db/             SQLite schema, migrations, seed data, queries
src/lib/            nutrition maths, shopping list builder, recipe page parser, dates
src/services/       Google search, URL import, Claude vision, key storage
tests/              unit tests (node:test), including the SQL against a real SQLite
```

## Checks

```bash
npm run typecheck
npm test
```
