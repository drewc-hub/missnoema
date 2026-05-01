"use client";

export default function Avatar({
  style,
  mood,
}: {
  style: "realistic" | "anime";
  mood: "neutral" | "happy" | "teasing" | "blush";
}) {
  const src = `/avatars/${style}/${mood}.png`;

  return (
    <img
      src={src}
      alt="avatar"
      style={{
        width: 40,
        height: 40,
        borderRadius: "50%",
        objectFit: "cover",
        marginRight: 8,
        transition: "transform 0.2s",
      }}
    />
  );
}
