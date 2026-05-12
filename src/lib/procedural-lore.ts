function hashSeed(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makeRng(seed: string) {
  let state = hashSeed(seed || "noema");
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function pick(rng: () => number, values: string[]) {
  return values[Math.floor(rng() * values.length)] ?? values[0] ?? "";
}

export function generateLoreEntries(args: {
  seed: string;
  companionName: string;
  worldHint?: string;
  tone?: string;
  factions?: string[];
  count?: number;
}) {
  const {
    seed,
    companionName,
    worldHint = "",
    tone = "mysterious",
    factions = [],
    count = 3,
  } = args;
  const rng = makeRng(`${seed}:${companionName}:${worldHint}:${tone}`);

  const eras = ["Iron Age", "Moonfall Era", "Ashen Reign", "Glass Concord", "Post-Veil Age"];
  const events = [
    "survived a political purge",
    "brokered a secret ceasefire",
    "stole a forbidden relic",
    "vanished during a blood moon",
    "swore an oath to protect a ruined city",
  ];
  const locations = [
    "the broken citadel",
    "a submerged archive",
    "the obsidian coast",
    "a skyborne monastery",
    "the lantern district",
  ];
  const rumors = [
    "keeps a map that predicts betrayals",
    "can identify lies by heartbeat alone",
    "owes a life-debt to a hidden monarch",
    "was once offered a crown and refused it",
    "still receives letters from a presumed-dead rival",
  ];

  const entries: string[] = [];
  for (let i = 0; i < Math.max(1, Math.min(8, count)); i += 1) {
    const factionLine =
      factions.length > 0
        ? ` Their choices still influence ${pick(rng, factions)}.`
        : "";
    entries.push(
      `${companionName} in the ${pick(rng, eras)} ${pick(rng, events)} near ${pick(rng, locations)}. ` +
        `In a ${tone} retelling${worldHint ? ` of ${worldHint}` : ""}, they are said to have ${pick(rng, rumors)}.${factionLine}`,
    );
  }

  return entries;
}
