import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { CALLINGS, CLOAKS, COMPANY, GAME_TAG, GAME_TITLE, LINEAGES, STORY } from "@/game/data";
import { useGame } from "@/game/store";
import type { CallingId, LineageId } from "@/game/types";
import { Pixel, SoftBtn, StatBar } from "./widgets";
import { cn } from "@/lib/utils";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { shareBeta } from "@/game/share";

export function BootSplash() {
  return (
    <main className="flex h-full flex-col items-center justify-center bg-bg px-6 text-center">
      <p className="font-display text-xs tracking-[0.28em] text-muted uppercase">{COMPANY}</p>
      <h1 className="mt-3 font-display text-4xl tracking-[0.18em] text-fg">{GAME_TITLE}</h1>
      <p className="mt-2 text-muted">{GAME_TAG}</p>
    </main>
  );
}

export function TitleScreen() {
  const player = useGame((s) => s.player);
  const continueSave = useGame((s) => s.continueSave);
  const resetSave = useGame((s) => s.resetSave);
  const setScreen = useGame((s) => s.setScreen);

  return (
    <main className="relative flex h-full flex-col overflow-hidden bg-bg">
      <img
        src="/art/title.jpg"
        alt=""
        className="absolute inset-0 size-full object-cover object-center opacity-80"
      />
      <div className="absolute inset-0 bg-linear-to-t from-bg via-bg/70 to-bg/20" />
      <div className="relative z-10 mt-auto flex flex-col items-center px-6 pb-[max(2rem,var(--safe-bottom))] pt-10 text-center">
        <p className="font-display text-[11px] tracking-[0.32em] text-gold uppercase">{COMPANY}</p>
        <h1 className="mt-3 font-display text-[clamp(2.4rem,9vw,4.2rem)] leading-none tracking-[0.16em] text-fg">
          {GAME_TITLE}
        </h1>
        <p className="mt-3 max-w-sm text-base text-fg">{GAME_TAG}. Walk the torn map. Restore the Elder Crown.</p>
        <div className="mt-8 flex w-full max-w-sm flex-col gap-2.5">
          <AccountGate />
          {player ? (
            <SoftBtn primary className="w-full py-3" onClick={continueSave}>
              Continue as {player.name}
            </SoftBtn>
          ) : null}
          <SoftBtn
            className="w-full py-3"
            primary={!player}
            onClick={() => {
              if (player) resetSave();
              setScreen("create");
            }}
          >
            {player ? "New Walker" : "Walk the Veil"}
          </SoftBtn>
          <ShareBetaBtn />
        </div>
        <p className="mt-6 max-w-md text-xs leading-relaxed text-faint">
          Use GPS as your starting stone, then wander with the stick or WASD. Invite a friend with a
          VB- code. Sign in with Google to pick up the same walker on another phone.
        </p>
      </div>
    </main>
  );
}

function ShareBetaBtn() {
  const [label, setLabel] = useState("Share the beta");
  return (
    <SoftBtn
      className="w-full py-3"
      onClick={() => {
        void shareBeta().then((how) => {
          setLabel(how === "copied" ? "Copied — paste in a text" : "Sent");
          setTimeout(() => setLabel("Share the beta"), 1800);
        });
      }}
    >
      {label}
    </SoftBtn>
  );
}

function AccountGate() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return <div className="h-11 w-full animate-pulse rounded-md bg-raised/80" />;
  }
  if (user) {
    return (
      <div className="rounded-lg bg-surface/90 px-3 py-2.5 text-left ring-1 ring-border">
        <p className="text-[11px] tracking-wide text-gold uppercase">Linked</p>
        <div className="mt-1 text-fg">
          <UserButton />
        </div>
        <p className="mt-1 text-xs text-muted">This walker follows you to any signed-in device.</p>
      </div>
    );
  }
  return (
    <Link
      to="/login"
      className="flex min-h-11 items-center justify-center rounded-md bg-accent px-3.5 font-display text-sm tracking-wide text-accent-fg"
    >
      Link Google · play on any phone
    </Link>
  );
}

const CALLING_SPRITE: Record<CallingId, string> = {
  blade: "/sprites/player/down-1.png",
  mystic: "/sprites/classes/mystic-down.png",
  scout: "/sprites/classes/scout-down.png",
};

export function CreateHero() {
  const awaken = useGame((s) => s.awaken);
  const awakening = useGame((s) => s.awakening);
  const setScreen = useGame((s) => s.setScreen);
  const [name, setName] = useState("");
  const [lineage, setLineage] = useState<LineageId>("dawnfolk");
  const [calling, setCalling] = useState<CallingId>("blade");
  const [cloak, setCloak] = useState(0);

  return (
    <main className="flex h-full flex-col overflow-hidden bg-bg">
      <header className="flex items-center justify-between px-4 pt-[var(--safe-top)] pb-2">
        <button type="button" className="min-h-11 text-sm text-muted" onClick={() => setScreen("title")}>
          Back
        </button>
        <p className="font-display text-xs tracking-[0.22em] text-muted uppercase">Awaken</p>
        <span className="w-10" />
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-36">
        <div className="mx-auto flex max-w-lg flex-col items-center">
          <Pixel src={CALLING_SPRITE[calling]} cloak={cloak} size={112} className="mt-2" />
          <label className="mt-4 w-full text-left text-xs tracking-wide text-muted uppercase">
            Name
            <input
              id="hero-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={16}
              placeholder="Walker"
              className="mt-1.5 h-11 w-full rounded-md bg-raised px-3 text-base text-fg ring-1 ring-border outline-none placeholder:text-faint focus:ring-accent"
            />
          </label>

          <p className="mt-6 w-full font-display text-xs tracking-wide text-muted uppercase">Lineage</p>
          <div className="mt-2 grid w-full grid-cols-2 gap-2">
            {LINEAGES.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setLineage(l.id)}
                className={cn(
                  "rounded-lg p-3 text-left ring-1 transition-colors",
                  lineage === l.id ? "bg-raised ring-accent" : "bg-surface ring-border",
                )}
              >
                <div className="font-display text-sm text-fg">{l.name}</div>
                <div className="text-[11px] text-muted">{l.title}</div>
              </button>
            ))}
          </div>
          <p className="mt-2 w-full text-sm text-muted">{LINEAGES.find((l) => l.id === lineage)?.blurb}</p>

          <p className="mt-6 w-full font-display text-xs tracking-wide text-muted uppercase">Calling</p>
          <div className="mt-2 grid w-full gap-2">
            {CALLINGS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCalling(c.id)}
                className={cn(
                  "flex items-center gap-3 rounded-lg p-3 text-left ring-1",
                  calling === c.id ? "bg-raised ring-accent" : "bg-surface ring-border",
                )}
              >
                <Pixel src={CALLING_SPRITE[c.id]} size={48} cloak={cloak} />
                <div>
                  <div className="font-display text-sm text-fg">{c.name}</div>
                  <div className="text-xs text-muted">{c.blurb}</div>
                </div>
              </button>
            ))}
          </div>

          <p className="mt-6 w-full font-display text-xs tracking-wide text-muted uppercase">Cloak</p>
          <div className="mt-2 flex w-full flex-wrap gap-2">
            {CLOAKS.map((c, i) => (
              <button
                key={c.name}
                type="button"
                onClick={() => setCloak(i)}
                className={cn(
                  "min-h-11 rounded-md px-3 text-sm ring-1",
                  cloak === i ? "bg-accent text-accent-fg ring-accent" : "bg-raised text-fg ring-border",
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-bg via-bg/90 to-transparent px-4 pt-8 pb-[var(--safe-bottom)]">
        <SoftBtn
          primary
          className="pointer-events-auto mx-auto block w-full max-w-lg py-3"
          disabled={awakening}
          onClick={() => awaken(name, lineage, calling, cloak)}
        >
          {awakening ? "Listening for the walking world…" : "Awaken"}
        </SoftBtn>
      </div>
    </main>
  );
}

export function CombatView() {
  const combat = useGame((s) => s.combat);
  const player = useGame((s) => s.player);
  const combatAct = useGame((s) => s.combatAct);
  const calling = CALLINGS.find((c) => c.id === player?.calling);

  if (!combat || !player) return null;
  const bg = combat.background === "cave" ? "/art/battle-cave.jpg" : "/art/battle-wild.jpg";

  return (
    <section className="relative flex h-full flex-col overflow-hidden bg-bg">
      <img src={bg} alt="" className="absolute inset-0 size-full object-cover opacity-70" />
      <div className="absolute inset-0 bg-bg/45" />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col px-4 pt-[var(--safe-top)]">
        <div className="mx-auto w-full max-w-md">
          <div className="rounded-lg bg-surface/80 p-3 ring-1 ring-border backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg text-fg">{combat.name}</h2>
              <span className="text-xs text-muted">Wild</span>
            </div>
            <StatBar tone="hp" value={combat.hp} max={combat.maxHp} label="Vital" />
          </div>
          <div className="mt-4 flex justify-center">
            <Pixel src={combat.sprite} size={168} className={combat.waiting ? "opacity-80" : ""} />
          </div>
        </div>
        <div className="mt-auto mx-auto w-full max-w-md pb-[var(--safe-bottom)]">
          <div className="mb-3 min-h-16 rounded-lg bg-surface/85 px-3 py-2 text-sm text-muted ring-1 ring-border">
            {combat.log.slice(-3).map((line, i) => (
              <p key={i} className="text-fg/90">
                {line}
              </p>
            ))}
          </div>
          <div className="rounded-xl bg-surface/90 p-3 ring-1 ring-border">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="font-display text-sm">{player.name}</span>
              <span className="text-xs text-muted">Lv {player.level}</span>
            </div>
            <StatBar tone="hp" value={player.hp} max={player.maxHp} label="Health" />
            <div className="mt-1.5">
              <StatBar tone="mana" value={player.mana} max={player.maxMana} label="Mana" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <SoftBtn primary disabled={combat.waiting} onClick={() => combatAct("basic")}>
                Strike
              </SoftBtn>
              <SoftBtn disabled={combat.waiting} onClick={() => combatAct("skill")}>
                {calling?.skill ?? "Skill"}
              </SoftBtn>
              <SoftBtn
                disabled={combat.waiting}
                onClick={() => combatAct("item", "health-draught")}
              >
                Draught
              </SoftBtn>
              <SoftBtn disabled={combat.waiting} onClick={() => combatAct("flee")}>
                Flee
              </SoftBtn>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function HouseView() {
  const setScreen = useGame((s) => s.setScreen);
  const setPanel = useGame((s) => s.setPanel);
  const rest = useGame((s) => s.rest);
  const player = useGame((s) => s.player);

  return (
    <section className="relative flex h-full flex-col overflow-hidden bg-bg">
      <img src="/art/house-interior.jpg" alt="" className="absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0 bg-bg/40" />
      <div className="relative z-10 flex h-full flex-col justify-between px-4 pt-[var(--safe-top)] pb-[var(--safe-bottom)]">
        <div className="rounded-lg bg-surface/85 px-4 py-3 ring-1 ring-border backdrop-blur-sm">
          <p className="font-display text-xs tracking-[0.2em] text-muted uppercase">Hearth</p>
          <h2 className="font-display text-xl text-fg">{player?.name}'s house</h2>
          <p className="mt-1 text-sm text-muted">Sleep. Forge. Keep the rain off.</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <SoftBtn primary onClick={rest}>
            Rest
          </SoftBtn>
          <SoftBtn onClick={() => setPanel("craft")}>Craft</SoftBtn>
          <SoftBtn onClick={() => setPanel("bag")}>Pack</SoftBtn>
          <SoftBtn onClick={() => setScreen("world")}>Leave</SoftBtn>
        </div>
      </div>
    </section>
  );
}

export function DeathOverlay() {
  const player = useGame((s) => s.player);
  const reviveHere = useGame((s) => s.reviveHere);
  const respawnSafe = useGame((s) => s.respawnSafe);
  if (!player) return null;
  const canHere = player.revives > 0 || player.inventory.some((s) => s.id === "quick-revive");
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-bg/80 px-5 backdrop-blur-[2px]">
      <div className="w-full max-w-sm rounded-xl bg-surface p-5 ring-1 ring-border">
        <p className="font-display text-xs tracking-[0.22em] text-hp uppercase">Fallen</p>
        <h2 className="mt-1 font-display text-2xl text-fg">The Veil goes dark</h2>
        <p className="mt-2 text-sm text-muted">
          Rise here with a Quick Revive, or wake at your house or the nearest town stone.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <SoftBtn primary disabled={!canHere} onClick={reviveHere}>
            Revive here ({player.revives} bound)
          </SoftBtn>
          <SoftBtn onClick={respawnSafe}>Wake somewhere safe</SoftBtn>
        </div>
      </div>
    </div>
  );
}

export function StoryModal() {
  const dismissStory = useGame((s) => s.dismissStory);
  const player = useGame((s) => s.player);
  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-bg/55 px-4 pb-8 sm:items-center">
      <div className="w-full max-w-md rounded-xl bg-surface p-5 ring-1 ring-border">
        <p className="font-display text-xs tracking-[0.22em] text-gold uppercase">The torn crown</p>
        <h2 className="mt-1 font-display text-2xl text-fg">You are Veilborne</h2>
        <div className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
          {STORY.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <p className="mt-3 text-sm text-fg">
          Five shards, {player?.name ?? "walker"}. The world under the map is already hunting.
        </p>
        <SoftBtn primary className="mt-5 w-full py-3" onClick={dismissStory}>
          Step through
        </SoftBtn>
      </div>
    </div>
  );
}

export function EndingModal() {
  const dismissEnding = useGame((s) => s.dismissEnding);
  const player = useGame((s) => s.player);
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-bg/70 px-4">
      <div className="w-full max-w-md rounded-xl bg-surface p-5 ring-1 ring-border">
        <p className="font-display text-xs tracking-[0.22em] text-gold uppercase">Elder Crown</p>
        <h2 className="mt-1 font-display text-2xl text-fg">The pieces remember a throne</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {player?.name} holds five Crown shards. The Veil still hangs, but the walking kingdoms
          have a claimant. Rest, raise a hall, or keep hunting — the map is yours.
        </p>
        <p className="mt-3 text-xs text-faint">{COMPANY}</p>
        <SoftBtn primary className="mt-5 w-full py-3" onClick={dismissEnding}>
          Keep walking
        </SoftBtn>
      </div>
    </div>
  );
}

