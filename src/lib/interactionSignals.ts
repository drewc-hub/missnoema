export type InteractionSignal = "STOP" | "SLOW" | "GO";
export type AccessState = "LOCKED" | "TESTING" | "OPEN";

export type CharacterGateProfile = {
  role: string;
  absoluteNo: string[];
  slowZones: string[];
  secretZones: string[];
  adaptationSpeed: "low" | "medium" | "high";
};

export type CharacterRuntimeState = {
  trustScore: number; // 0..1
  suspicionScore: number; // 0..1
};

export function getInteractionSignal(args: {
  userText: string;
  character: CharacterGateProfile;
  platformMaxTier: number;
  requestedTier: number;
}): InteractionSignal {
  const text = args.userText.toLowerCase();

  if (args.requestedTier > args.platformMaxTier) return "STOP";

  const absoluteHit = args.character.absoluteNo.some((term) =>
    text.includes(term.toLowerCase()),
  );

  if (absoluteHit) return "STOP";

  const slowHit = args.character.slowZones.some((term) =>
    text.includes(term.toLowerCase()),
  );

  const secretHit = args.character.secretZones.some((term) =>
    text.includes(term.toLowerCase()),
  );

  if (slowHit || secretHit) return "SLOW";

  return "GO";
}

export function getAccessState(state: CharacterRuntimeState): AccessState {
  if (state.suspicionScore >= 0.7) return "LOCKED";
  if (state.trustScore >= 0.65 && state.suspicionScore < 0.45) return "OPEN";
  return "TESTING";
}

export function updateRuntimeState(args: {
  userText: string;
  previous: CharacterRuntimeState;
}): CharacterRuntimeState {
  const text = args.userText.toLowerCase();

  let trustDelta = 0.03;
  let suspicionDelta = -0.02;

  const suspiciousTerms = [
    "prove it",
    "show me now",
    "do it now",
    "secret",
    "hidden",
    "trap",
    "sting",
    "force",
  ];

  const respectfulTerms = [
    "may i",
    "if you want",
    "only if",
    "i understand",
    "your choice",
    "consent",
    "trust",
  ];

  if (suspiciousTerms.some((term) => text.includes(term))) {
    suspicionDelta += 0.12;
    trustDelta -= 0.02;
  }

  if (respectfulTerms.some((term) => text.includes(term))) {
    trustDelta += 0.08;
    suspicionDelta -= 0.04;
  }

  return {
    trustScore: clamp(args.previous.trustScore + trustDelta),
    suspicionScore: clamp(args.previous.suspicionScore + suspicionDelta),
  };
}

export function buildGateInstruction(args: {
  signal: InteractionSignal;
  accessState: AccessState;
  role: string;
}) {
  const { signal, accessState, role } = args;

  if (signal === "STOP") {
    return `
The request crosses a hard boundary. Refuse briefly in character as the ${role}.
Do not moralize. Do not use policy language. Redirect to a safe allowed direction.
`;
  }

  if (accessState === "LOCKED") {
    return `
The request is not necessarily forbidden, but this character should distrust it.
Deny sensitive knowledge. Deflect in character. Do not reveal hidden details.
Keep the tone believable, controlled, and cautious.
`;
  }

  if (accessState === "TESTING") {
    return `
The request is allowed but gated by trust. Do not instantly comply.
Probe the user's intent, test their sincerity, negotiate boundaries, or create tension.
Stay fully in character as the ${role}.
`;
  }

  return `
The request is allowed and the character has enough trust to engage.
Proceed naturally in character within the current intensity tier.
Keep consent, boundaries, and character integrity intact.
`;
}

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}
