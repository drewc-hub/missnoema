// ──────────────────────────────────────────────
// @marinara-engine/shared — Next.js barrel
//
// This file lives at src/ so webpack applies the
// root tsconfig @/ alias to all re-exports here.
// Do NOT use @/ paths inside src/app/marinara-engine/shared/
// because that directory has its own package.json
// and webpack won't apply the root alias there.
// ──────────────────────────────────────────────

// Types
export * from "./components/types/tts";
export * from "./components/types/chat";
export * from "./components/types/character";
export * from "./components/types/lorebook";
export * from "./components/types/prompt";
export * from "./components/types/connection";
export * from "./components/types/agent";
export * from "./components/types/game-state";
export * from "./components/types/combat-encounter";
export * from "./components/types/scene";
export * from "./components/types/vn";
export * from "./components/types/persona";
export * from "./components/types/regex";
export * from "./components/types/export";
export * from "./components/types/haptic";
export * from "./components/types/theme";
export * from "./components/types/extension";
export * from "./components/types/chat-preset";
export * from "./components/types/game";
export * from "./components/types/sidecar";
export * from "./components/types/image-generation-defaults";

// Schemas
export * from "./components/schemas/chat.schema";
export * from "./components/schemas/chat-preset.schema";
export * from "./components/schemas/character.schema";
export * from "./components/schemas/lorebook.schema";
export * from "./components/schemas/prompt.schema";
export * from "./components/schemas/connection.schema";
export * from "./components/schemas/agent.schema";
export * from "./components/schemas/custom-tool.schema";
export * from "./components/schemas/regex.schema";
export * from "./components/schemas/theme.schema";
export * from "./components/schemas/extension.schema";
export * from "./components/schemas/app-settings.schema";

// Constants
export * from "./components/constants/providers";
export * from "./components/constants/defaults";
export * from "./components/constants/chat-modes";
export * from "./components/constants/model-lists";
export * from "./components/constants/agent-prompts";
export * from "./components/constants/impersonate";
export * from "./components/constants/image-generation-defaults";
export * from "./components/constants/security";
export * from "./components/constants/game-assets";

// Utils
export * from "./components/utils/macro-engine";
export * from "./components/utils/xml-wrapper";
export * from "./components/utils/music-score";
export * from "./components/utils/agent-cost";
export * from "./components/utils/regex-replacement";
export * from "./components/utils/skill-check-format";
