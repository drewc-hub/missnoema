import type { Automatic1111Defaults, ComfyUiDefaults, ImageDefaultsService, ImageGenerationDefaultsProfile, NovelAiDefaults } from "../types/image-generation-defaults.js";
export declare const IMAGE_DEFAULTS_STORAGE_KEY = "imageGeneration";
export declare const IMAGE_GENERATION_DEFAULTS_VERSION: 1;
export declare const IMAGE_DEFAULTS_SERVICES: ImageDefaultsService[];
export declare const DEFAULT_AUTOMATIC1111_DEFAULTS: Automatic1111Defaults;
export declare const DEFAULT_COMFYUI_DEFAULTS: ComfyUiDefaults;
export declare const DEFAULT_NOVELAI_DEFAULTS: NovelAiDefaults;
export declare const SD_WEBUI_SAMPLER_OPTIONS: readonly [{
    readonly value: "";
    readonly label: "Automatic / backend default";
}, {
    readonly value: "Euler a";
    readonly label: "Euler a";
}, {
    readonly value: "Euler";
    readonly label: "Euler";
}, {
    readonly value: "DPM++ 2M";
    readonly label: "DPM++ 2M";
}, {
    readonly value: "DPM++ 2M Karras";
    readonly label: "DPM++ 2M Karras";
}, {
    readonly value: "DPM++ SDE";
    readonly label: "DPM++ SDE";
}, {
    readonly value: "DPM++ SDE Karras";
    readonly label: "DPM++ SDE Karras";
}, {
    readonly value: "DPM++ 2M SDE";
    readonly label: "DPM++ 2M SDE";
}, {
    readonly value: "UniPC";
    readonly label: "UniPC";
}, {
    readonly value: "DDIM";
    readonly label: "DDIM";
}, {
    readonly value: "LMS";
    readonly label: "LMS";
}, {
    readonly value: "Heun";
    readonly label: "Heun";
}, {
    readonly value: "DPM2";
    readonly label: "DPM2";
}, {
    readonly value: "DPM2 a";
    readonly label: "DPM2 a";
}];
export declare const SD_WEBUI_SCHEDULER_OPTIONS: readonly [{
    readonly value: "";
    readonly label: "Automatic / backend default";
}, {
    readonly value: "Automatic";
    readonly label: "Automatic";
}, {
    readonly value: "Uniform";
    readonly label: "Uniform";
}, {
    readonly value: "Karras";
    readonly label: "Karras";
}, {
    readonly value: "Exponential";
    readonly label: "Exponential";
}, {
    readonly value: "Polyexponential";
    readonly label: "Polyexponential";
}, {
    readonly value: "SGM Uniform";
    readonly label: "SGM Uniform";
}, {
    readonly value: "KL Optimal";
    readonly label: "KL Optimal";
}];
export declare const COMFYUI_SAMPLER_OPTIONS: readonly [{
    readonly value: "";
    readonly label: "Automatic / backend default";
}, {
    readonly value: "euler_ancestral";
    readonly label: "Euler ancestral";
}, {
    readonly value: "euler";
    readonly label: "Euler";
}, {
    readonly value: "dpmpp_2m";
    readonly label: "DPM++ 2M";
}, {
    readonly value: "dpmpp_sde";
    readonly label: "DPM++ SDE";
}, {
    readonly value: "dpmpp_2m_sde";
    readonly label: "DPM++ 2M SDE";
}, {
    readonly value: "ddim";
    readonly label: "DDIM";
}, {
    readonly value: "uni_pc";
    readonly label: "UniPC";
}, {
    readonly value: "lms";
    readonly label: "LMS";
}, {
    readonly value: "heun";
    readonly label: "Heun";
}];
export declare const COMFYUI_SCHEDULER_OPTIONS: readonly [{
    readonly value: "";
    readonly label: "Automatic / backend default";
}, {
    readonly value: "normal";
    readonly label: "Normal";
}, {
    readonly value: "karras";
    readonly label: "Karras";
}, {
    readonly value: "exponential";
    readonly label: "Exponential";
}, {
    readonly value: "sgm_uniform";
    readonly label: "SGM Uniform";
}, {
    readonly value: "simple";
    readonly label: "Simple";
}, {
    readonly value: "ddim_uniform";
    readonly label: "DDIM uniform";
}];
export declare const NOVELAI_SAMPLER_OPTIONS: readonly [{
    readonly value: "k_euler_ancestral";
    readonly label: "Euler ancestral";
}, {
    readonly value: "k_euler";
    readonly label: "Euler";
}, {
    readonly value: "k_dpmpp_2m";
    readonly label: "DPM++ 2M";
}, {
    readonly value: "k_dpmpp_sde";
    readonly label: "DPM++ SDE";
}, {
    readonly value: "ddim";
    readonly label: "DDIM";
}];
export declare const NOVELAI_NOISE_SCHEDULE_OPTIONS: readonly [{
    readonly value: "karras";
    readonly label: "Karras";
}, {
    readonly value: "native";
    readonly label: "Native";
}, {
    readonly value: "exponential";
    readonly label: "Exponential";
}, {
    readonly value: "polyexponential";
    readonly label: "Polyexponential";
}];
export interface NormalizeImageGenerationProfileResult {
    profile: ImageGenerationDefaultsProfile;
    changed: boolean;
}
export declare function imageSourceToDefaultsService(value: unknown): ImageDefaultsService | null;
export declare function isImageDefaultsService(value: unknown): value is ImageDefaultsService;
export declare function createDefaultImageGenerationProfile(service: ImageDefaultsService): ImageGenerationDefaultsProfile;
export declare function normalizeImageGenerationProfile(rawProfile: unknown, service: ImageDefaultsService): NormalizeImageGenerationProfileResult;
export declare function sanitizeImageGenerationProfile(profile: ImageGenerationDefaultsProfile, service: ImageDefaultsService): ImageGenerationDefaultsProfile;
export declare function mergePromptPrefix(prefix: string, prompt: string): string;
export declare function mergeNegativePrompt(prefix: string, prompt?: string): string;
//# sourceMappingURL=image-generation-defaults.d.ts.map