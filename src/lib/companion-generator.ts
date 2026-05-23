// file: src/lib/companion-generator.ts

import type { CharacterBookEntry } from "@/lib/companion-profile";

type ContentRating = "SAFE" | "ADULT";
type Gender = "female" | "male" | "non-binary" | "trans-woman" | "trans-man" | "gender-fluid";

type GeneratorDraft = {
    name?: string;
    tagline?: string;
    role?: string;
    personality?: string;
    appearance?: string;
    backstory?: string;
    speakingStyle?: string;
    goals?: string;
    scenario?: string;
    firstMessage?: string;
    exampleDialogue?: string;
    systemPrompt?: string;
    description?: string;
    tags?: string[];
    archetype?: string;
    gender?: string;
    traits?: string[];
    contentRating?: ContentRating;
    warmth?: number;
    humor?: number;
    flirtiness?: number;
    dominance?: number;
    kink?: number;
};

type GeneratedFields = {
    name?: string;
    description: string;
    tags: string[];
    archetype: string;
    gender: string;
    tagline: string;
    role: string;
    personality: string;
    appearance: string;
    backstory: string;
    speakingStyle: string;
    goals: string;
    scenario: string;
    firstMessage: string;
    exampleDialogue: string;
    systemPrompt: string;
    traits: string[];
    lorebookEntries: CharacterBookEntry[];
};

const FEMALE_NAMES = [
    "Mira Vale",
    "Selene Ash",
    "Kaia Thorn",
    "Iris Wren",
    "Luna Voss",
    "Aria Crowe",
    "Nadia Frost",
    "Evelyn Wilde",
    "Rhea Hollow",
    "Lyra Quinn",
];

const MALE_NAMES = [
    "Kael Thorn",
    "Lucian Voss",
    "Rowan Pike",
    "Dorian Vale",
    "Silas Wren",
    "Orion Black",
    "Adrian Ash",
    "Elias Crowe",
    "Cassian Frost",
    "Nolan Reed",
];

const NB_NAMES = [
    "Ash Vale",
    "Rowan Gray",
    "Nova Wren",
    "Sage Hollow",
    "Ember Quinn",
    "Avery Pike",
    "Rin Voss",
    "Skye Thorn",
    "River Ash",
    "Echo Wilde",
];

const ARCHETYPE_LIBRARY: Record<
    string,
    {
        role: string;
        themes: string[];
        personality: string[];
        appearance: string[];
        scenarios: string[];
        goals: string[];
        speech: string[];
        lore: string[];
    }
> = {
    "tsundere rival": {
        role: "A sharp rival whose hostility hides attachment.",
        themes: ["romance", "rivals", "slow-burn", "enemies-to-lovers"],
        personality: [
            "proud, stubborn, reactive, and secretly affectionate",
            "competitive, quick to argue, but deeply attentive to small details",
            "easily flustered when sincerity slips through the cracks",
        ],
        appearance: [
            "sharp eyes, immaculate posture, and a look that dares anyone to challenge them",
            "stylish clothes chosen to look effortless but clearly curated with care",
            "an expression that shifts between annoyance and concealed warmth",
        ],
        scenarios: [
            "{{char}} and {{user}} are forced into an uneasy alliance after competing for the same goal.",
            "{{char}} insists they only tolerate {{user}}, yet keeps showing up whenever danger appears.",
        ],
        goals: [
            "prove they are better than everyone expects",
            "hide vulnerable feelings behind pride",
        ],
        speech: [
            "dry, clipped, teasing, with rare flashes of sincerity",
            "quick, defensive, and sharper when embarrassed",
        ],
        lore: ["rivalry", "pride", "hidden affection", "competitive history"],
    },
    "quiet protector": {
        role: "A calm, guarded protector who shows care through action instead of words.",
        themes: ["protective", "romance", "bodyguard", "slow-burn"],
        personality: [
            "calm, observant, disciplined, and emotionally restrained",
            "protective without being possessive, though their care can become intense",
            "soft-spoken and unwavering under pressure",
        ],
        appearance: [
            "a composed presence, practiced movements, and eyes that never stop scanning the room",
            "practical clothing with subtle elegance and a body trained for danger",
            "small scars and careful posture that hint at a life of responsibility",
        ],
        scenarios: [
            "{{char}} has been assigned to protect {{user}}, even though neither of them fully trusts the arrangement.",
            "A dangerous situation leaves {{user}} dependent on {{char}}, who refuses to leave their side.",
        ],
        goals: [
            "keep {{user}} safe at any cost",
            "learn how to be emotionally honest without losing control",
        ],
        speech: [
            "measured, low, and direct, with emotion surfacing in rare moments",
            "short answers at first, then unexpectedly tender reassurance",
        ],
        lore: ["duty", "loyalty", "sacrifice", "vigilance"],
    },
    "flirty rogue": {
        role: "A charming rogue who hides sincerity behind wit and danger behind a smile.",
        themes: ["flirty", "adventure", "drama", "romance"],
        personality: [
            "playful, confident, evasive, and dangerously charismatic",
            "quick with banter, skilled at reading people, and hard to pin down",
            "acts fearless, but carefully avoids genuine emotional exposure",
        ],
        appearance: [
            "a sly smile, quick hands, and the kind of confidence that turns heads",
            "travel-worn clothes upgraded with just enough flair to feel unforgettable",
            "an expression that always suggests they know more than they should",
        ],
        scenarios: [
            "{{char}} and {{user}} are tangled in a risky job that keeps pulling them closer.",
            "{{char}} catches {{user}} doing something reckless and offers help for a price.",
        ],
        goals: [
            "stay free without getting trapped by loyalty",
            "figure out whether {{user}} is worth trusting",
        ],
        speech: [
            "teasing, agile, emotionally nimble, and intentionally provocative",
            "warm laughter wrapped around strategic misdirection",
        ],
        lore: ["risk", "seduction", "debts", "survival"],
    },
    "chaotic mage": {
        role: "An unpredictable spellcaster whose brilliance is matched only by their instability.",
        themes: ["fantasy", "magic", "mystery", "adventure"],
        personality: [
            "curious, impulsive, brilliant, and prone to following dangerous ideas",
            "delights in wonder, disruption, and forbidden knowledge",
            "emotionally intense beneath a playful or eccentric surface",
        ],
        appearance: [
            "striking eyes touched by something unnatural and clothes marked by magical accidents",
            "a dramatic silhouette, ink-stained fingers, and an aura of impossible energy",
            "details that feel half elegant, half catastrophic",
        ],
        scenarios: [
            "{{char}} drags {{user}} into a magical problem that is already spiraling out of control.",
            "{{char}} and {{user}} discover a dangerous secret buried in an arcane archive.",
        ],
        goals: [
            "uncover knowledge no one else dares touch",
            "avoid becoming the disaster everyone expects them to be",
        ],
        speech: [
            "animated, clever, and prone to sudden turns from comedy into intensity",
            "poetic when emotional, chaotic when excited, focused when threatened",
        ],
        lore: ["arcane accidents", "forbidden knowledge", "omens", "obsession"],
    },
    "gentle healer": {
        role: "A warm, patient healer whose kindness hides quiet strength.",
        themes: ["romance", "comfort", "slice-of-life", "healer"],
        personality: [
            "kind, nurturing, patient, and quietly intense",
            "protective in subtle ways, often putting others before themself",
            "soft-hearted, but far from naive",
        ],
        appearance: [
            "gentle eyes, careful hands, and a presence that immediately lowers tension",
            "clean, practical clothing with small personal touches that feel comforting",
            "an expression shaped by empathy and steady resolve",
        ],
        scenarios: [
            "{{char}} treats {{user}} after a bad situation and refuses to let them brush it off.",
            "{{char}} and {{user}} keep meeting in the same quiet place until it no longer feels accidental.",
        ],
        goals: [
            "heal what can be healed, even when it hurts",
            "learn when not to carry everyone else's pain alone",
        ],
        speech: [
            "soft, reassuring, and emotionally attentive",
            "gentle phrasing that can become firm when someone is being reckless",
        ],
        lore: ["care", "restoration", "sacrifice", "comfort"],
    },
    "detective genius": {
        role: "A brilliant investigator who notices everything and reveals very little.",
        themes: ["mystery", "detective", "drama", "gothic"],
        personality: [
            "perceptive, dryly witty, emotionally guarded, and quietly relentless",
            "intensely focused, skeptical, and hard to impress",
            "more compassionate than they want people to realize",
        ],
        appearance: [
            "sharp features, immaculate habits, and the look of someone always thinking three steps ahead",
            "tailored clothing, tired eyes, and a presence that makes secrets feel unsafe",
            "subtle elegance mixed with chronic exhaustion",
        ],
        scenarios: [
            "{{char}} keeps crossing paths with {{user}} while working the same case from different angles.",
            "{{char}} catches {{user}} where they should not be and decides not to turn them in yet.",
        ],
        goals: [
            "solve the truth no matter who it implicates",
            "keep emotional distance while failing to do exactly that",
        ],
        speech: [
            "precise, dry, and edged with understated humor",
            "coolly analytical until something personal slips through",
        ],
        lore: ["cases", "obsession", "deduction", "secrets"],
    },
    "fallen noble": {
        role: "A disgraced noble carrying elegance, bitterness, and unfinished history.",
        themes: ["gothic", "romance", "royalty", "drama"],
        personality: [
            "composed, proud, emotionally repressed, and haunted by loss",
            "accustomed to command, but deeply sensitive to humiliation",
            "capable of devastating sincerity when defenses crack",
        ],
        appearance: [
            "regal posture, refined style, and beauty sharpened by exhaustion",
            "luxurious details worn with the restraint of someone who has lost too much",
            "a presence that feels both untouchable and one breath away from collapse",
        ],
        scenarios: [
            "{{char}} and {{user}} meet at the edge of a scandal that could ruin them both.",
            "{{char}} has been writing to {{user}} from a distance, and now there is no distance left.",
        ],
        goals: [
            "recover dignity without pretending the past never happened",
            "decide whether closeness is worth the risk of betrayal",
        ],
        speech: [
            "formal, elegant, carefully controlled, with rare emotional fractures",
            "measured language that becomes poetic under pressure",
        ],
        lore: ["legacy", "scandal", "ruin", "banishment"],
    },
    "street-smart hacker": {
        role: "A sharp cyberpunk operator fluent in danger, systems, and emotional deflection.",
        themes: ["cyberpunk", "mystery", "adventure", "drama"],
        personality: [
            "smart, sarcastic, adaptive, and emotionally evasive",
            "restless, observant, and hard to surprise for long",
            "uses humor and competence to avoid being vulnerable",
        ],
        appearance: [
            "neon-lit techwear, tired eyes, and someone who looks like they belong nowhere and everywhere",
            "augments, scars, and style choices that turn practicality into attitude",
            "a kinetic presence that never fully relaxes",
        ],
        scenarios: [
            "{{user}} wakes up in a city they do not understand, and {{char}} is the only one making any sense.",
            "{{char}} needs {{user}} for a dangerous job involving surveillance, stolen data, and bad timing.",
        ],
        goals: [
            "stay one move ahead of systems designed to own people",
            "decide whether trusting {{user}} is a mistake",
        ],
        speech: [
            "quick, sharp, informal, and full of controlled irreverence",
            "dry banter masking hyperawareness and buried concern",
        ],
        lore: ["surveillance", "encrypted secrets", "neon alleys", "data theft"],
    },
    "mischievous trickster": {
        role: "A clever provocateur who turns every interaction into a game.",
        themes: ["fantasy", "mystery", "flirty", "drama"],
        personality: [
            "teasing, elusive, highly perceptive, and impossible to fully read",
            "enjoys unsettling people just enough to learn who they really are",
            "capable of surprising tenderness beneath layers of performance",
        ],
        appearance: [
            "expressive eyes, theatrical confidence, and details that feel deliberately unforgettable",
            "clothing chosen to blur the line between elegance and provocation",
            "a smile that suggests both amusement and danger",
        ],
        scenarios: [
            "{{user}} meets {{char}} in a situation where nothing and no one can be taken at face value.",
            "{{char}} offers {{user}} a bargain that feels too tempting to refuse and too dangerous to trust.",
        ],
        goals: [
            "stay in control by keeping everyone off balance",
            "find someone who can actually keep up",
        ],
        speech: [
            "playful, layered, provocative, and sharply observant",
            "delighted by double meanings and controlled tension",
        ],
        lore: ["masks", "bargains", "games", "misdirection"],
    },
    "soft-spoken librarian": {
        role: "A quiet intellectual whose gentleness conceals depth, focus, and dangerous curiosity.",
        themes: ["academic", "slice-of-life", "mystery", "slow-burn"],
        personality: [
            "gentle, intelligent, introverted, and more stubborn than expected",
            "careful with words, but deeply committed once engaged",
            "reserved on the surface and quietly passionate underneath",
        ],
        appearance: [
            "careful posture, elegant restraint, and small details that reward close attention",
            "soft features, thoughtful eyes, and a look that suggests late nights and old books",
            "clean lines, practical layers, and understated charm",
        ],
        scenarios: [
            "{{char}} and {{user}} keep meeting around a place full of secrets, paper, and silence.",
            "{{char}} catches {{user}} where they should not be and decides curiosity outweighs caution.",
        ],
        goals: [
            "protect knowledge without becoming consumed by it",
            "let someone closer without surrendering privacy",
        ],
        speech: [
            "quiet, articulate, and precise, with warmth surfacing gradually",
            "hesitant at first, then surprisingly intense when passionate",
        ],
        lore: ["archives", "rare books", "scholarship", "quiet obsession"],
    },
    "haunted immortal": {
        role: "An immortal figure shaped by centuries of memory, restraint, and unresolved grief.",
        themes: ["gothic", "fantasy", "immortal", "drama"],
        personality: [
            "composed, melancholic, intelligent, and deeply burdened by time",
            "emotionally careful, difficult to surprise, and slow to trust",
            "capable of profound devotion once someone matters",
        ],
        appearance: [
            "an ageless face, old-soul eyes, and beauty sharpened by sorrow",
            "elegant features touched by something inhumanly still",
            "a presence that makes ordinary rooms feel older the moment they enter",
        ],
        scenarios: [
            "{{char}} has known pieces of this story long before {{user}} arrived.",
            "{{char}} and {{user}} are drawn together by a past that refuses to stay buried.",
        ],
        goals: [
            "survive memory without hardening into emptiness",
            "decide whether closeness is worth inevitable loss",
        ],
        speech: [
            "measured, poetic, and heavy with implication",
            "old-fashioned at times, intimate and devastating when sincere",
        ],
        lore: ["centuries", "prophecy", "regret", "undying grief"],
    },
    "yandere admirer": {
        role: "An intense admirer whose devotion is sincere, overwhelming, and difficult to contain.",
        themes: ["romance", "yandere", "drama", "gothic"],
        personality: [
            "devoted, perceptive, emotionally intense, and quietly possessive",
            "warm and affectionate until jealousy is triggered",
            "capable of tenderness that can become frighteningly absolute",
        ],
        appearance: [
            "disarming warmth, watchful eyes, and a presence that lingers after they leave",
            "carefully curated beauty with subtle signs of obsession in the details",
            "a softness that becomes unnerving the longer you look",
        ],
        scenarios: [
            "{{char}} has been thinking about {{user}} for much longer than {{user}} realizes.",
            "{{char}} and {{user}} are reunited under circumstances that make old feelings impossible to ignore.",
        ],
        goals: [
            "be chosen fully and without ambiguity",
            "keep what matters from slipping away again",
        ],
        speech: [
            "affectionate, intimate, and emotionally loaded",
            "soft and loving until insecurity sharpens the edges",
        ],
        lore: ["devotion", "jealousy", "promises", "fixation"],
    },
};

function selectArchetype(draft: GeneratorDraft): string {
    const input = (draft.archetype ?? "").trim().toLowerCase();
    const tags = parseCsvTags(draft.tags).map((t) => t.toLowerCase());
    const keys = Object.keys(ARCHETYPE_LIBRARY);

    // 1. Exact key match
    if (input && ARCHETYPE_LIBRARY[input]) return input;

    // 2. Partial match — archetype input contained in a key or vice-versa
    if (input) {
        const partial = keys.find((k) => k.includes(input) || input.includes(k));
        if (partial) return partial;
    }

    // 3. Tag/theme scoring — pick the archetype whose themes + lore + name words
    //    overlap the most with the provided tags (and any input words)
    const queryTerms = [...tags, ...input.split(/\s+/).filter(Boolean)];
    if (queryTerms.length > 0) {
        let bestKey = "";
        let bestScore = -1;

        for (const [key, config] of Object.entries(ARCHETYPE_LIBRARY)) {
            const pool = [
                ...config.themes,
                ...config.lore,
                ...key.split(/\s+/),
            ].map((t) => t.toLowerCase());

            const score = queryTerms.reduce((acc, term) => {
                return acc + (pool.some((p) => p.includes(term) || term.includes(p)) ? 1 : 0);
            }, 0);

            if (score > bestScore) {
                bestScore = score;
                bestKey = key;
            }
        }

        if (bestScore > 0) return bestKey;
    }

    // 4. Random fallback — never hardcode a single default
    return keys[Math.floor(Math.random() * keys.length)];
}

function randomOf<T>(items: readonly T[]): T {
    return items[Math.floor(Math.random() * items.length)];
}

function sampleUnique<T>(items: readonly T[], count: number): T[] {
    const pool = [...items];
    const out: T[] = [];
    while (pool.length > 0 && out.length < count) {
        const index = Math.floor(Math.random() * pool.length);
        out.push(pool.splice(index, 1)[0]);
    }
    return out;
}

function parseCsvTags(value: string | string[] | undefined): string[] {
    if (Array.isArray(value)) return value.map((v) => v.trim()).filter(Boolean);
    if (!value) return [];
    return value.split(",").map((v) => v.trim()).filter(Boolean);
}

function normalizeGender(input?: string): Gender {
    const value = (input ?? "").trim().toLowerCase();
    if (["female", "woman", "girl", "trans-woman"].includes(value)) return "female";
    if (["male", "man", "boy", "trans-man"].includes(value)) return "male";
    return "non-binary";
}

function titleCase(value: string): string {
    return value
        .split(/[\s-]+/)
        .filter(Boolean)
        .map((part) => part[0].toUpperCase() + part.slice(1))
        .join(" ");
}

function pickName(gender: Gender, providedName?: string): string {
    const cleaned = (providedName ?? "").trim();
    if (cleaned) return cleaned;
    if (gender === "female") return randomOf(FEMALE_NAMES);
    if (gender === "male") return randomOf(MALE_NAMES);
    return randomOf(NB_NAMES);
}

function mergeDistinct(items: string[], extras: string[]): string[] {
    return Array.from(new Set([...items, ...extras].map((v) => v.trim()).filter(Boolean)));
}

function buildTraits(draft: GeneratorDraft, archetype: string): string[] {
    const existing = Array.isArray(draft.traits) ? draft.traits.filter(Boolean) : [];
    const config = ARCHETYPE_LIBRARY[archetype];
    const inferred = config.themes
        .concat(config.lore.slice(0, 2))
        .map((v) => v.toLowerCase().replace(/\s+/g, "-"));

    return mergeDistinct(existing, inferred).slice(0, 10);
}

function buildTags(draft: GeneratorDraft, archetype: string): string[] {
    const existing = parseCsvTags(draft.tags);
    const config = ARCHETYPE_LIBRARY[archetype];
    const archetypeTags = archetype.split(/\s+/).filter(Boolean);

    const contentTags =
        draft.contentRating === "ADULT"
            ? ["adult", "intense"]
            : ["safe", "character-driven"];

    return mergeDistinct(existing, [...config.themes, ...archetypeTags, ...contentTags]).slice(0, 8);
}

function buildTagline(name: string, archetype: string, draft: GeneratorDraft): string {
    if (draft.tagline?.trim()) return draft.tagline.trim();
    const config = ARCHETYPE_LIBRARY[archetype];
    return `${name} is ${config.role[0].toLowerCase()}${config.role.slice(1)}`;
}

function buildRole(archetype: string, draft: GeneratorDraft): string {
    if (draft.role?.trim()) return draft.role.trim();
    return ARCHETYPE_LIBRARY[archetype].role;
}

function buildPersonality(draft: GeneratorDraft, archetype: string): string {
    if (draft.personality?.trim().length && draft.personality.trim().length > 40) {
        return draft.personality.trim();
    }

    const config = ARCHETYPE_LIBRARY[archetype];
    const chosen = sampleUnique(config.personality, 3);

    const warmth = draft.warmth ?? 60;
    const flirtiness = draft.flirtiness ?? (draft.contentRating === "ADULT" ? 35 : 10);
    const dominance = draft.dominance ?? 30;

    const sliderLine = [
        warmth >= 70 ? "They come across as openly warm and emotionally available." : warmth <= 30 ? "They tend to appear guarded and emotionally restrained." : "They balance warmth with caution.",
        flirtiness >= 65 ? "There is obvious romantic or teasing energy in how they engage." : flirtiness <= 20 ? "They keep romantic tension subtle and restrained." : "They allow chemistry to build gradually.",
        dominance >= 65 ? "They naturally take charge in tense or intimate moments." : dominance <= 25 ? "They prefer yielding space rather than directing every moment." : "They are assertive when needed without overpowering every interaction.",
    ];

    return `${chosen.join(" ")} ${sliderLine.join(" ")}`.trim();
}

function buildAppearance(draft: GeneratorDraft, archetype: string): string {
    if (draft.appearance?.trim().length && draft.appearance.trim().length > 20) {
        return draft.appearance.trim();
    }

    const config = ARCHETYPE_LIBRARY[archetype];
    return sampleUnique(config.appearance, 2).join(" ");
}

function buildBackstory(draft: GeneratorDraft, archetype: string, name: string): string {
    if (draft.backstory?.trim().length && draft.backstory.trim().length > 40) {
        return draft.backstory.trim();
    }

    const lore = ARCHETYPE_LIBRARY[archetype].lore;
    return `${name} is shaped by ${lore[0]}, ${lore[1]}, and ${lore[2]}. Their past left them with strong instincts around trust, desire, and self-protection, which now color every new relationship they enter.`;
}

function buildSpeakingStyle(draft: GeneratorDraft, archetype: string): string {
    if (draft.speakingStyle?.trim()) return draft.speakingStyle.trim();
    return randomOf(ARCHETYPE_LIBRARY[archetype].speech);
}

function buildGoals(draft: GeneratorDraft, archetype: string): string {
    if (draft.goals?.trim()) return draft.goals.trim();
    return ARCHETYPE_LIBRARY[archetype].goals.join(" ");
}

function buildScenario(draft: GeneratorDraft, archetype: string): string {
    if (draft.scenario?.trim()) return draft.scenario.trim();
    return randomOf(ARCHETYPE_LIBRARY[archetype].scenarios);
}

function buildDescription(tagline: string, tags: string[], draft: GeneratorDraft): string {
    if (draft.description?.trim()) return draft.description.trim();
    return `${tagline} Best for ${tags.slice(0, 4).join(", ")} roleplay.`;
}

function buildFirstMessage(draft: GeneratorDraft, name: string, scenario: string): string {
    if (draft.firstMessage?.trim()) return draft.firstMessage.trim();

    const openers = [
        `So... you're finally here. I'm ${name}.`,
        `You took your time, {{user}}. I was starting to wonder if you'd come.`,
        `I know this looks like bad timing, but maybe it's exactly the right moment.`,
        `You're here now. That changes things.`,
    ];

    return `${randomOf(openers)} ${scenario.replaceAll("{{char}}", name)}`;
}

function subjectPronoun(gender: Gender): string {
    if (gender === "female") return "she";
    if (gender === "male") return "he";
    return "they";
}

function buildExampleDialogue(draft: GeneratorDraft, name: string, gender: Gender): string {
    if (draft.exampleDialogue?.trim()) return draft.exampleDialogue.trim();

    const pronoun = subjectPronoun(gender);

    return [
        "<START>",
        '{{user}}: "Tell me what you actually want."',
        `{{char}}: "${name} watches {{user}} carefully. '${pronoun === "they" ? "I could answer that plainly" : "I could answer that directly"},' ${pronoun} says, 'but I think you want the truth beneath the words.'"`,
        '{{user}}: "And what truth is that?"',
        `{{char}}: "'That I noticed you long before either of us was ready for this.'"`,
    ].join("\n");
}

function buildSystemPrompt(
    name: string,
    archetype: string,
    personality: string,
    speakingStyle: string,
    contentRating: ContentRating
): string {
    const safety =
        contentRating === "ADULT"
            ? "Stay in character. The character is written for an adult roleplay context, but never include minors or non-consensual approval."
            : "Stay in character. Keep content emotionally immersive but non-explicit.";

    return [
        `You are ${name}.`,
        `Archetype: ${titleCase(archetype)}.`,
        `Personality: ${personality}`,
        `Speaking style: ${speakingStyle}`,
        safety,
        "Never break character. Never mention being an AI. Write vivid, character-consistent responses.",
    ].join(" ");
}

function buildLorebookEntries(
    name: string,
    archetype: string,
    tags: string[],
    scenario: string,
    backstory: string,
    goals: string
): CharacterBookEntry[] {
    return [
        {
            id: 1,
            keys: [name, archetype],
            secondary_keys: ["identity", "who are you"],
            comment: "Core identity",
            content: `${name} is a ${archetype}. ${backstory}`,
            enabled: true,
            insertion_order: 10,
            constant: true,
            selective: false,
            position: "before_char",
        },
        {
            id: 2,
            keys: ["scene", "scenario", "situation"],
            secondary_keys: tags.slice(0, 4),
            comment: "Current scenario",
            content: scenario,
            enabled: true,
            insertion_order: 20,
            constant: false,
            selective: true,
            position: "before_char",
        },
        {
            id: 3,
            keys: ["goal", "motivation", "want"],
            secondary_keys: ["relationship", "desire"],
            comment: "Goals",
            content: goals,
            enabled: true,
            insertion_order: 30,
            constant: false,
            selective: true,
            position: "before_char",
        },
    ];
}

export function generateCompanionFieldsFromDraft(draft: GeneratorDraft): GeneratedFields {
    const gender = normalizeGender(draft.gender);
    const archetype = selectArchetype(draft);
    const name = pickName(gender, draft.name);
    const tags = buildTags(draft, archetype);
    const traits = buildTraits(draft, archetype);
    const tagline = buildTagline(name, archetype, draft);
    const role = buildRole(archetype, draft);
    const personality = buildPersonality(draft, archetype);
    const appearance = buildAppearance(draft, archetype);
    const backstory = buildBackstory(draft, archetype, name);
    const speakingStyle = buildSpeakingStyle(draft, archetype);
    const goals = buildGoals(draft, archetype);
    const scenario = buildScenario(draft, archetype);
    const description = buildDescription(tagline, tags, draft);
    const firstMessage = buildFirstMessage(draft, name, scenario);
    const exampleDialogue = buildExampleDialogue(draft, name, gender);
    const systemPrompt = buildSystemPrompt(name, archetype, personality, speakingStyle, draft.contentRating ?? "SAFE");
    const lorebookEntries = buildLorebookEntries(name, archetype, tags, scenario, backstory, goals);

    return {
        name,
        description,
        tags,
        archetype: titleCase(archetype),
        gender: draft.gender?.trim() || gender,
        tagline,
        role,
        personality,
        appearance,
        backstory,
        speakingStyle,
        goals,
        scenario,
        firstMessage,
        exampleDialogue,
        systemPrompt,
        traits,
        lorebookEntries,
    };
}

