import { useState } from "react";
import PartyFace from "./PartyFace";
import { podiumMood } from "../game/faces";
import { FLOOR_DB, LOUD_ROUNDS, PLAYERS, PLAYER_KEYS, type PlayerId, type Triple } from "../game/constants";
import { lowestPlayerLine, loseLine, roastLine, winLine } from "../game/taunts";
import { sound } from "../game/sound";
import type { AudioStatus } from "../hooks/useAudioMeter";

export type RoundResult = {
  target: number;
  measured: Triple;
  differences: Triple;
  winner: 0 | PlayerId;
};

type StartMood = "smirk" | "wild" | "panic" | "lose";

export function HomeBrand({ onHome }: { onHome: () => void }) {
  return <button type="button" className="loud-home-brand" onClick={onHome}><span>R</span> RASPBERRY OLYMPICS</button>;
}

function MicIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <rect x="22" y="7" width="20" height="34" rx="10" fill="currentColor" />
      <path d="M14 31c0 11 8 19 18 19s18-8 18-19M32 50v8M22 58h20" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg className="trophy-icon" viewBox="0 0 100 100" aria-hidden="true">
      <path d="M30 14h40v20c0 15-8 27-20 27S30 49 30 34V14Z" fill="#ffd33d" stroke="#17162f" strokeWidth="5" />
      <path d="M30 23H16v8c0 11 7 18 18 18M70 23h14v8c0 11-7 18-18 18M50 61v14M35 86h30M41 75h18" fill="none" stroke="#17162f" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m50 24 3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1 3-7Z" fill="#ff6b39" />
    </svg>
  );
}

function Bolt({ side }: { side: "left" | "right" }) {
  return <span className={`bolt bolt-${side}`} aria-hidden="true" />;
}

function Waveform({ level }: { level: number }) {
  const normalized = Math.max(0.1, (level - FLOOR_DB) / 60);
  return (
    <div className="waveform" aria-hidden="true">
      {Array.from({ length: 11 }, (_, index) => {
        const rhythm = 0.32 + Math.abs(Math.sin(index * 1.7)) * 0.68;
        return (
          <span
            key={index}
            style={{
              height: `${Math.max(12, normalized * rhythm * 88)}%`,
              animationDelay: `${index * -45}ms`,
            }}
            className="wave-bar"
          />
        );
      })}
    </div>
  );
}

function ScorePill({ scores }: { scores: Triple }) {
  return (
    <div className="score-pill score-triple">
      {PLAYERS.map((player, index) => (
        <span key={player}>P{player} <strong>{scores[index]}</strong></span>
      ))}
    </div>
  );
}

function AudioBadge({ status, onRetry }: { status: AudioStatus; onRetry?: () => void }) {
  const text =
    status === "ready" ? (onRetry ? "ROOM MIC READY · RETRY" : "ROOM MIC READY") :
    status === "requesting" ? "CONNECTING MIC..." :
    status === "unavailable" ? (onRetry ? "TAP TO RETRY MIC" : "BUTTON SHOUT MODE") :
    (onRetry ? "TAP TO ENABLE MIC" : "MIC CHECK ON START");
  if (onRetry) {
    return <button type="button" className={`audio-badge audio-badge-action status-${status}`} onClick={onRetry} title="마이크 다시 연결"><span />{text}</button>;
  }
  return <div className={`audio-badge status-${status}`}><span />{text}</div>;
}

export function StartScreen({
  audioStatus,
  onStart,
  onHome,
}: {
  audioStatus: AudioStatus;
  onStart: () => void;
  onHome: () => void;
}) {
  const [moods, setMoods] = useState<Record<PlayerId, StartMood>>({ 1: "smirk", 2: "smirk", 3: "smirk" });
  const moodCycle: StartMood[] = ["smirk", "wild", "panic", "lose"];

  const teasePlayer = (player: PlayerId) => {
    setMoods((current) => {
      const currentIndex = moodCycle.indexOf(current[player]);
      return { ...current, [player]: moodCycle[(currentIndex + 1) % moodCycle.length] };
    });
    sound.play("taunt");
  };

  return (
    <section className="screen start-screen">
      <div className="top-ribbon">
        <button type="button" className="loud-ribbon-brand" onClick={onHome}><span>R</span> RASPBERRY OLYMPICS</button>
        <AudioBadge status={audioStatus} />
        <span>3 PLAYERS · 1 ROUND · 1 COFFEE RUNNER</span>
      </div>
      <Bolt side="left" />
      <Bolt side="right" />
      <div className="start-content">
        <div className="kicker">THE ULTIMATE VOLUME BATTLE</div>
        <div className="logo-lockup">
          <MicIcon className="logo-mic" />
          <h1><span>LOUD</span><br />CHALLENGE</h1>
        </div>
        <p className="tagline">목표 데시벨에 가장 가깝게 소리 지르면 이긴다.<br className="mobile-break" /> 한 명씩 돌아가며, 핑계는 한 번만.</p>
        <button className="primary-button" onClick={onStart}>
          <span>GAME START</span><b aria-hidden="true">›</b>
        </button>
        <div className="player-preview player-preview-triple">
          {PLAYERS.map((player) => (
            <button type="button" className={`preview-player preview-player-button p${player}`} key={player} onClick={() => teasePlayer(player)} aria-label={`PLAYER ${player} 표정 바꾸기`}>
              <PartyFace player={player} mood={moods[player]} size={52} />
              <div><small>READY?</small><strong>PLAYER {player}</strong></div>
              <kbd>{PLAYER_KEYS[player].shout}</kbd>
            </button>
          ))}
        </div>
        <p className="keyboard-hint">P1 → P2 → P3 · 차례인 사람만 소리 내세요. 마이크 미연결 시 키 입력으로 대체합니다.</p>
      </div>
    </section>
  );
}

export function ReadyScreen({
  round,
  countdown,
  player,
}: {
  round: number;
  countdown: number;
  player: PlayerId;
}) {
  return (
    <section className="screen ready-screen">
      <div className="round-chip">ROUND {round} <span>/ {LOUD_ROUNDS}</span></div>
      <div className="secret-card">
        <div className="secret-icon"><MicIcon /></div>
        <p>PLAYER {player} 차례 · 목표 데시벨을 노리세요</p>
        <div className="secret-value">??? <span>dB</span></div>
        <div className="secret-line" />
        <small>{roastLine(round)}</small>
      </div>
      <div className="countdown-orbit" key={countdown}>
        <div className="orbit-ring" />
        <strong>{countdown}</strong>
      </div>
      <h2>GET READY!</h2>
      <p className="ready-help">PLAYER {player}만 소리 내세요. 나머지는 심사위원.</p>
    </section>
  );
}

function PlayerPanel({
  player,
  level,
  peak,
  score,
  turnStatus,
  audioStatus,
}: {
  player: PlayerId;
  level: number;
  peak: number;
  score: number;
  turnStatus: "active" | "done" | "waiting";
  audioStatus: AudioStatus;
}) {
  const gauge = Math.max(4, Math.min(100, ((level - FLOOR_DB) / 60) * 100));
  const mood = turnStatus === "active" && level >= 88 ? "wild" : turnStatus === "active" && level >= 68 ? "panic" : "smirk";
  const statusText = turnStatus === "active" ? (audioStatus === "ready" ? "MIC LIVE · 소리 내!" : "지금 네 차례") : turnStatus === "done" ? "측정 끝! 결과 대기" : "다음 순서 · 대기";
  return (
    <div className={`player-panel player-${player} ${turnStatus === "active" ? "active-player" : `turn-${turnStatus}`}`}>
      <div className="panel-heading">
        <PartyFace player={player} mood={mood} size={56} />
        <div>
          <small>{statusText}</small>
          <h2>PLAYER {player}</h2>
        </div>
        <b className="panel-score">{score}</b>
      </div>
      <div className="db-reading">
        <strong>{Math.round(level)}</strong>
        <span>dB</span>
      </div>
      <Waveform level={level} />
      <div className="gauge-shell">
        <div className="gauge-fill" style={{ width: `${gauge}%` }} />
      </div>
      <div className="gauge-labels"><span>45</span><b>PEAK {peak.toFixed(1)}</b><span>105</span></div>
      <div className="key-control">{turnStatus === "active" ? audioStatus === "ready" ? "마이크 자동 측정 · 소리 내세요" : <>키 모드 · HOLD <kbd>{PLAYER_KEYS[player].shout}</kbd></> : turnStatus === "done" ? "측정 완료" : "차례 기다리는 중"}</div>
    </div>
  );
}

export function GameScreen({
  round,
  levels,
  peaks,
  scores,
  time,
  audioStatus,
  activePlayer,
  onMicRetry,
}: {
  round: number;
  levels: Triple;
  peaks: Triple;
  scores: Triple;
  time: number;
  audioStatus: AudioStatus;
  activePlayer: PlayerId;
  onMicRetry: () => void;
}) {
  return (
    <section className="screen game-screen game-screen-triple">
      {PLAYERS.map((player) => (
        <PlayerPanel
          key={player}
          player={player}
          level={levels[player - 1]}
          peak={peaks[player - 1]}
          score={scores[player - 1]}
          turnStatus={player === activePlayer ? "active" : player < activePlayer ? "done" : "waiting"}
          audioStatus={audioStatus}
        />
      ))}
      <div className="game-hud">
        <div className="round-mini">ROUND {round}/{LOUD_ROUNDS} · PLAYER {activePlayer} TURN</div>
        <ScorePill scores={scores} />
        <div className="noise-callout">
          <small>TARGET LOCKED</small>
          ???<span>dB</span>
        </div>
        <div className="timer-box">
          <small>TIME LEFT</small>
          <strong>{Math.ceil(time).toString().padStart(2, "0")}</strong>
          <span>SEC</span>
          <div className="timer-track"><i style={{ width: `${(time / 5) * 100}%` }} /></div>
        </div>
        <AudioBadge status={audioStatus} onRetry={onMicRetry} />
      </div>
    </section>
  );
}

export function ResultScreen({
  round,
  result,
  scores,
  continueLabel,
  onContinue,
}: {
  round: number;
  result: RoundResult;
  scores: Triple;
  continueLabel: string;
  onContinue: () => void;
}) {
  const heading = result.winner === 0 ? "전원 비슷해서 무승부ㅋㅋ" : winLine(result.winner);
  const worstDifference = Math.max(...result.differences);
  const lowestPlayers = PLAYERS.filter((player) => Math.abs(result.differences[player - 1] - worstDifference) < 0.1);
  return (
    <section className="screen result-screen">
      <div className="result-header">
        <div><small>ROUND {round} COMPLETE</small><h1>ROUND RESULT</h1></div>
        <ScorePill scores={scores} />
      </div>
      <div className="target-reveal">
        <small>TARGET</small>
        <strong>{result.target}</strong><span>dB</span>
      </div>
      <div className="result-grid result-grid-triple">
        {PLAYERS.map((player) => {
          const index = player - 1;
          const isWinner = result.winner === player;
          const isLowest = lowestPlayers.includes(player);
          return (
            <div className={`result-player result-p${player} ${isWinner ? "winner" : ""} ${isLowest ? "lowest" : ""}`} key={player}>
              {isWinner && <div className="winner-ribbon">+1 POINT</div>}
              {isLowest && <div className="lowest-ribbon">최하위 · 놀림 대상</div>}
              <PartyFace player={player} mood={isWinner ? "win" : result.differences[index] > 10 ? "lose" : "sweat"} size={64} />
              <div className="result-player-title"><span>{player}</span> PLAYER {player}</div>
              <div className="result-measurement">
                <strong>{result.measured[index].toFixed(1)}</strong><span>dB</span>
              </div>
              <div className="difference"><small>OFF TARGET BY</small><b>{result.differences[index].toFixed(1)} dB</b></div>
            </div>
          );
        })}
      </div>
      <h2 className={`winner-announcement winner-${result.winner}`}>{heading}</h2>
      <p className="result-roast">
        {lowestPlayers.map((player) => <span key={player}>{lowestPlayerLine(player)}</span>)}
      </p>
      <button className="secondary-button" onClick={onContinue}>
        {continueLabel} <span>›</span>
      </button>
    </section>
  );
}

export function FinalScreen({
  scores,
  onAgain,
  onHome,
  onNext,
}: {
  scores: Triple;
  onAgain: () => void;
  onHome: () => void;
  onNext?: () => void;
}) {
  const ranking = [...PLAYERS].sort((a, b) => scores[b - 1] - scores[a - 1]);
  const top = ranking[0];
  const coffee = ranking[2];
  const tied = scores[0] === scores[1] && scores[1] === scores[2];
  return (
    <section className="screen final-screen">
      <div className="confetti" aria-hidden="true">
        {Array.from({ length: 22 }, (_, i) => <i key={i} style={{ "--i": i } as React.CSSProperties} />)}
      </div>
      <div className="final-kicker">{LOUD_ROUNDS} ROUNDS COMPLETE</div>
      <TrophyIcon />
      <h1>FINAL RESULT</h1>
      <div className={`champion-text champion-${tied ? 0 : top}`}>
        {tied ? "전원 동점, 커피는 가위바위보" : `PLAYER ${top} WIN!`}
      </div>
      <div className="final-scoreboard final-scoreboard-triple">
        {ranking.map((player, place) => (
          <div className={`final-player final-p${player} ${place === 0 ? "champion" : ""}`} key={player}>
            <PartyFace player={player} mood={podiumMood(place + 1)} size={58} />
            <small>PLAYER {player}</small>
            <strong>{scores[player - 1]}</strong>
            <span>{place === 0 ? "KING" : place === 2 ? "COFFEE" : "2ND"}</span>
          </div>
        ))}
      </div>
      {!tied && <p className="coffee-taunt">PLAYER {coffee} {loseLine(coffee)}</p>}
      <div className="final-actions">
        {onNext ? (
          <button className="primary-button compact" onClick={onNext}>다음 종목 <b>›</b></button>
        ) : (
          <button className="primary-button compact" onClick={onAgain}>PLAY AGAIN <b>↻</b></button>
        )}
        <button className="home-button" onClick={onHome}>HOME</button>
      </div>
    </section>
  );
}
