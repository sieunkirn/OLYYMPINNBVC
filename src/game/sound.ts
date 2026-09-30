/**
 * Named sound cues. Web build synthesizes them.
 * Raspberry Pi / Pygame: load the same cue names from assets/sfx/{cue}.wav
 * and assets/bgm/{game}.wav.
 */
export type SoundCue =
  | "countdown"
  | "go"
  | "miss"
  | "correct"
  | "danger"
  | "fall"
  | "round-win"
  | "round-lose"
  | "champion"
  | "drumroll"
  | "reveal"
  | "taunt"
  | "applause"
  | "buzz";

export type BgmId = "menu" | "loud" | "balance" | "food";
export type SoundAssets = {
  cues?: Partial<Record<SoundCue, string>>;
  bgm?: Partial<Record<BgmId, string>>;
};

type OscType = OscillatorType;

let context: AudioContext | null = null;
let bgmNodes: { oscillators: OscillatorNode[]; gain: GainNode; timer: number } | null = null;
let bgmAudio: HTMLAudioElement | null = null;
let bgmGeneration = 0;
let requestedBgm: BgmId | null = null;
let soundAssets: SoundAssets = {};
let muted = false;
const cueAudio = new Set<HTMLAudioElement>();
const lastPlayed: Partial<Record<SoundCue, number>> = {};

export function configureSoundAssets(assets: SoundAssets) {
  soundAssets = assets;
}

function ctx() {
  if (!context) {
    const AudioContextClass = window.AudioContext;
    context = new AudioContextClass();
  }
  return context;
}

async function resume() {
  const audio = ctx();
  if (audio.state === "suspended") await audio.resume();
  return audio;
}

function beep(frequency: number, duration: number, type: OscType, volume = 0.08, slide = 0) {
  const audio = ctx();
  const now = audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, now);
  if (slide) osc.frequency.linearRampToValueAtTime(Math.max(40, frequency + slide), now + duration);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function noiseBurst(duration: number, volume = 0.04) {
  const audio = ctx();
  const length = Math.floor(audio.sampleRate * duration);
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const source = audio.createBufferSource();
  const filter = audio.createBiquadFilter();
  const gain = audio.createGain();
  source.buffer = buffer;
  filter.type = "bandpass";
  filter.frequency.value = 900;
  gain.gain.value = volume;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(audio.destination);
  source.start();
}

const CUES: Record<SoundCue, () => void> = {
  countdown: () => beep(520, 0.12, "square", 0.06),
  go: () => {
    beep(220, 0.12, "square", 0.07);
    beep(440, 0.16, "square", 0.07);
    beep(880, 0.2, "sawtooth", 0.05);
  },
  miss: () => {
    beep(430, 0.16, "triangle", 0.07, -310);
    window.setTimeout(() => beep(120, 0.1, "square", 0.06, 45), 95);
    noiseBurst(0.1, 0.025);
  },
  correct: () => {
    beep(660, 0.08, "square", 0.06);
    beep(990, 0.12, "square", 0.05);
  },
  danger: () => beep(140, 0.09, "sawtooth", 0.05, 40),
  fall: () => {
    beep(760, 0.1, "square", 0.06, -350);
    window.setTimeout(() => beep(300, 0.4, "triangle", 0.08, -250), 85);
    noiseBurst(0.18, 0.04);
  },
  "round-win": () => {
    [523, 659, 784, 1046].forEach((note, index) => {
      window.setTimeout(() => beep(note, 0.12, "square", 0.06), index * 80);
    });
  },
  "round-lose": () => {
    [392, 349, 294, 220].forEach((note, index) => {
      window.setTimeout(() => beep(note, 0.2, index === 3 ? "square" : "triangle", 0.07, -25), index * 145);
    });
    window.setTimeout(() => beep(110, 0.24, "sawtooth", 0.035, -35), 580);
  },
  champion: () => {
    [392, 523, 659, 784, 659, 1046, 330].forEach((note, index) => {
      window.setTimeout(() => beep(note, index === 6 ? 0.3 : 0.11, "square", 0.055, index === 6 ? -90 : 0), index * 90);
    });
  },
  drumroll: () => {
    noiseBurst(0.09, 0.045);
    beep(92, 0.075, "triangle", 0.035, -18);
  },
  reveal: () => {
    noiseBurst(0.28, 0.06);
    beep(62, 0.62, "sine", 0.11, -24);
    beep(124, 0.34, "triangle", 0.07, -38);
  },
  taunt: () => beep(700, 0.05, "square", 0.04, 200),
  applause: () => {
    for (let clap = 0; clap < 18; clap += 1) {
      window.setTimeout(() => noiseBurst(0.055, 0.025 + Math.random() * 0.025), clap * 70 + Math.random() * 45);
    }
    beep(260, 0.55, "sawtooth", 0.018, 350);
    beep(320, 0.46, "triangle", 0.016, 230);
  },
  buzz: () => beep(180, 0.05, "square", 0.05),
};

const BGM_RIFFS: Record<BgmId, number[]> = {
  menu: [262, 370, 392, 330, 233, 349, 262, 185],
  loud: [196, 262, 220, 311, 196, 349, 247, 175],
  balance: [220, 247, 185, 262, 174, 233, 147, 196],
  food: [330, 392, 349, 466, 294, 349, 262, 370],
};

export const sound = {
  async unlock() {
    await resume();
  },
  mute() {
    muted = true;
    this.stopBgm();
    cueAudio.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
    cueAudio.clear();
  },
  play(cue: SoundCue) {
    if (muted) return;
    const now = performance.now();
    const cooldown = cue === "danger" ? 500 : 90;
    if ((lastPlayed[cue] ?? 0) + cooldown > now) return;
    lastPlayed[cue] = now;
    const source = soundAssets.cues?.[cue];
    if (source) {
      const audio = new Audio(source);
      audio.volume = 0.8;
      cueAudio.add(audio);
      audio.addEventListener("ended", () => cueAudio.delete(audio), { once: true });
      void audio.play().catch(() => {
        cueAudio.delete(audio);
        if (!muted) void resume().then(() => { if (!muted) CUES[cue](); });
      });
      return;
    }
    void resume().then(() => {
      if (!muted) CUES[cue]();
    });
  },
  startBgm(id: BgmId) {
    if (muted || requestedBgm === id) return;
    this.stopBgm();
    const generation = bgmGeneration;
    requestedBgm = id;
    const source = soundAssets.bgm?.[id];
    if (source) {
      const audio = new Audio(source);
      audio.loop = true;
      audio.volume = 0.22;
      bgmAudio = audio;
      void audio.play().then(() => {
        if (generation !== bgmGeneration || bgmAudio !== audio || muted) {
          audio.pause();
          audio.currentTime = 0;
        }
      }).catch(() => {
        if (generation === bgmGeneration && bgmAudio === audio && !muted) {
          bgmAudio = null;
          void startSynthBgm(id, generation);
        }
      });
      return;
    }
    void startSynthBgm(id, generation);
  },
  stopBgm() {
    bgmGeneration += 1;
    requestedBgm = null;
    if (bgmAudio) {
      bgmAudio.pause();
      try {
        bgmAudio.currentTime = 0;
      } catch {
        // The media source may not have loaded enough to seek yet.
      }
      bgmAudio = null;
    }
    stopSynthBgm();
  },
};

async function startSynthBgm(id: BgmId, generation: number) {
  const audio = await resume();
  if (muted || generation !== bgmGeneration || requestedBgm !== id) return;
  const riff = BGM_RIFFS[id];
  let step = 0;
  const melody = audio.createOscillator();
  const bass = audio.createOscillator();
  const gain = audio.createGain();
  melody.type = "triangle";
  bass.type = "sine";
  const now = audio.currentTime;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.024, now + 0.3);
  melody.connect(gain);
  bass.connect(gain);
  gain.connect(audio.destination);
  melody.start(now);
  bass.start(now);
  const tick = () => {
    if (generation !== bgmGeneration || requestedBgm !== id) return;
    const note = riff[step % riff.length];
    const tickTime = audio.currentTime;
    melody.frequency.setTargetAtTime(note, tickTime, 0.025);
    bass.frequency.setTargetAtTime(note / 2, tickTime, 0.04);
    step += 1;
  };
  tick();
  const timer = window.setInterval(tick, 260);
  bgmNodes = { oscillators: [melody, bass], gain, timer };
}

function stopSynthBgm() {
  if (!bgmNodes) return;
  const track = bgmNodes;
  window.clearInterval(track.timer);
  bgmNodes = null;
  const now = context?.currentTime ?? 0;
  track.gain.gain.cancelScheduledValues(now);
  track.gain.gain.setValueAtTime(track.gain.gain.value, now);
  track.gain.gain.linearRampToValueAtTime(0.0001, now + 0.06);
  track.oscillators.forEach((oscillator) => {
    oscillator.onended = () => oscillator.disconnect();
    try {
      oscillator.stop(now + 0.07);
    } catch {
      oscillator.disconnect();
    }
  });
  window.setTimeout(() => track.gain.disconnect(), 100);
}
