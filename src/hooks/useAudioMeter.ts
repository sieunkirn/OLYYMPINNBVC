import { useCallback, useEffect, useRef, useState } from "react";

export type AudioStatus = "idle" | "requesting" | "ready" | "unavailable";

const MIN_DB = 45;
const MAX_DB = 105;

function readDecibels(analyser: AnalyserNode, buffer: Float32Array<ArrayBuffer>) {
  analyser.getFloatTimeDomainData(buffer);
  let sum = 0;
  for (const sample of buffer) sum += sample * sample;
  const rms = Math.sqrt(sum / buffer.length);
  if (rms < 0.00001) return MIN_DB;
  return Math.min(MAX_DB, Math.max(MIN_DB, 20 * Math.log10(rms) + 110));
}

export function useAudioMeter() {
  const [level, setLevel] = useState(MIN_DB);
  const [status, setStatus] = useState<AudioStatus>("idle");
  const contextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const startPromiseRef = useRef<Promise<boolean> | null>(null);
  const generationRef = useRef(0);

  const stop = useCallback(() => {
    generationRef.current += 1;
    startPromiseRef.current = null;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    contextRef.current?.close().catch(() => undefined);
    contextRef.current = null;
    setLevel(MIN_DB);
    setStatus("idle");
  }, []);

  const start = useCallback(async () => {
    if (streamRef.current?.getAudioTracks().some((track) => track.readyState === "live")) return true;
    if (startPromiseRef.current) return startPromiseRef.current;
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unavailable");
      return false;
    }
    const generation = generationRef.current;
    const request = (async () => {
      let stream: MediaStream | null = null;
      let context: AudioContext | null = null;
      setStatus("requesting");
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        });
        context = new window.AudioContext();
        await context.resume();
        if (generation !== generationRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          await context.close();
          return false;
        }
        const source = context.createMediaStreamSource(stream);
        const analyser = context.createAnalyser();
        const silentOutput = context.createGain();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.58;
        silentOutput.gain.value = 0;
        source.connect(analyser);
        analyser.connect(silentOutput);
        silentOutput.connect(context.destination);
        const buffer = new Float32Array(analyser.fftSize) as Float32Array<ArrayBuffer>;
        let smooth = MIN_DB;
        const update = () => {
          const raw = readDecibels(analyser, buffer);
          smooth = smooth * 0.58 + raw * 0.42;
          setLevel(smooth);
          frameRef.current = requestAnimationFrame(update);
        };
        streamRef.current = stream;
        contextRef.current = context;
        stream.getAudioTracks().forEach((track) => {
          track.addEventListener("ended", () => {
            if (streamRef.current === stream) setStatus("unavailable");
          }, { once: true });
        });
        setStatus("ready");
        update();
        return true;
      } catch {
        stream?.getTracks().forEach((track) => track.stop());
        context?.close().catch(() => undefined);
        if (generation === generationRef.current) setStatus("unavailable");
        return false;
      }
    })();
    startPromiseRef.current = request;
    try {
      return await request;
    } finally {
      if (startPromiseRef.current === request) startPromiseRef.current = null;
    }
  }, []);

  useEffect(() => stop, [stop]);
  return { level, status, start, stop };
}
