import type { RecipeDraft } from './types';

/**
 * Hands a prefilled recipe (from a web import or a photo) to the recipe editor
 * without squeezing it through route params.
 */
let pending: RecipeDraft | null = null;

export function setPendingDraft(draft: RecipeDraft): void {
  pending = draft;
}

export function takePendingDraft(): RecipeDraft | null {
  const d = pending;
  pending = null;
  return d;
}
