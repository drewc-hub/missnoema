import type { GenerationParameters } from "../types/prompt.js";
/** App version — single source of truth. */
export declare const APP_VERSION = "1.5.9";
/** Stable synthetic connection id for the built-in local llama sidecar. */
export declare const LOCAL_SIDECAR_CONNECTION_ID = "__local_sidecar__";
/** Stable ID for the built-in Professor Mari assistant character. */
export declare const PROFESSOR_MARI_ID = "__professor_mari__";
/** Stable ID for the default OpenRouter free‑tier connection. */
export declare const DEFAULT_CONNECTION_ID = "__default_openrouter__";
/** Default generation parameters for new presets. */
export declare const DEFAULT_GENERATION_PARAMS: GenerationParameters;
/** Maximum file sizes for uploads. */
export declare const MAX_FILE_SIZES: {
    readonly AVATAR: number;
    readonly BACKGROUND: number;
    readonly SPRITE: number;
    readonly CHARACTER_JSON: number;
    readonly LOREBOOK_JSON: number;
    readonly PRESET_JSON: number;
    readonly CHAT_JSONL: number;
};
/** Limits for various entities. */
export declare const LIMITS: {
    /** Max messages to include in context for agents */
    readonly AGENT_CONTEXT_MESSAGES: 20;
    /** Max lorebook entries that can be injected */
    readonly MAX_LOREBOOK_ENTRIES: 100;
    /** Default global lorebook token budget per generation. 0 means unlimited when explicitly configured per chat. */
    readonly DEFAULT_LOREBOOK_TOKEN_BUDGET: 8192;
    /** Default summary trigger: every N messages */
    readonly SUMMARY_INTERVAL: 50;
    /** Default vectorization: top-K results */
    readonly VECTOR_TOP_K: 10;
    /** Echo Chamber: messages per generation */
    readonly ECHO_CHAMBER_MESSAGES: 5;
};
//# sourceMappingURL=defaults.d.ts.map