#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { initializeSchema } from "@/components/db/schema.js";
import { closeDatabase } from "@/components/db/connection.js";
import { startHttpServer } from "@/components/http/server.js";
import { setHttpPort } from "@/components/utils/webui.js";

// Import registration functions
import { registerCoreTools } from "@/components/register/core.js";
import { registerWorldTools } from "@/components/register/world.js";
import { registerCharacterTools } from "@/components/register/character.js";
import { registerCombatTools } from "@/components/register/combat.js";
import { registerInventoryTools } from "@/components/register/inventory.js";
import { registerQuestTools } from "@/components/register/quests.js";
import { registerNarrativeTools } from "@/components/register/narrative.js";
import { registerResourceTools } from "@/components/register/resources.js";
import { registerTimeTools } from "@/components/register/time.js";
import { registerTableTools } from "@/components/register/tables.js";
import { registerSecretTools } from "@/components/register/secrets.js";
import { registerRelationshipTools } from "@/components/register/relationships.js";
import { registerTagTools } from "@/components/register/tags.js";
import { registerStatusTools } from "@/components/register/status.js";
import { registerFactionTools } from "@/components/register/factions.js";
import { registerAbilityTools } from "@/components/register/abilities.js";
import { registerNoteTools } from "@/components/register/notes.js";
import { registerPauseTools } from "@/components/register/pause.js";
import { registerImageTools } from "@/components/register/images.js";
import { registerAudioTools } from "@/components/register/audio.js";
import { registerDisplayTools } from "@/components/register/display.js";
import { registerBatchTools } from "@/components/register/batch.js";
import { registerMcpResources } from "@/components/register/mcp-resources.js";
import { registerMcpPrompts } from "@/components/register/mcp-prompts.js";

// Initialize database
initializeSchema();

// Create MCP server
const server = new McpServer({
  name: "dmcp",
  version: "0.1.0",
});

// Register all tools by domain
registerCoreTools(server);           // Game, Interview, Rules
registerWorldTools(server);          // Locations, Connections, Map
registerCharacterTools(server);      // Characters (PC/NPC)
registerCombatTools(server);         // Combat, Dice, Checks
registerInventoryTools(server);      // Items
registerQuestTools(server);          // Quests, Objectives
registerNarrativeTools(server);      // Events, History, Export, Player Choices
registerResourceTools(server);       // Custom Resources
registerTimeTools(server);           // Calendar, Time, Timers
registerTableTools(server);          // Random Tables
registerSecretTools(server);         // Secrets, Knowledge
registerRelationshipTools(server);   // Relationships
registerTagTools(server);            // Tags
registerStatusTools(server);         // Status Effects
registerFactionTools(server);        // Factions
registerAbilityTools(server);        // Abilities/Powers
registerNoteTools(server);           // Game Notes
registerPauseTools(server);          // Pause/Resume, Context Snapshots, External Updates
registerImageTools(server);          // Stored Images
registerAudioTools(server);          // Stored Audio (TTS, Voice References)
registerDisplayTools(server);        // Display/Theme Configuration
registerBatchTools(server);          // Batch Operations (multi-entity, workflows)

// Register MCP Resources and Prompts
registerMcpResources(server);        // Read-only data access via URI
registerMcpPrompts(server);          // Reusable prompt templates

// ============================================================================
// START SERVER
// ============================================================================

// HTTP server port (configurable via environment variable)
const HTTP_PORT = parseInt(process.env.DMCP_HTTP_PORT || "3456", 10);

async function main() {
  // Start HTTP server for web UI (runs alongside MCP)
  const actualPort = await startHttpServer(HTTP_PORT);
  setHttpPort(actualPort);

  // Start MCP server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Handle cleanup
process.on("SIGINT", () => {
  closeDatabase();
  process.exit(0);
});

process.on("SIGTERM", () => {
  closeDatabase();
  process.exit(0);
});

main().catch((error) => {
  console.error("Server error:", error);
  closeDatabase();
  process.exit(1);
});
