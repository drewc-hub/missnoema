import type { APIProvider } from "../types/connection.js";
export interface KnownModel {
    id: string;
    name: string;
    context: number;
    /** Output / max completion tokens (0 = unknown / model default) */
    maxOutput: number;
}
export declare const OPENAI_MODELS: KnownModel[];
export declare const ANTHROPIC_MODELS: KnownModel[];
export declare const CLAUDE_SUBSCRIPTION_MODELS: KnownModel[];
export declare const OPENAI_CHATGPT_MODELS: KnownModel[];
export declare const GOOGLE_MODELS: KnownModel[];
export declare const MISTRAL_MODELS: KnownModel[];
export declare const COHERE_MODELS: KnownModel[];
export declare const OPENROUTER_MODELS: KnownModel[];
export declare const XAI_MODELS: KnownModel[];
export declare const GROQ_MODELS: KnownModel[];
export declare const DEEPSEEK_MODELS: KnownModel[];
export declare const PERPLEXITY_MODELS: KnownModel[];
export declare const MOONSHOT_MODELS: KnownModel[];
export declare const ZAI_MODELS: KnownModel[];
export declare const AI21_MODELS: KnownModel[];
export interface ImageGenSource {
    id: string;
    name: string;
    description: string;
    defaultBaseUrl: string;
    requiresApiKey: boolean;
}
export declare const IMAGE_GENERATION_SOURCES: ImageGenSource[];
/**
 * Infer which image generation API source to use from the model name and base URL.
 * The caller should fall back to "openai" (OpenAI-compatible) if no match is found.
 */
export declare function inferImageSource(model: string, baseUrl: string): string;
export declare const MODEL_LISTS: Record<APIProvider, KnownModel[]>;
/**
 * Look up a known model by ID across all providers.
 */
export declare function findKnownModel(provider: APIProvider, modelId: string): KnownModel | undefined;
//# sourceMappingURL=model-lists.d.ts.map