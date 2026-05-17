export const CHAT_MODES = {
    conversation: {
        id: "conversation",
        name: "Conversation",
        description: "A straightforward AI conversation — no roleplay elements.",
        icon: "💬",
        defaultAgents: ["schedule-planner", "response-orchestrator", "autonomous-messenger"],
    },
    roleplay: {
        id: "roleplay",
        name: "Roleplay",
        description: "Immersive roleplay with characters, game state tracking, and world simulation.",
        icon: "🎭",
        defaultAgents: ["world-state", "prose-guardian", "continuity", "expression"],
    },
    visual_novel: {
        id: "visual_novel",
        name: "Visual Novel",
        description: "Visual novel experience with backgrounds, sprites, text boxes, and choices.",
        icon: "🎮",
        defaultAgents: ["world-state", "prose-guardian", "expression"],
    },
    game: {
        id: "game",
        name: "Game",
        description: "AI-managed singleplayer RPG with a Game Master, party members, sessions, and dice.",
        icon: "🎲",
        defaultAgents: ["world-state", "quest", "expression", "combat"],
    },
};
//# sourceMappingURL=chat-modes.js.map