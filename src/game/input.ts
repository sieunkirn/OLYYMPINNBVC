import { useEffect, useRef } from "react";
import type { PlayerId } from "./constants";

export type InputEvent = { key: string; pressed: boolean; repeat: boolean };
export type InputListener = (event: InputEvent) => void;

export interface InputAdapter {
  subscribe(listener: InputListener): () => void;
}

export class KeyboardInputAdapter implements InputAdapter {
  subscribe(listener: InputListener) {
    const down = (event: KeyboardEvent) => listener({ key: event.key.toLowerCase(), pressed: true, repeat: event.repeat });
    const up = (event: KeyboardEvent) => listener({ key: event.key.toLowerCase(), pressed: false, repeat: false });
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }
}

let activeInputAdapter: InputAdapter = new KeyboardInputAdapter();

export function setInputAdapter(adapter: InputAdapter) {
  activeInputAdapter = adapter;
}

/** Replace with an adapter that emits the same logical keys from GPIO or a joystick. */

export const SHOUT_KEYS: Record<string, PlayerId> = { a: 1, j: 2, l: 3 };

export function useHeldShoutKeys(enabled: boolean) {
  const held = useRef(new Set<PlayerId>());
  useEffect(() => {
    const unsubscribe = activeInputAdapter.subscribe(({ key, pressed }) => {
      const player = SHOUT_KEYS[key];
      if (!player) return;
      if (pressed && enabled) held.current.add(player);
      else held.current.delete(player);
    });
    return () => {
      unsubscribe();
      held.current.clear();
    };
  }, [enabled]);
  return held;
}

