import { ContentRating, Visibility } from "@prisma/client";

export function isAdultAllowed(user: any | null) {
    if (!user) return false;
    return !!user.ageVerifiedAt;
}

export function requireAdultAllowed(user: any | null) {
    if (!isAdultAllowed(user)) {
        const err = new Error("Age verification required for adult content.");
        (err as any).status = 403;
        throw err;
    }
}

export function coerceRating(v: unknown): ContentRating {
    const s = String(v ?? "").toUpperCase();
    return s === "ADULT" ? ContentRating.ADULT : ContentRating.SAFE;
}

export function coerceVisibility(
    v: unknown,
    fallback: Visibility = Visibility.PUBLIC,
): Visibility {
    const s = String(v ?? "").toUpperCase();
    if (s === "PRIVATE") return Visibility.PRIVATE;
    if (s === "UNLISTED") return Visibility.UNLISTED;
    if (s === "PUBLIC") return Visibility.PUBLIC;
    return fallback;
}
