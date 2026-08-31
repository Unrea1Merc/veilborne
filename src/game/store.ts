import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { sfx, unlockAudio } from "./audio";
import {
  CALLINGS,
  ITEMS,
  RECIPES,
  SAVE_KEY,
  SAVE_VERSION,
  SHARD_GOAL,
  START_LAT,
  START_LNG,
  STORE_OFFERS,
  baseStats,
  npcIdFromName,
  starterWeapon,
  xpToNext,
} from "./data";
import { generateDungeon, tryStep } from "./dungeon";
import { lookupTown } from "./places";
import {
  addStack,
  countItem,
  equippedBonus,
  makeCombat,
  monsterHit,
  playerStrike,
  roll,
  rollLoot,
  takeStack,
} from "./combat";
import type {
  CallingId,
  CombatState,
  Dir,
  DungeonState,
  LineageId,
  PanelId,
  Player,
  ScreenId,
  Toast,
  WorldEntity,
} from "./types";
import {
  closestEntity,
  decodeInvite,
  dirFromVector,
  encodeInvite,
  gatherEntities,
  haversine,
  metersToDeg,
  nearestCity,
  rememberTown,
  settlementById,
  yawFromVector,
} from "./world";

export const INTERACT_M = 90;
const WANDER_MPS = 28;

export function getInputSpeed() {
  return input.speed;
}

export function getStick() {
  return { x: input.stickX, y: input.stickY };
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function applyLevelStats(p: Player): Player {
  const b = baseStats(p.lineage, p.calling);
  const eq = equippedBonus(p);
  const maxHp = b.maxHp + (p.level - 1) * 8 + eq.hp;
  const maxMana = b.maxMana + (p.level - 1) * 4 + eq.mana;
  const strength = b.strength + (p.level - 1) + eq.str;
  return {
    ...p,
    maxHp,
    maxMana,
    strength,
    hp: clamp(p.hp, 0, maxHp),
    mana: clamp(p.mana, 0, maxMana),
  };
}

function gainXp(p: Player, xp: number): { player: Player; leveled: number } {
  let next = { ...p, xp: p.xp + xp };
  let leveled = 0;
  while (next.xp >= xpToNext(next.level)) {
    next.xp -= xpToNext(next.level);
    next.level += 1;
    leveled += 1;
  }
  if (leveled) next = applyLevelStats({ ...next, hp: next.maxHp, mana: next.maxMana });
  return { player: applyLevelStats(next), leveled };
}

function makePlayer(
  name: string,
  lineage: LineageId,
  calling: CallingId,
  cloak: number,
  lat: number,
  lng: number,
): Player {
  const weapon = starterWeapon(calling);
  const raw: Player = {
    name: name.trim().slice(0, 16) || "Walker",
    lineage,
    calling,
    cloak,
    level: 1,
    xp: 0,
    hp: 1,
    maxHp: 1,
    mana: 1,
    maxMana: 1,
    strength: 1,
    gold: 40,
    veilmarks: 0,
    revives: 1,
    lat,
    lng,
    heading: 0,
    dir: "down",
    inventory: [
      { id: weapon, qty: 1 },
      { id: "cloth-wrap", qty: 1 },
      { id: "health-draught", qty: 2 },
      { id: "herb", qty: 2 },
    ],
    equipment: {
      weapon,
      helm: null,
      armor: "cloth-wrap",
      boots: null,
      accessory: null,
    },
    house: null,
    guild: null,
    shards: 0,
    discovered: [],
  };
  const p = applyLevelStats(raw);
  return { ...p, hp: p.maxHp, mana: p.maxMana };
}

interface InputState {
  keys: Set<string>;
  stickX: number;
  stickY: number;
  speed: number;
}

const input: InputState = {
  keys: new Set(),
  stickX: 0,
  stickY: 0,
  speed: 0,
};

let toastSeq = 1;
let gpsWatch: number | null = null;

export interface GameStore {
  version: number;
  screen: ScreenId;
  panel: PanelId;
  player: Player | null;
  combat: CombatState | null;
  dungeon: DungeonState | null;
  death: boolean;
  follow: boolean;
  gpsOn: boolean;
  mapStyle: "veil" | "sat";
  toasts: Toast[];
  frame: number;
  entities: WorldEntity[];
  defeated: Record<string, number>;
  nearby: WorldEntity | null;
  storyOpen: boolean;
  ending: boolean;
  awakening: boolean;
  socialTarget: { id: string; name: string } | null;
  toast: (text: string) => void;
  setScreen: (s: ScreenId) => void;
  setPanel: (p: PanelId) => void;
  setStick: (x: number, y: number) => void;
  setKeys: (codes: string[]) => void;
  awaken: (name: string, lineage: LineageId, calling: CallingId, cloak: number) => void;
  continueSave: () => void;
  dismissStory: () => void;
  dismissEnding: () => void;
  setFollow: (v: boolean) => void;
  tick: (dt: number) => void;
  interact: (entity?: WorldEntity) => void;
  combatAct: (kind: "basic" | "skill" | "item" | "flee", itemId?: string) => void;
  useItem: (id: string, fromBag?: boolean) => void;
  equip: (id: string) => void;
  unequip: (slot: keyof Player["equipment"]) => void;
  craft: (recipeId: string) => void;
  buy: (offerId: string, pay: "gold" | "veilmarks") => void;
  creditVault: (grant: { gold: number; veilmarks: number; revives: number }) => void;
  placeHouse: () => void;
  enterHouse: () => void;
  rest: () => void;
  createGuild: (name: string) => void;
  joinGuild: (code: string) => void;
  travelInvite: (code: string) => void;
  travelCity: (id: string) => void;
  requestGps: () => void;
  recenter: () => void;
  setMapStyle: (s: "veil" | "sat") => void;
  dungeonMove: (dx: number, dy: number) => void;
  dungeonInteract: () => void;
  leaveDungeon: () => void;
  reviveHere: () => void;
  respawnSafe: () => void;
  resetSave: () => void;
  setSocialTarget: (t: { id: string; name: string } | null) => void;
  applySave: (data: {
    player: Player | null;
    defeated?: Record<string, number>;
    mapStyle?: "veil" | "sat";
  }) => void;
  getInvite: () => string;
}

function refreshEntities(get: () => GameStore, set: (p: Partial<GameStore>) => void) {
  const { player, defeated } = get();
  if (!player) return;
  const entities = gatherEntities(
    player.lat,
    player.lng,
    defeated,
    player.house,
    player.guild?.cityId ?? null,
  );
  const near = closestEntity(player.lat, player.lng, entities, INTERACT_M);
  set({ entities, nearby: near?.entity ?? null });
}

function discoverPlace(lat: number, lng: number, get: () => GameStore, set: (p: Partial<GameStore>) => void) {
  void lookupTown({ data: { lat, lng } })
    .then((town) => {
      if (!town) return;
      rememberTown(town);
      refreshEntities(get, set);
    })
    .catch(() => undefined);
}

export const useGame = create<GameStore>()(
  persist(
    (set, get) => ({
      version: SAVE_VERSION,
      screen: "title",
      panel: null,
      player: null,
      combat: null,
      dungeon: null,
      death: false,
      follow: true,
      gpsOn: false,
      mapStyle: "veil",
      toasts: [],
      frame: 0,
      entities: [],
      defeated: {},
      nearby: null,
      storyOpen: true,
      ending: false,
      awakening: false,
      socialTarget: null,

      toast: (text) => {
        const id = toastSeq++;
        set((s) => ({ toasts: [...s.toasts.slice(-4), { id, text }] }));
        setTimeout(() => {
          set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
        }, 2800);
      },

      setScreen: (screen) => set({ screen, panel: null }),
      setPanel: (panel) => {
        sfx.ui();
        set({ panel, socialTarget: panel === "friends" ? get().socialTarget : null });
      },
      setSocialTarget: (socialTarget) => set({ socialTarget, panel: socialTarget ? "friends" : get().panel }),
      setStick: (x, y) => {
        input.stickX = x;
        input.stickY = y;
      },
      setKeys: (codes) => {
        input.keys = new Set(codes);
      },

      awaken: (name, lineage, calling, cloak) => {
        unlockAudio();
        set({ awakening: true });
        const start = { lat: START_LAT, lng: START_LNG };
        if (typeof navigator !== "undefined" && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const p = makePlayer(name, lineage, calling, cloak, pos.coords.latitude, pos.coords.longitude);
              set({ player: p, screen: "world", storyOpen: true, death: false, awakening: false });
              refreshEntities(get, set);
              discoverPlace(p.lat, p.lng, get, set);
              get().toast(`The Veil thins at ${p.lat.toFixed(3)}, ${p.lng.toFixed(3)}.`);
            },
            () => {
              const p = makePlayer(name, lineage, calling, cloak, start.lat, start.lng);
              set({ player: p, screen: "world", storyOpen: true, death: false, awakening: false });
              refreshEntities(get, set);
              get().toast("GPS quiet. You awaken near Charlotte — walk, or enter an invite.");
            },
            { enableHighAccuracy: true, timeout: 2500 },
          );
          return;
        }
        const p = makePlayer(name, lineage, calling, cloak, start.lat, start.lng);
        set({ player: p, screen: "world", storyOpen: true, awakening: false });
        refreshEntities(get, set);
      },

      continueSave: () => {
        const p = get().player;
        if (!p) return;
        unlockAudio();
        set({ screen: "world", storyOpen: false, death: false, panel: null, combat: null, dungeon: null });
        refreshEntities(get, set);
        get().toast(`Welcome back, ${p.name}.`);
      },

      dismissStory: () => set({ storyOpen: false }),
      dismissEnding: () => set({ ending: false }),
      setFollow: (follow) => set({ follow }),

      tick: (dt) => {
        const s = get();
        if (!s.player || s.death) return;
        if (s.screen !== "world") {
          input.speed = 0;
          return;
        }

        let north = 0;
        let east = 0;
        if (input.keys.has("KeyW") || input.keys.has("ArrowUp")) north += 1;
        if (input.keys.has("KeyS") || input.keys.has("ArrowDown")) north -= 1;
        if (input.keys.has("KeyA") || input.keys.has("ArrowLeft")) east -= 1;
        if (input.keys.has("KeyD") || input.keys.has("ArrowRight")) east += 1;
        north += -input.stickY;
        east += input.stickX;
        if (typeof navigator !== "undefined" && navigator.getGamepads) {
          for (const pad of navigator.getGamepads()) {
            if (!pad) continue;
            const x = pad.axes[0] ?? 0;
            const y = pad.axes[1] ?? 0;
            const m = Math.hypot(x, y);
            if (m >= 0.18) {
              const scale = (m - 0.18) / (1 - 0.18) / m;
              east += x * scale;
              north += -y * scale;
            }
            if (pad.buttons[12]?.pressed) north += 1;
            if (pad.buttons[13]?.pressed) north -= 1;
            if (pad.buttons[14]?.pressed) east -= 1;
            if (pad.buttons[15]?.pressed) east += 1;
          }
        }
        const mag = Math.hypot(north, east);
        if (mag > 1) {
          north /= mag;
          east /= mag;
        }
        input.speed = mag > 0.12 ? WANDER_MPS * Math.min(1, mag) : 0;
        if (input.speed <= 0) return;

        const { dLat, dLng } = metersToDeg(s.player.lat, north * input.speed * dt, east * input.speed * dt);
        const lat = clamp(s.player.lat + dLat, -85, 85);
        const lng = ((s.player.lng + dLng + 540) % 360) - 180;
        const dir = dirFromVector(north, east);
        const heading = yawFromVector(north, east);
        const frame = (s.frame + dt * 5.5) % 4;
        const discovered = s.player.discovered.includes(`${lat.toFixed(3)}`)
          ? s.player.discovered
          : s.player.discovered;
        set({
          player: { ...s.player, lat, lng, dir, heading, discovered },
          frame,
          follow: true,
        });
        if (Math.random() < 0.02) sfx.step();
        refreshEntities(get, set);
      },

      interact: (entity) => {
        const s = get();
        const p = s.player;
        if (!p || s.death) return;
        const target = entity ?? s.nearby;
        if (!target) {
          get().toast("Nothing close. Walk nearer, or use the stick.");
          return;
        }
        sfx.ui();
        if (target.kind === "monster" && target.monsterId) {
          set({
            combat: makeCombat(target.monsterId, "world", "wild"),
            screen: "combat",
            panel: null,
          });
          return;
        }
        if (target.kind === "cave") {
          const d = generateDungeon(target.id + Math.floor(Date.now() / 60000));
          set({ dungeon: d, screen: "dungeon", panel: null });
          get().toast(`You descend into ${d.name}.`);
          return;
        }
        if (target.kind === "chest") {
          const loot = [
            { id: "herb", qty: roll(1, 3) },
            { id: Math.random() < 0.5 ? "ore" : "bone", qty: roll(1, 2) },
          ];
          if (Math.random() < 0.25) loot.push({ id: "health-draught", qty: 1 });
          let inv = p.inventory;
          for (const l of loot) inv = addStack(inv, l.id, l.qty);
          set({
            player: { ...p, inventory: inv, gold: p.gold + roll(4, 14) },
            defeated: { ...s.defeated, [target.id]: Date.now() },
          });
          get().toast("The waychest yields supplies.");
          sfx.loot();
          refreshEntities(get, set);
          return;
        }
        if (target.kind === "house") {
          set({ screen: "house", panel: null });
          return;
        }
        if (target.kind === "shop" || target.kind === "city") {
          set({ panel: "store" });
          return;
        }
        if (target.kind === "guild") {
          set({ panel: "guild" });
          return;
        }
        if (target.kind === "wanderer") {
          set({
            panel: "friends",
            socialTarget: { id: npcIdFromName(target.name), name: target.name },
          });
          get().toast(`${target.name} waits to speak.`);
          return;
        }
      },

      combatAct: (kind, itemId) => {
        const s = get();
        const p = s.player;
        const c = s.combat;
        if (!p || !c || c.waiting) return;

        if (kind === "flee") {
          if (Math.random() < 0.62) {
            set({ combat: null, screen: c.from === "dungeon" ? "dungeon" : "world" });
            get().toast("You break away.");
            return;
          }
          const dmg = monsterHit(c, p);
          const hp = p.hp - dmg;
          set({
            player: { ...p, hp },
            combat: { ...c, log: [...c.log.slice(-5), "You fail to flee.", `It hits for ${dmg}.`] },
          });
          sfx.hurt();
          if (hp <= 0) set({ death: true, screen: "world", combat: null });
          return;
        }

        if (kind === "item" && itemId) {
          get().useItem(itemId, false);
          return;
        }

        const skill = kind === "skill";
        const calling = CALLINGS.find((x) => x.id === p.calling)!;
        if (skill && p.mana < calling.manaCost) {
          get().toast("Not enough mana.");
          return;
        }
        const strike = playerStrike(p, skill ? "skill" : "basic");
        const hp = c.hp - strike.dmg;
        const mana = p.mana - strike.mana;
        sfx[skill ? "skill" : "hit"]();
        let log = [...c.log.slice(-5), `${strike.label} for ${strike.dmg}.`];

        if (hp <= 0) {
          const loot = rollLoot(c.monsterId, p.calling === "scout");
          let inv = p.inventory;
          for (const l of loot) inv = addStack(inv, l.id, l.qty);
          const gained = gainXp({ ...p, mana, inventory: inv, gold: p.gold + c.gold }, c.xp);
          let player = gained.player;
          let shards = player.shards;
          let veilmarks = player.veilmarks + (c.from === "dungeon" ? 1 : 0);
          if (c.from === "dungeon" && s.dungeon) {
            const boss = s.dungeon.actors.find((a) => a.id === c.dungeonMonsterId && a.kind === "boss");
            if (boss) {
              shards += 1;
              veilmarks += 2;
              get().toast("A Crown shard burns in your pack.");
            }
            set({
              dungeon: {
                ...s.dungeon,
                actors: s.dungeon.actors.filter((a) => a.id !== c.dungeonMonsterId),
              },
            });
          }
          player = { ...player, shards, veilmarks };
          const defeated = { ...s.defeated };
          if (c.from === "world" && s.nearby) defeated[s.nearby.id] = Date.now();
          const ending = shards >= SHARD_GOAL;
          set({
            player,
            combat: null,
            screen: c.from === "dungeon" ? "dungeon" : "world",
            defeated,
            ending,
          });
          sfx.win();
          get().toast(`Fell ${c.name}. +${c.xp} xp, ${c.gold} gold.`);
          if (gained.leveled) get().toast(`You reach level ${player.level}.`);
          refreshEntities(get, set);
          return;
        }

        set({
          combat: { ...c, hp, log, waiting: true },
          player: { ...p, mana },
        });

        window.setTimeout(() => {
          const cur = get();
          if (!cur.combat || !cur.player) return;
          const md = monsterHit(cur.combat, cur.player);
          const php = cur.player.hp - md;
          sfx.hurt();
          set({
            player: { ...cur.player, hp: php },
            combat: {
              ...cur.combat,
              waiting: false,
              log: [...cur.combat.log.slice(-5), `${cur.combat.name} hits for ${md}.`],
            },
          });
          if (php <= 0) {
            set({ death: true, screen: cur.combat.from === "dungeon" ? "world" : "world", combat: null });
            get().toast("You fall. The Veil goes dark.");
          }
        }, 480);
      },

      useItem: (id, fromBag = true) => {
        const s = get();
        const p = s.player;
        if (!p) return;
        if (id === "quick-revive") {
          if (p.revives <= 0 && countItem(p.inventory, "quick-revive") <= 0) {
            get().toast("No revives left.");
            return;
          }
          return;
        }
        const taken = takeStack(p.inventory, id, 1);
        if (!taken) {
          get().toast("You do not have that.");
          return;
        }
        let hp = p.hp;
        let mana = p.mana;
        if (id === "health-draught") hp = clamp(p.hp + 38, 0, p.maxHp);
        else if (id === "mana-draught") mana = clamp(p.mana + 28, 0, p.maxMana);
        else {
          get().toast("That cannot be used now.");
          return;
        }
        sfx.loot();
        set({ player: { ...p, inventory: taken, hp, mana } });
        if (fromBag) get().toast(`Used ${ITEMS[id]?.name ?? id}.`);
        if (s.combat) {
          const md = monsterHit(s.combat, { ...p, hp, mana });
          const php = hp - md;
          set((st) => ({
            player: st.player ? { ...st.player, hp: php } : st.player,
            combat: st.combat
              ? {
                  ...st.combat,
                  log: [...st.combat.log.slice(-5), `You drink. ${st.combat.name} hits for ${md}.`],
                }
              : st.combat,
            death: php <= 0,
          }));
        }
      },

      equip: (id) => {
        const p = get().player;
        if (!p) return;
        const def = ITEMS[id];
        if (!def?.slot) return;
        if (!p.inventory.some((s) => s.id === id)) return;
        const prev = p.equipment[def.slot];
        let inv = p.inventory;
        const taken = takeStack(inv, id, 1);
        if (!taken) return;
        inv = taken;
        if (prev) inv = addStack(inv, prev, 1);
        const next = applyLevelStats({
          ...p,
          inventory: inv,
          equipment: { ...p.equipment, [def.slot]: id },
        });
        set({ player: { ...next, hp: clamp(p.hp, 0, next.maxHp), mana: clamp(p.mana, 0, next.maxMana) } });
        sfx.ui();
      },

      unequip: (slot) => {
        const p = get().player;
        if (!p) return;
        const cur = p.equipment[slot];
        if (!cur) return;
        const next = applyLevelStats({
          ...p,
          inventory: addStack(p.inventory, cur, 1),
          equipment: { ...p.equipment, [slot]: null },
        });
        set({ player: next });
      },

      craft: (recipeId) => {
        const p = get().player;
        if (!p) return;
        const r = RECIPES.find((x) => x.id === recipeId);
        if (!r) return;
        if (r.station === "house" && get().screen !== "house") {
          get().toast("Forge that at your house.");
          return;
        }
        if (r.station === "guild" && !p.guild) {
          get().toast("Join a guild first.");
          return;
        }
        let inv = p.inventory;
        for (const need of r.ins) {
          const next = takeStack(inv, need.id, need.qty);
          if (!next) {
            get().toast("Missing materials.");
            return;
          }
          inv = next;
        }
        inv = addStack(inv, r.out.id, r.out.qty);
        set({ player: { ...p, inventory: inv } });
        sfx.loot();
        get().toast(`Crafted ${ITEMS[r.out.id]?.name ?? r.out.id}.`);
      },

      buy: (offerId, pay) => {
        const p = get().player;
        if (!p) return;
        const offer = STORE_OFFERS.find((o) => o.id === offerId);
        if (!offer) return;
        if (pay === "veilmarks") {
          const cost = offer.veilmarks ?? 0;
          if (!cost || p.veilmarks < cost) {
            get().toast("Not enough veilmarks.");
            return;
          }
          if (offer.kind === "revive") {
            set({ player: { ...p, veilmarks: p.veilmarks - cost, revives: p.revives + 1 } });
            get().toast("A Quick Revive is bound to you.");
            return;
          }
        } else if (p.gold < offer.gold) {
          get().toast("Not enough gold.");
          return;
        }
        if (offer.kind === "revive") {
          set({ player: { ...p, gold: p.gold - offer.gold, revives: p.revives + 1 } });
          get().toast("A Quick Revive is bound to you.");
          sfx.loot();
          return;
        }
        if (!offer.itemId) return;
        const qty = offerId.endsWith("5") ? 5 : 1;
        set({
          player: {
            ...p,
            gold: p.gold - offer.gold,
            inventory: addStack(p.inventory, offer.itemId, qty),
          },
        });
        sfx.loot();
        get().toast(`Bought ${offer.name}.`);
      },

      creditVault: (grant) => {
        const p = get().player;
        if (!p) return;
        set({
          player: {
            ...p,
            gold: p.gold + grant.gold,
            veilmarks: p.veilmarks + grant.veilmarks,
            revives: p.revives + grant.revives,
          },
        });
        sfx.loot();
      },

      placeHouse: () => {
        const p = get().player;
        if (!p) return;
        if (p.house) {
          if (p.gold < 80) {
            get().toast("Relocating costs 80 gold.");
            return;
          }
          set({
            player: {
              ...p,
              gold: p.gold - 80,
              house: { ...p.house, lat: p.lat, lng: p.lng },
            },
            panel: null,
          });
          get().toast("You claim a new plot.");
        } else {
          set({
            player: { ...p, house: { lat: p.lat, lng: p.lng, storage: [] } },
            panel: null,
            screen: "house",
          });
          get().toast("Timber and stone take root on this plot.");
        }
        refreshEntities(get, set);
      },

      enterHouse: () => {
        const p = get().player;
        if (!p?.house) {
          get().toast("You have no house. Build one on this plot.");
          set({ panel: "build" });
          return;
        }
        if (haversine(p.lat, p.lng, p.house.lat, p.house.lng) > 80) {
          get().toast("Too far from your door.");
          return;
        }
        set({ screen: "house", panel: null });
      },

      rest: () => {
        const p = get().player;
        if (!p) return;
        const next = applyLevelStats({ ...p, hp: p.maxHp, mana: p.maxMana });
        set({ player: { ...next, hp: next.maxHp, mana: next.maxMana } });
        get().toast("You sleep. The Veil is quiet until morning.");
        sfx.loot();
      },

      createGuild: (name) => {
        const p = get().player;
        if (!p) return;
        const city = nearestCity(p.lat, p.lng).city;
        const code = `GL-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
        set({
          player: {
            ...p,
            guild: {
              name: name.trim().slice(0, 22) || "Unnamed Company",
              code,
              cityId: city.id,
              members: [p.name, "Sera Vale", "Brann Oak"],
            },
          },
          panel: "guild",
        });
        get().toast(`The ${name} hall rises in ${city.name}.`);
        refreshEntities(get, set);
      },

      joinGuild: (code) => {
        const p = get().player;
        if (!p) return;
        const clean = code.trim().toUpperCase();
        if (!/^GL-[0-9A-Z]{4,8}$/.test(clean)) {
          get().toast("That guild code is not known.");
          return;
        }
        const city = nearestCity(p.lat, p.lng).city;
        set({
          player: {
            ...p,
            guild: {
              name: "Fellow Walkers",
              code: clean,
              cityId: city.id,
              members: [p.name, "Lysa Thorn", "Calder Rune", "Mirin Ash"],
            },
          },
        });
        get().toast(`You are sworn in. Hall in ${city.name}.`);
        refreshEntities(get, set);
      },

      travelInvite: (code) => {
        const loc = decodeInvite(code);
        if (!loc) {
          get().toast("Invite unreadable. Use a VB- code.");
          return;
        }
        const p = get().player;
        if (!p) return;
        set({ player: { ...p, lat: loc.lat, lng: loc.lng }, follow: true, panel: null, screen: "world" });
        get().toast("The Veil folds. You step through.");
        refreshEntities(get, set);
      },

      travelCity: (id) => {
        const city = settlementById(id);
        const p = get().player;
        if (!p || !city) return;
        set({ player: { ...p, lat: city.lat, lng: city.lng }, follow: true, panel: null, screen: "world" });
        get().toast(`You take the guild road to ${city.name}.`);
        refreshEntities(get, set);
      },

      requestGps: () => {
        if (typeof navigator === "undefined" || !navigator.geolocation) {
          get().toast("This device will not share a location.");
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const p = get().player;
            if (!p) return;
            set({
              player: { ...p, lat: pos.coords.latitude, lng: pos.coords.longitude },
              gpsOn: true,
              follow: true,
            });
            get().toast("The walking world locks to your feet.");
            refreshEntities(get, set);
            discoverPlace(pos.coords.latitude, pos.coords.longitude, get, set);
            if (gpsWatch != null) navigator.geolocation.clearWatch(gpsWatch);
            gpsWatch = navigator.geolocation.watchPosition((w) => {
              const cur = get().player;
              if (!cur || get().screen !== "world") return;
              if (input.speed > 0.12) return;
              set({
                player: { ...cur, lat: w.coords.latitude, lng: w.coords.longitude },
              });
              refreshEntities(get, set);
            });
          },
          () => get().toast("Location denied. Wander with the stick."),
        );
      },

      recenter: () => set({ follow: true }),
      setMapStyle: (mapStyle) => set({ mapStyle }),

      dungeonMove: (dx, dy) => {
        const d = get().dungeon;
        if (!d) return;
        const next = tryStep(d, dx, dy);
        set({ dungeon: next, frame: (get().frame + 1) % 4 });
        const actor = next.actors.find((a) => a.x === next.px && a.y === next.py);
        if (actor?.kind === "monster" || actor?.kind === "boss") {
          set({
            combat: makeCombat(actor.monsterId ?? "goblin", "dungeon", "cave", actor.id),
            screen: "combat",
          });
        }
      },

      dungeonInteract: () => {
        const d = get().dungeon;
        const p = get().player;
        if (!d || !p) return;
        const actor = d.actors.find((a) => a.x === d.px && a.y === d.py);
        if (!actor) return;
        if (actor.kind === "chest" && !actor.opened) {
          let inv = addStack(p.inventory, "ore", roll(1, 3));
          inv = addStack(inv, "bone", roll(1, 2));
          if (Math.random() < 0.4) inv = addStack(inv, "health-draught", 1);
          set({
            player: { ...p, inventory: inv, gold: p.gold + roll(8, 20) },
            dungeon: {
              ...d,
              actors: d.actors.map((a) => (a.id === actor.id ? { ...a, opened: true } : a)),
            },
          });
          sfx.loot();
          get().toast("Chest opened.");
          return;
        }
        if (actor.kind === "stairs") {
          get().leaveDungeon();
        }
      },

      leaveDungeon: () => {
        set({ dungeon: null, screen: "world" });
        get().toast("Daylight. The cave mouth seals behind you.");
        refreshEntities(get, set);
      },

      reviveHere: () => {
        const p = get().player;
        if (!p) return;
        if (p.revives <= 0) {
          const taken = takeStack(p.inventory, "quick-revive", 1);
          if (!taken) {
            get().toast("You have no Quick Revive.");
            return;
          }
          const next = applyLevelStats({
            ...p,
            inventory: taken,
            hp: Math.max(1, Math.floor(p.maxHp * 0.4)),
            mana: Math.max(0, Math.floor(p.maxMana * 0.4)),
          });
          set({ player: next, death: false, screen: "world", combat: null });
          get().toast("White fire. You stand where you fell.");
          return;
        }
        const next = applyLevelStats({
          ...p,
          revives: p.revives - 1,
          hp: Math.max(1, Math.floor(p.maxHp * 0.45)),
          mana: Math.max(0, Math.floor(p.maxMana * 0.45)),
        });
        set({ player: next, death: false, screen: "world", combat: null });
        get().toast("White fire. You stand where you fell.");
      },

      respawnSafe: () => {
        const p = get().player;
        if (!p) return;
        let lat = p.lat;
        let lng = p.lng;
        if (p.house) {
          lat = p.house.lat;
          lng = p.house.lng;
        } else {
          const c = nearestCity(p.lat, p.lng).city;
          lat = c.lat;
          lng = c.lng;
        }
        const next = applyLevelStats({
          ...p,
          lat,
          lng,
          hp: Math.max(1, Math.floor(p.maxHp * 0.6)),
          mana: Math.max(0, Math.floor(p.maxMana * 0.5)),
        });
        set({ player: next, death: false, screen: "world", combat: null, follow: true, dungeon: null });
        get().toast(p.house ? "You wake in your own bed." : "You wake at the town stone.");
        refreshEntities(get, set);
      },

      resetSave: () => {
        set({
          player: null,
          screen: "title",
          panel: null,
          combat: null,
          dungeon: null,
          death: false,
          defeated: {},
          ending: false,
        });
      },

      applySave: (data) => {
        set({
          player: data.player,
          defeated: data.defeated ?? {},
          mapStyle: data.mapStyle ?? get().mapStyle,
          screen: "title",
          panel: null,
          combat: null,
          dungeon: null,
          death: false,
          storyOpen: false,
          ending: false,
          awakening: false,
        });
        if (data.player) refreshEntities(get, set);
      },

      getInvite: () => {
        const p = get().player;
        if (!p) return "";
        return encodeInvite(p.lat, p.lng);
      },
    }),
    {
      name: SAVE_KEY,
      version: SAVE_VERSION,
      skipHydration: true,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        version: s.version,
        player: s.player,
        defeated: s.defeated,
        mapStyle: s.mapStyle,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<GameStore> | undefined;
        return {
          ...current,
          ...p,
          screen: "title" as const,
          panel: null,
          combat: null,
          dungeon: null,
          death: false,
          awakening: false,
        };
      },
    },
  ),
);

