import type { ChatMode } from "../types/chat.js";
export interface ChatModeDefinition {
    id: ChatMode;
    name: string;
    description: string;
    icon: string;
    /** Which agents are enabled by default for this mode */
    defaultAgents: string[];
}
export declare const CHAT_MODES: Record<ChatMode, ChatModeDefinition>;
//# sourceMappingURL=chat-modes.d.ts.map