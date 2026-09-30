import type { PlayerId } from "./constants";

export const TAUNTS = [
  "뭐하냐ㅋㅋ",
  "아니 그걸 왜 그렇게 해",
  "ㅋㅋㅋㅋㅋ",
  "야 집중해",
  "손 왜 저래",
  "이게 맞냐?",
  "아 개웃기네",
  "쫄았네 쫄았어",
  "너 지금 떨고 있지",
  "아깐 잘하더니ㅋㅋ",
  "점점 못해지는데?",
  "커피 준비해놔라",
  "야 이건 좀 아닌데",
  "진짜 못한다ㅋㅋ",
  "어어 잘한다 잘한다",
  "ㅋㅋㅋ 무슨 자신감이야",
  "괜찮아 아직 안 늦었다",
  "이러다 진짜 내가 사겠는데?",
  "한 번만 더 해봐ㅋㅋ",
  "아 이건 웃겼다",
];

export const WIN_ROASTS = [
  "내가 이길 줄 알았음",
  "이 정도는 해줘야지ㅋㅋ",
  "봤냐 이게 실력이다",
  "오늘은 내가 안 산다",
  "역시 나지ㅋㅋ",
  "깔끔했다",
  "이건 인정해줘야지",
  "아무튼 내가 이김",
];

export const LOSE_ROASTS = [
  "아... 커피 사야겠네",
  "오늘 커피는 내가 쏜다...",
  "이건 좀 억울한데",
  "다음 판은 다르다",
  "아니 이걸 지네",
  "됐고 한 판 더",
  "내가 왜 졌지?",
  "오늘 운이 없었다",
];

export function roastLine(index = Date.now()) {
  return TAUNTS[index % TAUNTS.length];
}

export function winLine(player: PlayerId) {
  return `P${player} ${WIN_ROASTS[player % WIN_ROASTS.length]}`;
}

export function loseLine(player: PlayerId) {
  return `P${player} ${LOSE_ROASTS[player % LOSE_ROASTS.length]}`;
}

export function lowestPlayerLine(player: PlayerId) {
  const lines = [
    "커피 준비해놔ㅋㅋ",
    "오늘은 네가 산다",
    "다음 판엔 잘해봐ㅋㅋ",
  ];
  return `P${player} ${lines[player - 1]}`;
}