import React, { useMemo } from "react";

interface Props {
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  imageUrl?: string | null;
}

export default function AvatarPlaceholder({
  name,
  size = "md",
  imageUrl,
}: Props) {
  // Get initials from name (up to 2 characters)
  const initials = useMemo(() => {
    if (!name) return "?";

    const parts = name
      .trim()
      .split(/\s+/)
      .filter((p) => p.length > 0);

    if (parts.length === 0) return "?";

    const firstPart = parts[0];

    if (parts.length === 1 || !firstPart) {
      return (firstPart ?? "?").substring(0, 2).toUpperCase();
    }

    const lastPart = parts[parts.length - 1];

    const firstInitial = firstPart[0] ?? "";
    const lastInitial = lastPart?.[0] ?? "";

    return (firstInitial + lastInitial).toUpperCase();
  }, [name]);

  // Generate a consistent color based on name
  const gradientColors = useMemo<[string, string]>(() => {
    const colors: [string, string][] = [
      ["#7c3aed", "#a855f7"], // Purple
      ["#2563eb", "#3b82f6"], // Blue
      ["#059669", "#10b981"], // Green
      ["#dc2626", "#f87171"], // Red
      ["#d97706", "#fbbf24"], // Orange
      ["#0891b2", "#22d3ee"], // Cyan
      ["#7c2d12", "#c2410c"], // Brown
      ["#4f46e5", "#818cf8"], // Indigo
    ];

    let hash = 0;
    const value = name || "";

    for (let i = 0; i < value.length; i++) {
      hash = value.charCodeAt(i) + ((hash << 5) - hash);
    }

    const index = Math.abs(hash) % colors.length;

    return colors[index] ?? ["#7c3aed", "#a855f7"];
  }, [name]);

  return (
    <div
      className={`avatar avatar-${size}`}
      style={{
        background: imageUrl
          ? `url(${imageUrl}) center/cover`
          : `linear-gradient(135deg, ${gradientColors[0]}, ${gradientColors[1]})`,
      }}
    >
      {!imageUrl && (
        <span className="avatar-initials">
          {initials}
        </span>
      )}
    </div>
  );
}
