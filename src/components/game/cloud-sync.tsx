import { useEffect, useRef } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useGame } from "@/game/store";
import { clearWalkerSave, loadWalkerSave, pushWalkerSave, type CloudSave } from "@/game/saves";
import { upsertProfile } from "@/game/social";
import type { Player } from "@/game/types";

function snapshot(): CloudSave {
  const s = useGame.getState();
  return {
    version: s.version,
    player: s.player,
    defeated: s.defeated,
    mapStyle: s.mapStyle,
    savedAt: Date.now(),
  };
}

function progress(p: Player | null) {
  if (!p) return -1;
  return p.level * 1_000_000 + p.shards * 100_000 + p.xp * 20 + p.gold + (p.house ? 800 : 0);
}

async function pushNow() {
  try {
    const snap = snapshot();
    await pushWalkerSave({ data: snap });
    if (snap.player) {
      await upsertProfile({
        data: {
          name: snap.player.name,
          level: snap.player.level,
          lat: snap.player.lat,
          lng: snap.player.lng,
        },
      });
    }
  } catch {
    /* signed out or network — local save still holds */
  }
}

async function mergeFromCloud() {
  const cloud = await loadWalkerSave();
  const local = useGame.getState();
  const cloudScore = progress(cloud?.player ?? null);
  const localScore = progress(local.player);
  if (cloud && cloudScore > localScore) {
    useGame.getState().applySave({
      player: cloud.player,
      defeated: cloud.defeated,
      mapStyle: cloud.mapStyle,
    });
    useGame.getState().toast(
      cloud.player
        ? `${cloud.player.name} steps through from another shore.`
        : "The Veil remembers an empty road.",
    );
    return;
  }
  if (local.player) await pushNow();
}

export function CloudSync() {
  const { user, isPending } = useCurrentUserState();
  const merged = useRef<string | null>(null);

  useEffect(() => {
    if (isPending) return;
    if (!user) {
      merged.current = null;
      return;
    }
    if (merged.current === user.id) return;
    merged.current = user.id;
    void mergeFromCloud().catch(() => {
      merged.current = null;
    });
  }, [user, isPending]);

  useEffect(() => {
    if (!user) return;
    let timer: number | null = null;
    const schedule = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void pushNow();
      }, 5000);
    };
    const unsub = useGame.subscribe(schedule);
    const flush = () => {
      if (timer) {
        window.clearTimeout(timer);
        timer = null;
      }
      void pushNow();
    };
    const onVis = () => {
      if (document.hidden) flush();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", flush);
    return () => {
      unsub();
      if (timer) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", flush);
    };
  }, [user]);

  return null;
}

export async function forgetWalkerEverywhere() {
  useGame.getState().resetSave();
  try {
    await clearWalkerSave();
  } catch {
    /* guest or network */
  }
}
