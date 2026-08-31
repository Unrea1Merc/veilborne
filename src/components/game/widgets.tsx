import { useRef } from "react";
import { cn } from "@/lib/utils";
import { CLOAKS } from "@/game/data";
import type { Dir } from "@/game/types";
import { useGame } from "@/game/store";

export function Pixel({
  src,
  alt = "",
  className,
  cloak,
  size,
}: {
  src: string;
  alt?: string;
  className?: string;
  cloak?: number;
  size?: number;
}) {
  const hue = cloak != null ? (CLOAKS[cloak]?.hue ?? 0) : 0;
  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      className={cn("vb-px select-none", className)}
      style={{
        imageRendering: "pixelated",
        filter: cloak != null ? `hue-rotate(${hue}deg)` : undefined,
        width: size,
        height: size,
      }}
    />
  );
}

export function playerFrame(dir: Dir, frame: number) {
  const f = (Math.floor(frame) % 4) + 1;
  return `/sprites/player/${dir}-${f}.png`;
}

export function StatBar({
  value,
  max,
  tone,
  label,
}: {
  value: number;
  max: number;
  tone: "hp" | "mana" | "xp";
  label?: string;
}) {
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  const fill = tone === "hp" ? "bg-hp" : tone === "mana" ? "bg-mana" : "bg-gold";
  return (
    <div className="min-w-0">
      {label ? (
        <div className="mb-0.5 flex justify-between font-display text-[10px] tracking-wide text-muted uppercase">
          <span>{label}</span>
          <span className="tabular-nums text-fg">
            {Math.max(0, Math.ceil(value))}/{max}
          </span>
        </div>
      ) : null}
      <div className="h-2 overflow-hidden rounded-sm bg-raised ring-1 ring-border">
        <div className={cn("h-full rounded-sm transition-[width] duration-150", fill)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Stick() {
  const setStick = useGame((s) => s.setStick);
  const origin = useRef<{ x: number; y: number; id: number } | null>(null);
  const knob = useRef<HTMLDivElement>(null);

  const release = (id?: number) => {
    if (id != null && origin.current && origin.current.id !== id) return;
    origin.current = null;
    setStick(0, 0);
    document.body.classList.remove("vb-walking");
    if (knob.current) knob.current.style.transform = "translate(-50%, -50%)";
  };

  const apply = (ox: number, oy: number, clientX: number, clientY: number) => {
    const dx = clientX - ox;
    const dy = clientY - oy;
    const max = 46;
    const mag = Math.hypot(dx, dy);
    const dead = 10;
    if (mag < dead) {
      setStick(0, 0);
      if (knob.current) knob.current.style.transform = "translate(-50%, -50%)";
      return;
    }
    const clamped = Math.min(mag, max);
    const ux = dx / mag;
    const uy = dy / mag;
    const t = (clamped - dead) / (max - dead);
    setStick(ux * t, uy * t);
    if (knob.current) {
      knob.current.style.transform = `translate(calc(-50% + ${ux * clamped}px), calc(-50% + ${uy * clamped}px))`;
    }
  };

  return (
    <div
      className="pointer-events-auto relative size-[7.5rem] touch-none rounded-full bg-surface/85 ring-1 ring-border select-none"
      style={{ touchAction: "none" }}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        document.body.classList.add("vb-walking");
        const r = e.currentTarget.getBoundingClientRect();
        origin.current = { x: r.left + r.width / 2, y: r.top + r.height / 2, id: e.pointerId };
        apply(origin.current.x, origin.current.y, e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (!origin.current || origin.current.id !== e.pointerId) return;
        e.preventDefault();
        apply(origin.current.x, origin.current.y, e.clientX, e.clientY);
      }}
      onPointerUp={(e) => {
        e.preventDefault();
        release(e.pointerId);
      }}
      onPointerCancel={(e) => release(e.pointerId)}
      onLostPointerCapture={() => release()}
      aria-label="Walk"
    >
      <div className="pointer-events-none absolute inset-2.5 rounded-full ring-1 ring-border/80" />
      <div
        ref={knob}
        className="pointer-events-none absolute top-1/2 left-1/2 size-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent shadow-sm"
      />
    </div>
  );
}

export function Toasts() {
  const toasts = useGame((s) => s.toasts);
  return (
    <div className="pointer-events-none absolute top-[calc(var(--safe-top)+5.5rem)] right-3 z-40 flex w-[min(100%-1.5rem,280px)] flex-col items-end gap-1.5">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="rounded-md bg-surface/95 px-3 py-2 text-sm text-fg ring-1 ring-border backdrop-blur-sm"
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}

export function PanelFrame({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="vb-sheet pointer-events-auto">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="font-display text-base tracking-wide text-fg">{title}</h2>
        <button
          type="button"
          className="flex size-10 items-center justify-center rounded-md text-muted ring-1 ring-border hover:text-fg"
          onClick={onClose}
          aria-label="Close"
        >
          <span className="text-lg leading-none">×</span>
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">{children}</div>
    </div>
  );
}

export function SoftBtn({
  children,
  onClick,
  primary,
  danger,
  disabled,
  className,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  primary?: boolean;
  danger?: boolean;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-md px-3.5 font-display text-sm tracking-wide transition-transform duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40",
        primary
          ? "bg-accent text-accent-fg"
          : danger
            ? "bg-hp text-fg"
            : "bg-raised text-fg ring-1 ring-border",
        className,
      )}
    >
      {children}
    </button>
  );
}
