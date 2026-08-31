import { Backpack, Hammer, Home, MapPin, ScrollText, Shield, Store, UserPlus, Users } from "lucide-react";
import { useGame } from "@/game/store";
import { nearestCity } from "@/game/world";
import { CALLINGS, xpToNext } from "@/game/data";
import { Pixel, SoftBtn, StatBar, Stick, playerFrame } from "./widgets";
import type { PanelId } from "@/game/types";
import { cn } from "@/lib/utils";

export function WorldHud({ walkers }: { walkers: number }) {
  const player = useGame((s) => s.player);
  const nearby = useGame((s) => s.nearby);
  const interact = useGame((s) => s.interact);
  const setPanel = useGame((s) => s.setPanel);
  const panel = useGame((s) => s.panel);
  const requestGps = useGame((s) => s.requestGps);
  const gpsOn = useGame((s) => s.gpsOn);
  const mapStyle = useGame((s) => s.mapStyle);
  const setMapStyle = useGame((s) => s.setMapStyle);
  const recenter = useGame((s) => s.recenter);
  const frame = useGame((s) => s.frame);
  if (!player) return null;
  const town = nearestCity(player.lat, player.lng);
  const call = CALLINGS.find((c) => c.id === player.calling);

  const nav: Array<{ id: PanelId; label: string; icon: typeof Backpack }> = [
    { id: "bag", label: "Pack", icon: Backpack },
    { id: "hero", label: "Hero", icon: Shield },
    { id: "craft", label: "Forge", icon: Hammer },
    { id: "store", label: "Store", icon: Store },
    { id: "guild", label: "Guild", icon: Users },
    { id: "journal", label: "Lore", icon: ScrollText },
  ];

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-3 pt-[var(--safe-top)]">
        <div className="pointer-events-auto mx-auto flex max-w-3xl items-start gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-surface/90 px-2 py-2 ring-1 ring-border backdrop-blur-sm">
            <Pixel src={playerFrame(player.dir, frame)} cloak={player.cloak} size={40} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate font-display text-sm text-fg">{player.name}</span>
                <span className="shrink-0 text-[11px] tabular-nums text-muted">Lv {player.level}</span>
              </div>
              <StatBar tone="hp" value={player.hp} max={player.maxHp} />
              <div className="mt-1">
                <StatBar tone="mana" value={player.mana} max={player.maxMana} />
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={requestGps}
              className={cn(
                "flex size-10 items-center justify-center rounded-md ring-1 ring-border",
                gpsOn ? "bg-accent text-accent-fg" : "bg-surface/90 text-fg",
              )}
              aria-label="Use GPS"
            >
              <MapPin className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setMapStyle(mapStyle === "veil" ? "sat" : "veil")}
              className="flex size-10 items-center justify-center rounded-md bg-surface/90 text-[10px] font-display tracking-wide text-fg ring-1 ring-border"
              aria-label="Map style"
            >
              {mapStyle === "veil" ? "VEIL" : "EARTH"}
            </button>
          </div>
        </div>
        <div className="pointer-events-none mx-auto mt-1.5 hidden max-w-3xl justify-between text-[11px] tabular-nums text-muted min-[480px]:flex">
          <span>
            {town.city.name} · {Math.round(town.meters / 10) * 10}m
          </span>
          <span>
            {player.gold}g · {player.shards} shards · {walkers} walkers
          </span>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-3 pb-[var(--safe-bottom)]">
        <div className="mx-auto flex max-w-3xl items-end justify-between gap-3">
          <div className="pointer-events-auto shrink-0">
            <Stick />
          </div>
          <div className="flex flex-col items-end gap-2">
            {nearby ? (
              <button
                type="button"
                onClick={() => interact()}
                className="pointer-events-auto max-w-[200px] rounded-lg bg-accent px-3 py-2 text-right font-display text-sm text-accent-fg"
              >
                {nearby.kind === "monster" ? "Hunt" : nearby.kind === "cave" ? "Descend" : nearby.kind === "wanderer" ? "Speak" : "Approach"} {nearby.name}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => interact()}
                className="pointer-events-auto rounded-lg bg-surface/90 px-3 py-2 font-display text-sm text-muted ring-1 ring-border"
              >
                Look
              </button>
            )}
            <div className="flex gap-1">
              <IconBtn label="Friends" onClick={() => setPanel("friends")}>
                <UserPlus className="size-4" />
              </IconBtn>
              <IconBtn label="House" onClick={() => setPanel("build")}>
                <Home className="size-4" />
              </IconBtn>
              <IconBtn label="Roads" onClick={() => setPanel("invite")}>
                <MapPin className="size-4" />
              </IconBtn>
              <IconBtn label="Center" onClick={recenter}>
                <span className="font-display text-[10px]">YOU</span>
              </IconBtn>
            </div>
          </div>
        </div>
        <nav className="pointer-events-auto mx-auto mt-2 flex max-w-3xl justify-between gap-1 rounded-xl bg-surface/92 p-1 ring-1 ring-border backdrop-blur-sm">
          {nav.map((n) => {
            const Icon = n.icon;
            const on = panel === n.id;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => setPanel(on ? null : n.id)}
                className={cn(
                  "flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center rounded-lg text-[10px] tracking-wide",
                  on ? "bg-raised text-fg" : "text-muted",
                )}
              >
                <Icon className="size-4" />
                <span className="mt-0.5 truncate">{n.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
      <p className="sr-only">
        {call?.skill} ready. Next level {xpToNext(player.level)} xp.
      </p>
    </>
  );
}

function IconBtn({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="pointer-events-auto flex size-11 items-center justify-center rounded-md bg-surface/90 text-fg ring-1 ring-border"
    >
      {children}
    </button>
  );
}

export function DungeonHud() {
  const dungeon = useGame((s) => s.dungeon);
  const player = useGame((s) => s.player);
  const leaveDungeon = useGame((s) => s.leaveDungeon);
  const dungeonInteract = useGame((s) => s.dungeonInteract);
  const dungeonMove = useGame((s) => s.dungeonMove);
  if (!dungeon || !player) return null;
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between px-3 pt-[var(--safe-top)]">
        <div className="pointer-events-auto rounded-lg bg-surface/90 px-3 py-2 ring-1 ring-border">
          <p className="font-display text-sm text-fg">{dungeon.name}</p>
          <p className="text-[11px] text-muted">Tap a direction or WASD. Chests and stairs wait.</p>
        </div>
        <SoftBtn className="pointer-events-auto" onClick={leaveDungeon}>
          Climb
        </SoftBtn>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between px-3 pb-[var(--safe-bottom)]">
        <div className="pointer-events-auto grid grid-cols-3 gap-1">
          <span />
          <Pad onClick={() => dungeonMove(0, -1)}>N</Pad>
          <span />
          <Pad onClick={() => dungeonMove(-1, 0)}>W</Pad>
          <Pad onClick={dungeonInteract}>Use</Pad>
          <Pad onClick={() => dungeonMove(1, 0)}>E</Pad>
          <span />
          <Pad onClick={() => dungeonMove(0, 1)}>S</Pad>
          <span />
        </div>
        <div className="w-36 rounded-lg bg-surface/90 p-2 ring-1 ring-border">
          <StatBar tone="hp" value={player.hp} max={player.maxHp} label="Health" />
          <div className="mt-1">
            <StatBar tone="mana" value={player.mana} max={player.maxMana} label="Mana" />
          </div>
        </div>
      </div>
    </>
  );
}

function Pad({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex size-11 items-center justify-center rounded-md bg-surface/90 font-display text-xs text-fg ring-1 ring-border"
    >
      {children}
    </button>
  );
}
