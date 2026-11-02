type SfxKind = "hit" | "miss" | "star" | "win" | "lose";

let ctx: AudioContext | null = null;
let muted = false;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function beep(
  node: AudioContext,
  freq: number,
  type: OscillatorType,
  when: number,
  dur: number,
  volume = 0.07
) {
  const osc = node.createOscillator();
  const gain = node.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, when);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(volume, when + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  osc.connect(gain).connect(node.destination);
  osc.start(when);
  osc.stop(when + dur + 0.03);
}

export function setGameSfxMuted(next: boolean) {
  muted = next;
}

export function isGameSfxMuted() {
  return muted;
}

export function playGameSfx(kind: SfxKind) {
  if (muted) return;
  const node = audio();
  if (!node) return;
  const t = node.currentTime;

  if (kind === "hit") {
    beep(node, 784, "sine", t, 0.09, 0.06);
    beep(node, 1175, "sine", t + 0.07, 0.12, 0.07);
    return;
  }
  if (kind === "star") {
    beep(node, 1319, "triangle", t, 0.08, 0.05);
    beep(node, 1760, "sine", t + 0.06, 0.14, 0.06);
    return;
  }
  if (kind === "miss") {
    beep(node, 196, "square", t, 0.16, 0.05);
    beep(node, 147, "triangle", t + 0.04, 0.18, 0.04);
    return;
  }
  if (kind === "win") {
    [523, 659, 784, 1047].forEach((freq, i) => beep(node, freq, "sine", t + i * 0.09, 0.16, 0.07));
    return;
  }
  beep(node, 330, "sawtooth", t, 0.18, 0.04);
  beep(node, 247, "sawtooth", t + 0.14, 0.2, 0.04);
  beep(node, 165, "triangle", t + 0.3, 0.28, 0.05);
}
