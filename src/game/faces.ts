import type { PlayerId } from "./constants";

export type FaceMood = "smug" | "smirk" | "sweat" | "panic" | "wild" | "win" | "lose";

export function balanceMood(tilt: number, alive: boolean): FaceMood {
  if (!alive) return "lose";
  const danger = Math.abs(tilt);
  if (danger >= 88) return "wild";
  if (danger >= 70) return "panic";
  if (danger >= 42) return "sweat";
  return "smirk";
}

export function loudMood(diff: number, winning: boolean): FaceMood {
  if (winning && diff < 3) return "win";
  if (diff > 18) return "panic";
  if (diff > 8) return "sweat";
  return "smirk";
}

export function podiumMood(place: number): FaceMood {
  if (place === 1) return "win";
  if (place === 3) return "lose";
  return "smirk";
}

export function playerAccent(player: PlayerId) {
  return ["#ff674f", "#4665ff", "#8ad62a"][player - 1];
}
