# AI Tavern Roadmap

This app already has the base of the platform: companion profiles, public/private visibility, adult/safe routing, one-on-one chat, memory, media generation, coins, subscriptions, reporting, and creator-owned companions.

The next evolution should not be a separate product. It should turn the current companion app into a layered fantasy roleplay platform:

1. AI Tavern: the social lobby and discovery layer.
2. Fantasy Tinder: swipe-style character discovery and matching.
3. Procedural VN Engine: authored/procedural scenes, routes, choices, and persistent state.
4. Character Marketplace: creator publishing, monetization, remixing, reviews, and curation.
5. Multiplayer RP World: shared rooms where users and AI characters interact.
6. AI Dungeon Ecosystem: playable adventures, parties, quests, world state, inventory, and procedural narration.

## Product Shape

### AI Tavern

The tavern is the main authenticated experience. It should replace the current flat chat/browser feel with a persistent hub:

- Featured companions, worlds, scenes, and creators.
- Recently active conversations and campaigns.
- Taverns/rooms grouped by fantasy vibe: cozy inn, vampire court, mage academy, space cantina, dungeon guild.
- User identity, coins, daily rewards, and creator tools surfaced in one place.

Current leverage:

- `Companion`, `CompanionAsset`, `Conversation`, `ChatMessage`, `UserFact`, `GenerationJob`.
- Existing `/adult` and safe routes.
- Existing billing and coins.

First build:

- Add a `/tavern` route.
- Show companion cards, recent conversations, suggested scenes, and a "Start Adventure" action.
- Keep it single-user at first. Multiplayer comes later.

### Fantasy Tinder

This is fast companion discovery, not only dating. The user swipes through characters, scenarios, parties, and worlds.

Core loop:

- Present one character/world card at a time.
- Swipe/pass/save/start chat.
- Use `CompanionReaction` as the first data source.
- Rank by likes, saves, views, tags, content rating, and conversation starts.

Domain additions:

- `DiscoveryEvent`: impression, pass, like, save, start, report.
- `Match`: user plus companion/world with status and source.
- Optional later: vector similarity over user preferences and companion profiles.

First build:

- Add `/discover`.
- Back it with `/api/discovery/next` and `/api/discovery/react`.
- Reuse existing companion list filtering and `CompanionReaction`.

### Procedural VN Engine

The visual novel engine should be a state machine around scenes, choices, generated narration, companion responses, and memory.

Core concepts:

- `Story`: an authored or generated playable narrative container.
- `StoryNode`: scene, dialogue beat, choice point, event, ending.
- `StoryRun`: one user's playthrough state.
- `StoryRunEvent`: append-only log of choices, generated text, state changes, and rewards.
- `StoryCharacter`: maps companions into a story role.

Why this matters:

- It gives roleplay structure without losing freeform chat.
- It enables replayable content, branching routes, premium story packs, and creator publishing.
- It becomes the foundation for AI dungeon sessions.

First build:

- Add "Scene Mode" to a companion chat before adding a full editor.
- Scene Mode stores the current setting, objective, relationship flags, and recent choices.
- Generate 2-4 choices after assistant replies.

### Character Marketplace

The marketplace is already half present through public companions and creator ownership. It needs publishing, trust, and monetization primitives.

Domain additions:

- `CreatorProfile`: display name, bio, links, payout state, rating aggregates.
- `MarketplaceListing`: companion/story/world listing, price, license, status.
- `Purchase`: user ownership of premium companion/story/world.
- `Review`: rating and text review.
- `Remix`: tracks derivative characters and attribution.

Moderation needs:

- Keep `ContentRating`, reports, banned theme checks, and age gating.
- Add listing review states before paid marketplace exposure.
- Separate "private creator draft" from "published listing".

First build:

- Add "Publish" metadata to companion owner pages.
- Add free listings first. Paid listings should wait until moderation and entitlement checks are solid.

### Multiplayer RP World

Do not start multiplayer by rewriting chat. Add multiplayer as room/session primitives around the existing message model.

Core concepts:

- `World`: setting, rules, content rating, lore, cover asset.
- `Room`: active location inside a world.
- `RoomParticipant`: user or AI companion presence.
- `RoomMessage`: public timeline message.
- `WorldState`: mutable facts, locations, factions, clocks, inventory, flags.

Technical path:

- Phase 1: async shared room feed.
- Phase 2: realtime presence and messages through Supabase Realtime or a websocket worker.
- Phase 3: AI narrator and AI companions observe room context and respond on turns.

First build:

- Single-room "Tavern Table" sessions with invite links.
- Use turn-based posting first.
- Add realtime after the room loop is useful.

### AI Dungeon Ecosystem

The dungeon layer is the highest-level composition of all prior pieces.

Core loop:

- User or party chooses a world/adventure.
- AI narrator describes the scene.
- Players act freely or choose suggested actions.
- Companions can join the party.
- The engine updates world state, memory, inventory, quests, and relationships.

Domain additions:

- `Adventure`: playable module in a world.
- `Quest`: objective with state.
- `Party`: users plus companions.
- `InventoryItem`: player or party inventory.
- `WorldEvent`: append-only canonical event stream.
- `NarratorProfile`: style, safety limits, ruleset, pacing.

First build:

- Single-player AI dungeon run using current chat streaming.
- Add narrator prompt builder separate from companion prompt builder.
- Store adventure state append-only before attempting complex branching.

## Architecture Direction

### Preserve Existing Chat

Keep `Conversation` and `ChatMessage` for one-on-one companion chat. Do not overload them into every future mode.

Add new models for structured play:

- `StoryRun` for VN sessions.
- `Room` and `RoomMessage` for multiplayer.
- `AdventureRun` or `WorldRun` for dungeon play.

Each mode can still reuse:

- companion prompt/profile data,
- memory retrieval,
- moderation,
- content rating,
- media generation,
- coins and subscriptions.

### Add An Event Log

For VN, rooms, and dungeon play, use append-only event tables. Generated state summaries can be cached, but the event log should remain canonical.

Benefits:

- replay and debugging,
- moderation review,
- undo/rerun,
- branching,
- creator analytics,
- multiplayer consistency.

### Separate Prompt Builders

The current chat prompt builder is heavily tuned for one-on-one companion roleplay. Keep it there.

Add separate prompt modules:

- `src/lib/prompts/companion.ts`
- `src/lib/prompts/scene.ts`
- `src/lib/prompts/narrator.ts`
- `src/lib/prompts/room.ts`

This keeps tavern, VN, and dungeon behavior from becoming one giant fragile prompt.

### Use Content Rating Everywhere

Every new domain object should include `ContentRating` or inherit it from a parent:

- companion,
- story,
- world,
- room,
- adventure,
- media asset,
- marketplace listing.

Safe and adult experiences should share architecture while retaining separate routing, gating, and moderation.

## Suggested Milestones

### Milestone 1: Tavern Hub and Discovery

Goal: make the app feel like a fantasy roleplay platform without deep schema risk.

Ship:

- `/tavern` hub.
- `/discover` swipe flow.
- reaction events and basic ranking.
- "Start chat", "Save", "Pass", "More like this".

Success metric:

- More companion starts per active user.
- More saves and repeat conversations.

### Milestone 2: Scene Mode

Goal: bridge chat into procedural VN.

Ship:

- scene setup panel,
- generated choices,
- scene state stored per conversation,
- choice history shown in chat,
- simple chapter reset.

Success metric:

- Longer sessions and more return visits to the same companion.

### Milestone 3: Creator Publishing

Goal: turn companions into marketplace inventory.

Ship:

- creator profile,
- listing metadata,
- public listing page,
- reviews or lightweight ratings,
- entitlement checks for premium content.

Success metric:

- Creator-published companions/stories used by non-owners.

### Milestone 4: Stories and Adventures

Goal: introduce reusable procedural VN and dungeon content.

Ship:

- story/adventure schema,
- single-player story run,
- narrator prompt,
- event log,
- generated recap and resume.

Success metric:

- Users complete or resume structured runs.

### Milestone 5: Multiplayer Rooms

Goal: social roleplay with users and AI companions.

Ship:

- tavern tables,
- room participants,
- room messages,
- invite links,
- turn-based AI response.

Success metric:

- Multi-user sessions with repeated room participation.

### Milestone 6: Full AI Dungeon World Layer

Goal: persistent worlds, party play, quests, and evolving world state.

Ship:

- worlds,
- parties,
- quests,
- inventory,
- world event log,
- creator-published adventure modules.

Success metric:

- Repeat dungeon runs, world subscriptions, marketplace adventure sales.

## First Code Slice

The lowest-risk first implementation slice is:

1. Add a `/tavern` route that becomes the primary fantasy hub.
2. Add `/discover` with companion cards and swipe/pass/save/start actions.
3. Add `DiscoveryEvent` in Prisma while reusing `CompanionReaction`.
4. Add API routes:
   - `GET /api/discovery/next`
   - `POST /api/discovery/react`
5. Track impressions, passes, saves, likes, and starts.

This creates measurable product movement while laying data foundations for the marketplace and recommendation engine.

## Naming

Use these product terms consistently:

- Tavern: the hub.
- Companion: an AI character.
- Scene: a structured short roleplay moment.
- Story: a VN-style authored/procedural route.
- World: a setting that can contain rooms, stories, and adventures.
- Room: a multiplayer place inside a world.
- Adventure: dungeon-style run with narrator, quests, and world state.
- Listing: marketplace publication of a companion, story, or world.

