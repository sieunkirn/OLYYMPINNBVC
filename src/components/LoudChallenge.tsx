import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FinalScreen,
  GameScreen,
  ReadyScreen,
  ResultScreen,
  StartScreen,
  HomeBrand,
  type RoundResult,
} from "./GameScreens";
import { FLOOR_DB, FLOOR_TRIPLE, LOUD_ROUNDS, PLAYERS, type PlayerId, type Ranking, type Triple } from "../game/constants";
import { useHeldShoutKeys } from "../game/input";
import { sound } from "../game/sound";
import { useAudioMeter } from "../hooks/useAudioMeter";

type Phase = "start" | "ready" | "game" | "result" | "final";

const ROUND_TICKS = 50;
const makeTarget = () => Math.floor(Math.random() * 26) + 68;

export default function LoudChallenge({
  onHome,
  onResult,
  onNext,
  autoStart = false,
}: {
  onHome: () => void;
  onResult?: (ranking: Ranking) => void;
  onNext?: () => void;
  autoStart?: boolean;
}) {
  const [phase, setPhase] = useState<Phase>("start");
  const [round, setRound] = useState(1);
  const [activePlayer, setActivePlayer] = useState<PlayerId>(1);
  const [target, setTarget] = useState(makeTarget);
  const [countdown, setCountdown] = useState(3);
  const [timeTicks, setTimeTicks] = useState(ROUND_TICKS);
  const [scores, setScores] = useState<Triple>([0, 0, 0]);
  const [peaks, setPeaks] = useState<Triple>(FLOOR_TRIPLE);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [simulated, setSimulated] = useState<Triple>(FLOOR_TRIPLE);
  const peakRef = useRef<Triple>(FLOOR_TRIPLE);
  const phaseRef = useRef<Phase>("start");
  const scoresRef = useRef<Triple>([0, 0, 0]);
  const held = useHeldShoutKeys(true);
  const { level: micLevel, status, start, stop } = useAudioMeter();

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    scoresRef.current = scores;
  }, [scores]);

  const liveLevels = useMemo(() => PLAYERS.map((player) => {
    const index = player - 1;
    if (player < activePlayer) return peaks[index];
    if (player > activePlayer) return FLOOR_DB;
    if (status === "ready") return micLevel;
    return held.current.has(player) ? simulated[index] : FLOOR_DB;
  }) as Triple, [activePlayer, held, micLevel, peaks, simulated, status]);

  useEffect(() => {
    if (phase !== "game") return;
    const index = activePlayer - 1;
    const peak = Math.max(peakRef.current[index], liveLevels[index]);
    if (peak <= peakRef.current[index]) return;
    const next = [...peakRef.current] as Triple;
    next[index] = peak;
    peakRef.current = next;
    setPeaks(next);
  }, [activePlayer, liveLevels, phase]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSimulated((current) => {
        const active = phaseRef.current === "game";
        return PLAYERS.map((player, index) => {
          if (active && status !== "ready" && player === activePlayer && held.current.has(player)) return 70 + Math.random() * 32;
          return Math.max(FLOOR_DB, current[index] - 6);
        }) as Triple;
      });
    }, 90);
    return () => window.clearInterval(id);
  }, [activePlayer, held, status]);

  const finishRound = useCallback(() => {
    const measured = peakRef.current.map((value) => Math.round(value * 10) / 10) as Triple;
    peakRef.current = measured;
    setPeaks(measured);
    if (activePlayer < PLAYERS.length) {
      sound.stopBgm();
      sound.play("taunt");
      setActivePlayer((activePlayer + 1) as PlayerId);
      setSimulated([...FLOOR_TRIPLE]);
      setCountdown(3);
      setPhase("ready");
      return;
    }
    const differences = measured.map((value) => Math.round(Math.abs(value - target) * 10) / 10) as Triple;
    const best = Math.min(...differences);
    const winners = PLAYERS.filter((_, index) => Math.abs(differences[index] - best) < 0.5);
    const winner = winners.length === 1 ? winners[0] : 0;
    if (winner) {
      setScores((previous) => {
        const next = [...previous] as Triple;
        next[winner - 1] += 1;
        scoresRef.current = next;
        return next;
      });
      sound.play("round-win");
    } else {
      sound.play("round-lose");
    }
    onResult?.([...PLAYERS].sort((first, second) => differences[first - 1] - differences[second - 1]));
    setResult({ target, measured, differences, winner });
    sound.stopBgm();
    setPhase("result");
  }, [activePlayer, onResult, target]);

  useEffect(() => {
    if (phase !== "ready") return;
    sound.play("countdown");
    const id = window.setTimeout(() => {
      if (countdown > 1) {
        setCountdown((value) => value - 1);
      } else {
        const nextPeaks = [...peakRef.current] as Triple;
        nextPeaks[activePlayer - 1] = FLOOR_DB;
        peakRef.current = nextPeaks;
        setPeaks(nextPeaks);
        setSimulated([...FLOOR_TRIPLE]);
        setTimeTicks(ROUND_TICKS);
        sound.play("go");
        setPhase("game");
      }
    }, 1000);
    return () => window.clearTimeout(id);
  }, [activePlayer, countdown, phase]);

  useEffect(() => {
    if (phase !== "game") return;
    const id = window.setInterval(() => {
      setTimeTicks((value) => {
        if (value <= 1) {
          window.clearInterval(id);
          window.setTimeout(finishRound, 0);
          return 0;
        }
        return value - 1;
      });
    }, 100);
    return () => window.clearInterval(id);
  }, [finishRound, phase]);

  const startRound = useCallback((roundNumber: number) => {
    setRound(roundNumber);
    setActivePlayer(1);
    setTarget(makeTarget());
    peakRef.current = [...FLOOR_TRIPLE];
    setPeaks([...FLOOR_TRIPLE]);
    setCountdown(3);
    setResult(null);
    setPhase("ready");
  }, []);

  const beginGame = useCallback(async () => {
    await sound.unlock();
    await start();
    setScores([0, 0, 0]);
    startRound(1);
  }, [start, startRound]);

  useEffect(() => {
    if (!autoStart) return;
    const timer = window.setTimeout(() => void beginGame(), 0);
    return () => window.clearTimeout(timer);
  }, [autoStart, beginGame]);

  const continueGame = () => {
    if (round >= LOUD_ROUNDS) {
      sound.play("champion");
      if (onNext) onNext();
      else setPhase("final");
    } else {
      startRound(round + 1);
    }
  };

  const playAgain = () => {
    setScores([0, 0, 0]);
    startRound(1);
  };

  const goHome = () => {
    sound.stopBgm();
    stop();
    setScores([0, 0, 0]);
    setRound(1);
    setPhase("start");
    onHome();
  };

  const retryMicrophone = useCallback(() => {
    stop();
    void start();
  }, [start, stop]);

  return (
    <main className="app-shell">
      {phase !== "start" && <HomeBrand onHome={goHome} />}
      {phase === "start" && <StartScreen audioStatus={status} onStart={beginGame} onHome={goHome} />}
      {phase === "ready" && <ReadyScreen round={round} countdown={countdown} player={activePlayer} />}
      {phase === "game" && (
        <GameScreen
          round={round}
          levels={liveLevels}
          peaks={peaks}
          scores={scores}
          time={timeTicks / 10}
          audioStatus={status}
          activePlayer={activePlayer}
          onMicRetry={retryMicrophone}
        />
      )}
      {phase === "result" && result && (
        <ResultScreen
          round={round}
          result={result}
          scores={scores}
          continueLabel={round >= LOUD_ROUNDS ? (onNext ? "다음 종목" : "FINAL RESULT") : "NEXT ROUND"}
          onContinue={continueGame}
        />
      )}
      {phase === "final" && (
        <FinalScreen scores={scores} onAgain={playAgain} onHome={goHome} onNext={onNext} />
      )}
    </main>
  );
}
