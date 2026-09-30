export type PlayerId = 1 | 2 | 3;
export type Ranking = PlayerId[];

export const PLAYERS: PlayerId[] = [1, 2, 3];
export const PLAYER_COUNT = 3;
export const LOUD_ROUNDS = 1;
export const FLOOR_DB = 45;
export const CEIL_DB = 105;

export const PLAYER_COLORS = ["coral", "blue", "green"] as const;
export const PLAYER_KEYS = {
  1: { shout: "A" },
  2: { shout: "J" },
  3: { shout: "L" },
} as const;

export type Triple = [number, number, number];
export const ZERO_TRIPLE: Triple = [0, 0, 0];
export const FLOOR_TRIPLE: Triple = [FLOOR_DB, FLOOR_DB, FLOOR_DB];
