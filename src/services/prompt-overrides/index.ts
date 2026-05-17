// ──────────────────────────────────────────────
// Prompt Overrides — Public exports
// ──────────────────────────────────────────────
export { loadPrompt } from "@/components/load-prompt.js";
export { renderTemplate, validateTemplate } from "@/components/template.js";
export type { TemplateValidationResult } from "@/components/template.js";
export {
  PROMPT_OVERRIDE_REGISTRY,
  SPRITES_EXPRESSION_SHEET,
  SPRITES_SINGLE_PORTRAIT,
  SPRITES_SINGLE_FULL_BODY,
  SPRITES_FULL_BODY_SHEET,
  GAME_NPC_PORTRAIT,
  GAME_BACKGROUND,
  GAME_SCENE_ILLUSTRATION,
  CONVERSATION_SELFIE,
  getPromptOverrideDef,
  listPromptOverrideKeys,
} from "@/components/registry.js";
export type {
  PromptOverrideKeyDef,
  PromptVariable,
  SpritesExpressionSheetCtx,
  SpritesSinglePortraitCtx,
  SpritesSingleFullBodyCtx,
  SpritesFullBodySheetCtx,
  GameNpcPortraitCtx,
  GameBackgroundCtx,
  GameSceneIllustrationCtx,
  ConversationSelfieCtx,
} from "@/components/registry.js";
