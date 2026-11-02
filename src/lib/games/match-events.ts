import "server-only";
import type { GameMatch } from "@/lib/domain";

export type MatchListener = (match: GameMatch) => void;

type Bus = {
  __gameMatchListeners?: Map<string, Set<MatchListener>>;
  __gameCoupleListeners?: Map<string, Set<MatchListener>>;
};

const bus = globalThis as unknown as Bus;

function matchListeners() {
  bus.__gameMatchListeners ??= new Map<string, Set<MatchListener>>();
  return bus.__gameMatchListeners;
}

function coupleListeners() {
  bus.__gameCoupleListeners ??= new Map<string, Set<MatchListener>>();
  return bus.__gameCoupleListeners;
}

function emit(store: Map<string, Set<MatchListener>>, key: string, match: GameMatch) {
  const listeners = store.get(key);
  if (!listeners?.size) return;
  for (const listener of [...listeners]) {
    try {
      listener(match);
    } catch {
      // A single closed connection must never stop the other player's update.
    }
  }
}

function subscribe(store: Map<string, Set<MatchListener>>, key: string, listener: MatchListener) {
  const listeners = store.get(key) ?? new Set<MatchListener>();
  listeners.add(listener);
  store.set(key, listeners);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) store.delete(key);
  };
}

/** Push a committed match state to every open player connection. */
export function publishMatchUpdate(match: GameMatch) {
  emit(matchListeners(), match.id, match);
  emit(coupleListeners(), match.coupleId, match);
}

export function subscribeMatchUpdates(matchId: string, listener: MatchListener) {
  return subscribe(matchListeners(), matchId, listener);
}

export function subscribeCoupleMatches(coupleId: string, listener: MatchListener) {
  return subscribe(coupleListeners(), coupleId, listener);
}
