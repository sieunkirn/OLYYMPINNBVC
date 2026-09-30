import type { FaceMood } from "../game/faces";
import { playerAccent } from "../game/faces";
import type { PlayerId } from "../game/constants";

export default function PartyFace({
  player,
  mood,
  size = 72,
  label,
  characterEmoji,
}: {
  player: PlayerId;
  mood: FaceMood;
  size?: number;
  label?: string;
  characterEmoji?: string;
}) {
  const skin = playerAccent(player);

  const expression =
    mood === "lose"
      ? ["🤡", "😵‍💫", "😭"][player - 1]
      : {
          smug: "😑",
          smirk: "😬",
          sweat: "😫",
          panic: "😩",
          wild: "🤪",
          win: "🥴",
          lose: "😩",
        }[mood];

  const emoji = characterEmoji || expression;

  return (
    <div
      className={`party-face mood-${mood}${characterEmoji ? " party-face-character" : ""}`}
      style={
        {
          width: size,
          height: size,
          "--skin": skin,
          "--face-size": `${size}px`,
        } as React.CSSProperties
      }
      aria-hidden="true"
    >
      <span
        className="party-emoji"
        style={{
          fontFamily:
            '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "Twemoji Mozilla", sans-serif',
          fontSize: `${size * (characterEmoji ? 0.86 : 0.72)}px`,
          lineHeight: 1,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          fontStyle: "normal",
          fontWeight: 400,
          fontSynthesis: "none",
          fontVariantEmoji: "emoji",
          textRendering: "auto",
        }}
      >
        {emoji}
      </span>

      {label && <b className="face-label">{label}</b>}
    </div>
  );
}