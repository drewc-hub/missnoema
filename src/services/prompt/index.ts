// ──────────────────────────────────────────────
// Prompt Service — Public exports
// ──────────────────────────────────────────────
export { assemblePrompt, type AssemblerInput, type AssemblerOutput } from "@/components/assembler.js";
export { wrapContent, wrapGroup } from "@/components/format-engine.js";
export { expandMarker, type MarkerContext, type ExpandedMarker } from "@/components/marker-expander.js";
export {
  buildPromptMacroContext,
  collectCharacterDepthPromptEntries,
  resolveMacrosWithVariableSnapshot,
  resolveCharacterMacroData,
  type CharacterMacroData,
  type MacroResolutionTransaction,
  type PromptDepthEntry,
} from "@/components/macro-context.js";
export { mergeAdjacentMessages, squashLeadingSystemMessages } from "@/components/merger.js";
export { getCharacterDescriptionWithExtensions } from "@/components/character-description-extensions.js";
