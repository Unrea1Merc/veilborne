import { useEffect, useRef, useState } from "react";
import { getInputSpeed, getStick, useGame } from "@/game/store";
import { CombatView, CreateHero, DeathOverlay, EndingModal, HouseView, StoryModal, TitleScreen, BootSplash } from "./screens";
import { WorldMap, type Ghost } from "./WorldMap";
import { DungeonView } from "./DungeonView";
import { DungeonHud, WorldHud } from "./hud";
import { GamePanels } from "./panels";
import { Toasts } from "./widgets";
import { CloudSync } from "./cloud-sync";

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      setKeys?: (codes: string[]) => void;
      setStick?: (x: number, y: number) => void;
    };
  }
}

export function GameApp() {
  const [hydrated, setHydrated] = useState(false);
  const [ghosts] = useState<Ghost[]>([]);
  const screen = useGame((s) => s.screen);
  const player = useGame((s) => s.player);
  const death = useGame((s) => s.death);
  const storyOpen = useGame((s) => s.storyOpen);
  const ending = useGame((s) => s.ending);
  const panel = useGame((s) => s.panel);

  useEffect(() => {
    const sync = () => {
      const vv = window.visualViewport;
      const h = Math.round(vv?.height ?? window.innerHeight);
      const top = Math.round(vv?.offsetTop ?? 0);
      const root = document.documentElement;
      root.style.setProperty("--app-height", `${h}px`);
      root.style.setProperty("--app-top", `${top}px`);
    };
    sync();
    window.visualViewport?.addEventListener("resize", sync);
    window.visualViewport?.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    return () => {
      window.visualViewport?.removeEventListener("resize", sync);
      window.visualViewport?.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const finish = () => {
      if (!cancelled) setHydrated(true);
    };
    const api = useGame.persist;
    const unsub = api?.onFinishHydration?.(finish);
    void Promise.resolve(api?.rehydrate?.()).finally(finish);
    if (api?.hasHydrated?.()) finish();
    const t = window.setTimeout(finish, 50);
    return () => {
      cancelled = true;
      unsub?.();
      window.clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    window.__controlsTest = {
      getYaw: () => useGame.getState().player?.heading ?? 0,
      getSpeed: () => getInputSpeed(),
      setKeys: (codes) => useGame.getState().setKeys(codes),
      setStick: (x: number, y: number) => useGame.getState().setStick(x, y),
    };
    return () => {
      delete window.__controlsTest;
    };
  }, []);

  const held = useRef(new Set<string>());
  const lastStep = useRef(0);

  useEffect(() => {
    const field = (t: EventTarget | null) => t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement;
    const down = (e: KeyboardEvent) => {
      if (field(e.target)) return;
      const g = useGame.getState();
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
      held.current.add(e.code);
      g.setKeys([...held.current]);
      if (e.code === "Escape") {
        if (g.panel) g.setPanel(null);
        else if (g.screen === "house") g.setScreen("world");
        else if (g.screen === "dungeon") g.leaveDungeon();
        return;
      }
      if (e.repeat) return;
      if (e.code === "KeyE" || e.code === "Space") {
        if (g.screen === "world") g.interact();
        if (g.screen === "dungeon") g.dungeonInteract();
      }
      if (g.screen === "world") {
        if (e.code === "KeyI" || e.code === "KeyB") g.setPanel(g.panel === "bag" ? null : "bag");
        if (e.code === "KeyC") g.setPanel(g.panel === "hero" ? null : "hero");
        if (e.code === "KeyJ") g.setPanel(g.panel === "journal" ? null : "journal");
      }
    };
    const up = (e: KeyboardEvent) => {
      held.current.delete(e.code);
      useGame.getState().setKeys([...held.current]);
    };
    const clear = () => {
      held.current.clear();
      useGame.getState().setKeys([]);
      useGame.getState().setStick(0, 0);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) clear();
    });
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const step = 1 / 60;
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      acc += dt;
      const g = useGame.getState();
      while (acc >= step) {
        g.tick(step);
        acc -= step;
      }
      if (g.screen === "dungeon" && g.dungeon) {
        let dx = 0;
        let dy = 0;
        const st = getStick();
        if (st.y < -0.55) dy = -1;
        else if (st.y > 0.55) dy = 1;
        else if (st.x < -0.55) dx = -1;
        else if (st.x > 0.55) dx = 1;
        const heldKeys = held.current;
        if (heldKeys.has("KeyW") || heldKeys.has("ArrowUp")) dy = -1;
        if (heldKeys.has("KeyS") || heldKeys.has("ArrowDown")) dy = 1;
        if (heldKeys.has("KeyA") || heldKeys.has("ArrowLeft")) dx = -1;
        if (heldKeys.has("KeyD") || heldKeys.has("ArrowRight")) dx = 1;
        if ((dx || dy) && now - lastStep.current > 170) {
          if (dx && dy) dy = 0;
          g.dungeonMove(dx, dy);
          lastStep.current = now;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (!hydrated) {
    return (
      <div className="vb-shell relative overflow-hidden bg-bg text-fg">
        <CloudSync />
        <BootSplash />
      </div>
    );
  }

  if (screen === "title") {
    return (
      <div className="vb-shell relative overflow-hidden bg-bg text-fg">
        <CloudSync />
        <TitleScreen />
      </div>
    );
  }
  if (screen === "create") {
    return (
      <div className="vb-shell relative overflow-hidden bg-bg text-fg">
        <CloudSync />
        <CreateHero />
      </div>
    );
  }

  return (
    <div className="vb-shell relative overflow-hidden bg-bg text-fg">
      <CloudSync />
      {screen === "world" || death ? (
        <>
          <WorldMap ghosts={ghosts} />
          {!panel && !death ? <WorldHud walkers={ghosts.length} /> : null}
        </>
      ) : null}
      {screen === "dungeon" ? (
        <>
          <DungeonView />
          <DungeonHud />
        </>
      ) : null}
      {screen === "combat" ? <CombatView /> : null}
      {screen === "house" ? <HouseView /> : null}
      <GamePanels />
      {storyOpen && screen === "world" && !death ? <StoryModal /> : null}
      {ending && !death ? <EndingModal /> : null}
      {death ? <DeathOverlay /> : null}
      <Toasts />
    </div>
  );
}
