import Avatar from "./Avatar";

export default function MessageBubble({
  role,
  text,
  tier,
}: {
  role: "user" | "bot";
  text: string;
  tier?: number;
}) {
  if (role === "user") {
    return <div className="message user">{text}</div>;
  }

  let mood: "neutral" | "happy" | "teasing" | "blush" = "neutral";

  if (tier === 1) mood = "happy";
  if (tier === 2) mood = "teasing";
  if (tier === 3) mood = "blush";

  const style =
    (typeof window !== "undefined" &&
      (localStorage.getItem("visualStyle") as any)) ||
    "realistic";

  return (
    <div style={{ display: "flex", alignItems: "flex-start" }}>
      <Avatar style={style} mood={mood} />
      <div className="message bot">{text}</div>
    </div>
  );
}
