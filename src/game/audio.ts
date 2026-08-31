let ctx: AudioContext | null = null;

function ac() {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function unlockAudio() {
  ac();
}

function beep(freq: number, dur: number, type: OscillatorType, gain = 0.04) {
  const c = ac();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.value = gain;
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start();
  o.stop(c.currentTime + dur);
}

export const sfx = {
  hit: () => beep(180, 0.12, "square", 0.05),
  skill: () => {
    beep(420, 0.16, "sawtooth", 0.035);
    beep(640, 0.2, "triangle", 0.03);
  },
  loot: () => beep(880, 0.14, "triangle", 0.04),
  ui: () => beep(520, 0.06, "square", 0.02),
  hurt: () => beep(110, 0.18, "sawtooth", 0.05),
  win: () => {
    beep(523, 0.12, "triangle", 0.04);
    setTimeout(() => beep(659, 0.16, "triangle", 0.04), 90);
  },
  step: () => beep(90, 0.04, "square", 0.015),
};
