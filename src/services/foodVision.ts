import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { getKey } from './keys';

const FoodIdentificationSchema = z.object({
  isFood: z.boolean(),
  dish: z.string(),
  confidence: z.enum(['high', 'medium', 'low']),
  description: z.string(),
  servings: z.number(),
  ingredients: z.array(
    z.object({
      name: z.string(),
      grams: z.number(),
      kcalPer100: z.number(),
      proteinPer100: z.number(),
      carbsPer100: z.number(),
      fatPer100: z.number(),
    }),
  ),
  instructions: z.array(z.string()),
  searchQuery: z.string(),
});

export type FoodIdentification = z.infer<typeof FoodIdentificationSchema>;

export interface FoodVisionProvider {
  readonly name: string;
  isConfigured(): Promise<boolean>;
  identify(jpegBase64: string): Promise<FoodIdentification>;
}

export class VisionError extends Error {}

const PROMPT = `Identify the dish in this photo so the user can save it as a recipe in a diet tracker.

Estimate the ingredients and the weight of each for the whole recipe (servings = how many portions the photographed amount is, usually 1), with nutrition per 100 g of each ingredient using typical database values for the raw/dry ingredient. Keep instructions short. searchQuery should be what you'd type into Google to find a recipe for this dish.

If the photo doesn't show food, set isFood to false and leave the other fields empty.`;

export const claudeVision: FoodVisionProvider = {
  name: 'Claude',
  async isConfigured() {
    return Boolean(await getKey('anthropicApiKey'));
  },
  async identify(jpegBase64) {
    const apiKey = await getKey('anthropicApiKey');
    if (!apiKey) throw new VisionError('Add an Anthropic API key in Settings to use photo search.');
    // The key belongs to the person using the app and only ever lives on their device.
    const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
    try {
      const response = await client.beta.messages.parse({
        model: 'claude-opus-5-5',
        max_tokens: 16000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'medium', format: betaZodOutputFormat(FoodIdentificationSchema) },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: jpegBase64 } },
              { type: 'text', text: PROMPT },
            ],
          },
        ],
      });
      if (response.stop_reason === 'refusal') throw new VisionError("The photo couldn't be analysed. Try another picture.");
      if (!response.parsed_output) throw new VisionError('The answer was incomplete. Please try again.');
      return response.parsed_output;
    } catch (error) {
      if (error instanceof VisionError) throw error;
      if (error instanceof Anthropic.AuthenticationError) throw new VisionError('The Anthropic API key was rejected. Check it in Settings.');
      if (error instanceof Anthropic.RateLimitError) throw new VisionError('Too many requests right now. Try again in a minute.');
      if (error instanceof Anthropic.APIError) throw new VisionError(`Photo search failed (${error.status ?? 'network error'}).`);
      throw new VisionError('Photo search failed. Check your connection and try again.');
    }
  },
};
