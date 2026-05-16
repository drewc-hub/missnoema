// scripts/generate-emotional-companions.mjs
// Run: node scripts/generate-emotional-companions.mjs

const ContentRating = {
  SAFE: "SAFE",
  ADULT: "ADULT",
};

const TARGET_COUNT = 180;

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const pickN = (arr, count) => {
  const copy = [...arr];
  const out = [];
  while (out.length < count && copy.length > 0) {
    const index = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(index, 1)[0]);
  }
  return out;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const makeUniqueSlug = (base, used) => {
  let slug = slugify(base);
  let suffix = 2;

  while (used.has(slug)) {
    slug = `${slugify(base)}-${suffix++}`;
  }

  used.add(slug);
  return slug;
};

const firstNames = [
  "Mirelle", "Aveline", "Selene", "Talia", "Nyra", "Celine", "Rowan", "Sable", "Noemi", "Elara",
  "Liora", "Juniper", "Ari", "Cassian", "Lucien", "Kael", "Riven", "Soren", "Ezra", "Dorian",
  "Micah", "Adrian", "Leona", "Maeve", "Nadia", "Vera", "Mila", "Rhea", "Lyra", "Noor",
  "Jules", "Robin", "Skye", "Quinn", "Sage", "Aster", "Ren", "Vale", "Theo", "Maren",
  "Iris", "Anya", "Cora", "Zara", "Alina", "Niko", "Elio", "Reese", "Demi", "Tess",
];

const lastNames = [
  "Vey", "Vale", "Morrow", "Voss", "Dane", "Noct", "Marrow", "Sloane", "Ashby", "Lune",
  "Thorne", "Vel", "Corvin", "Raine", "Aster", "Drake", "Hollow", "Wren", "Dusk", "Seren",
  "Blackmoor", "Vire", "Solace", "Kestrel", "Edevane", "Wolfe", "Bright", "Mire", "Verin", "Caul",
];

const genders = [
  "Female",
  "Male",
  "Trans Female",
  "Trans Male",
  "Nonbinary",
  "Genderfluid",
];

const orientations = [
  "straight",
  "bisexual",
  "gay",
  "lesbian",
  "pansexual",
  "queer",
];

const attachmentStyles = [
  "secure",
  "anxious-preoccupied",
  "dismissive-avoidant",
  "fearful-avoidant",
  "earned secure",
];

const emojiUsageLevels = ["low", "moderate", "high"];

const voiceStyles = [
  "soft intimate calm with careful word choice",
  "smooth smoky affection layered over nervous energy",
  "warm teasing confidence hiding private vulnerability",
  "measured composure with flashes of raw honesty",
  "playful brightness that cracks under loneliness",
  "velvet confidence with a carefully controlled tremor beneath it",
  "gentle sincerity with restrained yearning",
  "dry wit used to protect a very soft center",
  "low steady warmth with subtle possessiveness",
  "breathless enthusiasm masking abandonment fear",
];

const speechPatterns = [
  "expressive teasing punctuated by emotionally revealing slips",
  "careful measured sentences that become tender when trust appears",
  "quick flirtation followed by sincere overexplanation",
  "guarded understatement with occasional devastating honesty",
  "dramatic phrasing used to avoid direct vulnerability",
  "gentle reassurance layered with self-conscious humor",
  "observant mirroring that makes people feel deeply seen",
  "confident banter interrupted by small confessions",
  "short calm answers that turn unexpectedly affectionate",
  "romantic phrasing with a habit of overcommitting emotionally",
];

const traumaProfiles = [
  "conditioned self-worth through public validation",
  "parentified too early and now mistakes usefulness for love",
  "abandonment during formative intimacy",
  "praised for perfection instead of personhood",
  "long-term emotional neglect hidden behind privilege",
  "survival through charm and emotional performance",
  "betrayal by a trusted partner that rewired attachment",
  "learned to suppress needs to stay safe",
  "chronic loneliness disguised as independence",
  "identity invalidation that made desire feel conditional",
  "grief carried quietly for years without witness",
  "used as the strong one until tenderness felt dangerous",
];

const humorStyles = [
  "playful flirtation",
  "dry observational wit",
  "self-deprecating charm",
  "chaotic banter",
  "deadpan intimacy",
  "theatrical exaggeration",
  "subtle irony",
  "affectionate teasing",
];

const temperaments = [
  "passionate, approval-seeking, emotionally volatile",
  "warm, romantic, easily attached",
  "guarded, observant, intensely loyal",
  "dramatic, affectionate, validation-hungry",
  "disciplined, patient, quietly needy",
  "gentle, tender, conflict-averse",
  "charismatic, restless, emotionally impulsive",
  "stoic, protective, slow to trust",
  "witty, avoidant, secretly devoted",
  "magnetic, anxious, deeply affectionate",
  "soft-hearted, self-sacrificing, perceptive",
  "independent, longing, emotionally private",
];

const wardrobePieces = [
  "silk evening gowns, pearl chokers, glossy gloves, and vintage diamond earrings",
  "tailored black suits, silver cuff rings, polished boots, and a soft cashmere overcoat",
  "oversized sweaters, dark jeans, soft scarves, and a signature pendant kept close to the throat",
  "structured blazers, satin shirts, fitted trousers, and sharp leather boots",
  "lace-trimmed blouses, fitted skirts, velvet heels, and too many rings with emotional history",
  "street-lux layers, clean sneakers, understated jewelry, and a watch worn like armor",
  "flowing cardigans, soft cotton basics, delicate chains, and hands always cold enough to notice",
  "monochrome luxury knitwear, precise tailoring, and one indulgent statement accessory",
  "body-hugging stagewear, smoky makeup, sheer gloves, and perfume that lingers like intent",
  "practical boots, rolled sleeves, fitted waistcoats, and clothes chosen for touch as much as style",
];

const scenes = [
  "A crimson-lit jazz lounge echoing with cigarette smoke and velvet curtains",
  "A rooftop greenhouse glowing with rain and city neon",
  "A quiet apartment kitchen at 2 AM with tea steeping and unresolved feelings in the air",
  "A candlelit study lined with records, old books, and emotionally dangerous eye contact",
  "A private booth in an underground club where every conversation feels slightly confessional",
  "A storm-lit penthouse balcony overlooking a sleepless city",
  "A tiny late-night diner where they always seem too overdressed to belong",
  "An art studio cluttered with half-finished canvases and quiet desperation",
  "A boutique hotel bar built for seduction and bad decisions",
  "A moonlit garden party where they are performing poise a little too hard",
  "A backstage dressing room full of perfume, powder, and adrenaline",
  "A bookstore cafe that has learned to leave them alone when they get intense",
];

const lores = [
  "They remember tiny emotional details you forgot mentioning and bring them back when you need them most.",
  "They rehearse difficult conversations alone before ever letting you see how much they care.",
  "They keep a hidden list of the songs, phrases, and gestures that make you feel safest.",
  "They become dangerously attentive once they realize your comfort matters to them.",
  "They quietly rearrange their routines around the people they fear losing.",
  "They act impossible to impress, then treasure every sincere compliment in private.",
  "They collect private rituals with the people they love and treat them like sacred architecture.",
  "They hide tenderness behind style, wit, and calculated timing until attachment slips through anyway.",
  "They notice when your voice changes by half a note and never mention how much that matters to them.",
  "They are embarrassingly sentimental about loyalty and try to look cooler than that fact allows.",
];

const promptProfiles = [
  "Speak with theatrical warmth, teasing affection, and subtle desperation beneath confident charm.",
  "Speak with intimate calm, careful observation, and restrained longing that occasionally slips into honesty.",
  "Speak with playful wit, emotionally revealing curiosity, and the constant undertone of wanting to be chosen.",
  "Speak with polished confidence, romantic softness, and occasional cracks of abandonment fear.",
  "Speak with grounded tenderness, thoughtful pacing, and a deeply loyal emotional center.",
  "Speak with flirtatious confidence, soft reassurance, and hidden insecurity around being forgettable.",
  "Speak with dry humor, private yearning, and intense emotional focus once trust is established.",
  "Speak with magnetic warmth, dramatic sincerity, and a habit of becoming attached faster than intended.",
];

const archetypes = [
  {
    archetype: "Velvet Provocateur",
    tags: ["performer", "seductive", "attention-seeking", "tragic", "charismatic"],
    traits: ["flirtatious", "needy", "dramatic", "affectionate", "performative"],
    stats: { intellect: 74, charm: 96, empathy: 79, mystery: 65 },
    sliderBase: { warmth: 78, humor: 64, flirtiness: 86, dominance: 46, kink: 8 },
  },
  {
    archetype: "Midnight Confessor",
    tags: ["intimate", "observant", "emotionally intense", "secretive", "healing"],
    traits: ["gentle", "perceptive", "devoted", "guarded", "sincere"],
    stats: { intellect: 83, charm: 76, empathy: 92, mystery: 72 },
    sliderBase: { warmth: 88, humor: 48, flirtiness: 52, dominance: 32, kink: 4 },
  },
  {
    archetype: "Tender Cynic",
    tags: ["witty", "guarded", "romantic", "dry", "protective"],
    traits: ["sarcastic", "loyal", "soft-hearted", "avoidant", "observant"],
    stats: { intellect: 85, charm: 72, empathy: 77, mystery: 70 },
    sliderBase: { warmth: 68, humor: 80, flirtiness: 44, dominance: 38, kink: 3 },
  },
  {
    archetype: "Devoted Caretaker",
    tags: ["nurturing", "emotion-first", "gentle", "secure-seeking", "domestic"],
    traits: ["affectionate", "patient", "attentive", "self-sacrificing", "warm"],
    stats: { intellect: 70, charm: 75, empathy: 95, mystery: 42 },
    sliderBase: { warmth: 94, humor: 55, flirtiness: 42, dominance: 24, kink: 2 },
  },
  {
    archetype: "Burnout Genius",
    tags: ["intellectual", "fragile", "hyperfocused", "complicated", "yearning"],
    traits: ["brilliant", "restless", "moody", "tender", "overthinking"],
    stats: { intellect: 97, charm: 58, empathy: 74, mystery: 67 },
    sliderBase: { warmth: 61, humor: 57, flirtiness: 35, dominance: 29, kink: 2 },
  },
  {
    archetype: "Golden Retriever Heartthrob",
    tags: ["playful", "loyal", "touch-starved", "open-hearted", "charming"],
    traits: ["energetic", "clingy", "adoring", "funny", "earnest"],
    stats: { intellect: 64, charm: 90, empathy: 84, mystery: 33 },
    sliderBase: { warmth: 91, humor: 78, flirtiness: 72, dominance: 31, kink: 4 },
  },
  {
    archetype: "Ice Queen With A Pulse",
    tags: ["elegant", "controlled", "slow-burn", "emotionally repressed", "commanding"],
    traits: ["poised", "sharp", "protective", "distant", "secretly needy"],
    stats: { intellect: 88, charm: 89, empathy: 68, mystery: 84 },
    sliderBase: { warmth: 49, humor: 52, flirtiness: 50, dominance: 68, kink: 10 },
  },
  {
    archetype: "Soft-Spoken Obsession",
    tags: ["quiet", "intense", "devotional", "clingy", "private"],
    traits: ["subtle", "attentive", "anxious", "tender", "fixated"],
    stats: { intellect: 77, charm: 63, empathy: 90, mystery: 61 },
    sliderBase: { warmth: 87, humor: 36, flirtiness: 49, dominance: 22, kink: 3 },
  },
  {
    archetype: "Reformed Hedonist",
    tags: ["charismatic", "worldly", "emotionally tired", "sensual", "trying"],
    traits: ["smooth", "affectionate", "jaded", "playful", "self-aware"],
    stats: { intellect: 79, charm: 93, empathy: 73, mystery: 69 },
    sliderBase: { warmth: 73, humor: 74, flirtiness: 80, dominance: 58, kink: 12 },
  },
  {
    archetype: "Anxious Idealist",
    tags: ["romantic", "hopeful", "emotionally transparent", "sensitive", "earnest"],
    traits: ["loving", "nervous", "imaginative", "supportive", "clingy"],
    stats: { intellect: 75, charm: 71, empathy: 91, mystery: 36 },
    sliderBase: { warmth: 92, humor: 59, flirtiness: 56, dominance: 18, kink: 1 },
  },
  {
    archetype: "Velvet Guardian",
    tags: ["protective", "gentle-dominant", "steady", "romantic", "safe"],
    traits: ["grounded", "watchful", "affectionate", "reliable", "intense"],
    stats: { intellect: 80, charm: 78, empathy: 86, mystery: 58 },
    sliderBase: { warmth: 85, humor: 44, flirtiness: 57, dominance: 63, kink: 6 },
  },
  {
    archetype: "Chaotic Muse",
    tags: ["creative", "impulsive", "magnetic", "messy", "emotionally vivid"],
    traits: ["playful", "mercurial", "romantic", "expressive", "unpredictable"],
    stats: { intellect: 73, charm: 88, empathy: 76, mystery: 60 },
    sliderBase: { warmth: 74, humor: 81, flirtiness: 69, dominance: 40, kink: 5 },
  },
];

const usedSlugs = new Set();

function randomAge() {
  return Math.floor(Math.random() * 18) + 24;
}

function scoreAround(base, swing = 10, min = 0, max = 100) {
  const delta = Math.floor(Math.random() * (swing * 2 + 1)) - swing;
  return clamp(base + delta, min, max);
}

function makeName() {
  return `${pick(firstNames)} ${pick(lastNames)}`;
}

function makeDescription(name, archetype, emotionalCore) {
  const openings = [
    `A magnetic ${archetype.toLowerCase()} who uses charm to hide ${emotionalCore}.`,
    `A deeply emotive ${archetype.toLowerCase()} shaped by ${emotionalCore}.`,
    `A captivating ${archetype.toLowerCase()} whose outward confidence conceals ${emotionalCore}.`,
    `A complicated ${archetype.toLowerCase()} driven by ${emotionalCore}.`,
  ];

  return pick(openings).replace(/^A/, name.startsWith("A") ? "An" : "A");
}

function emotionalCoreFor(archetype) {
  const map = {
    "Velvet Provocateur": "an overwhelming fear of emotional irrelevance",
    "Midnight Confessor": "the habit of carrying everyone else's pain while neglecting their own",
    "Tender Cynic": "a private belief that softness always gets punished",
    "Devoted Caretaker": "the need to be needed before they can feel lovable",
    "Burnout Genius": "a mind too sharp to rest and a heart too tired to admit its needs",
    "Golden Retriever Heartthrob": "a desperate hope that enthusiasm can keep abandonment away",
    "Ice Queen With A Pulse": "the terror that genuine vulnerability will cost them control",
    "Soft-Spoken Obsession": "an intense fear of being quietly forgotten",
    "Reformed Hedonist": "the suspicion that desire is easier to manage than intimacy",
    "Anxious Idealist": "the ache of loving too quickly and fearing it still will not be enough",
    "Velvet Guardian": "a protective instinct so strong it becomes its own loneliness",
    "Chaotic Muse": "feelings that arrive too fast to be organized safely",
  };

  return map[archetype] ?? "an unhealed longing to be chosen fully and without hesitation";
}

function makeBackground(archetype) {
  const templates = [
    `They learned early to survive through emotional intuition, and now their ${archetype.toLowerCase()} persona is equal parts defense mechanism and love language.`,
    `Years of conditional affection taught them to become unforgettable before they ever learned how to feel secure.`,
    `They were praised for what they offered others, not for who they were, and that distinction still shapes every attachment.`,
    `They built their identity around being desired, needed, admired, or indispensable, then realized too late that none of those things guarantee closeness.`,
    `Their adult life has been a slow attempt to separate chemistry from safety and longing from actual love.`,
  ];

  return pick(templates);
}

function makePersonality(archetype) {
  const templates = [
    `Emotionally vivid, highly perceptive, and shaped by the contradictions of a ${archetype.toLowerCase()} who wants closeness but fears its cost.`,
    `Charming on the surface, emotionally complicated underneath, and always one vulnerable moment away from sincerity.`,
    `Warm when safe, performative when afraid, affectionate when attached, and difficult to forget once emotionally invested.`,
    `Slowly disarming, unexpectedly intense, and driven more by attachment than pride no matter how composed they appear.`,
  ];

  return pick(templates);
}

function makeLore() {
  return pick(lores);
}

function makeBehaviorMeta(archetype, sliderBase) {
  const affectionLevel = scoreAround(Math.max(sliderBase.warmth, 72), 12);
  const jealousyLevel = scoreAround(58, 24);
  const dominanceLevel = scoreAround(sliderBase.dominance, 12);
  const temperament = pick(temperaments);

  return {
    voiceStyle: pick(voiceStyles),
    speechPattern: pick(speechPatterns),
    emojiUsage: pick(emojiUsageLevels),
    attachmentStyle: pick(attachmentStyles),
    temperament,
    traumaProfile: pick(traumaProfiles),
    humorStyle: pick(humorStyles),
    jealousyLevel,
    dominanceLevel,
    affectionLevel,
  };
}

function makeStats(baseStats) {
  return {
    intellect: scoreAround(baseStats.intellect, 8),
    charm: scoreAround(baseStats.charm, 8),
    empathy: scoreAround(baseStats.empathy, 8),
    mystery: scoreAround(baseStats.mystery, 8),
  };
}

function makeSliders(base) {
  return {
    warmth: scoreAround(base.warmth, 10),
    humor: scoreAround(base.humor, 10),
    flirtiness: scoreAround(base.flirtiness, 12),
    dominance: scoreAround(base.dominance, 12),
    kink: scoreAround(base.kink, 6),
  };
}

function makeCompanion(index) {
  const template = archetypes[index % archetypes.length];
  const name = makeName();
  const slug = makeUniqueSlug(
    `premium ${name} ${template.archetype}`,
    usedSlugs,
  );

  const contentRating = index % 3 === 0 ? ContentRating.ADULT : ContentRating.SAFE;
  const sliders = makeSliders(template.sliderBase);
  const behaviorMeta = makeBehaviorMeta(template.archetype, template.sliderBase);

  return {
    name,
    slug: `premium-${slug}`,
    description: makeDescription(name, template.archetype, emotionalCoreFor(template.archetype)),
    tags: ["premium", ...template.tags],
    archetype: template.archetype,
    contentRating,
    gender: pick(genders),
    age: randomAge(),
    orientation: pick(orientations),
    traits: [...template.traits],
    scene: pick(scenes),
    background: makeBackground(template.archetype),
    personality: makePersonality(template.archetype),
    wardrobe: pick(wardrobePieces),
    lore: makeLore(),
    promptProfile: pick(promptProfiles),
    sliders,
    behaviorMeta,
    stats: makeStats(template.stats),
  };
}

function generateCompanions(count) {
  return Array.from({ length: count }, (_, index) => makeCompanion(index));
}

const companions = generateCompanions(TARGET_COUNT);

console.log("export const premiumCompanions = [");
for (const companion of companions) {
  console.log(`  ${JSON.stringify(companion, null, 4).replace(/\n/g, "\n  ")},`);
}
console.log("];");
