import { CALLINGS, ITEMS, MONSTERS } from "./data";
import type { CombatState, ItemStack, Player } from "./types";

export function equippedBonus(player: Player) {
  let atk = 0;
  let def = 0;
  let hp = 0;
  let mana = 0;
  let str = 0;
  for (const slot of Object.values(player.equipment)) {
    if (!slot) continue;
    const it = ITEMS[slot];
    if (!it) continue;
    atk += it.atk ?? 0;
    def += it.def ?? 0;
    hp += it.hp ?? 0;
    mana += it.mana ?? 0;
    str += it.str ?? 0;
  }
  return { atk, def, hp, mana, str };
}

export function roll(n: number, m: number) {
  return n + Math.floor(Math.random() * (m - n + 1));
}

export function makeCombat(
  monsterId: string,
  from: CombatState["from"],
  background: CombatState["background"],
  dungeonMonsterId?: string,
): CombatState {
  const m = MONSTERS[monsterId] ?? MONSTERS.goblin!;
  return {
    monsterId: m.id,
    name: m.name,
    sprite: m.sprite,
    hp: m.hp,
    maxHp: m.hp,
    atk: m.atk,
    xp: m.xp,
    gold: m.gold,
    loot: [],
    log: [`A ${m.name} bars the path.`],
    from,
    dungeonMonsterId,
    background,
    waiting: false,
  };
}

export function playerStrike(player: Player, kind: "basic" | "skill") {
  const b = equippedBonus(player);
  const str = player.strength + b.str;
  const calling = CALLINGS.find((c) => c.id === player.calling)!;
  if (kind === "basic") {
    const dmg = Math.max(1, str + b.atk + roll(0, 4) - 2);
    return { dmg, mana: 0, label: "You strike" };
  }
  if (player.calling === "blade") {
    const dmg = Math.max(1, Math.floor((str + b.atk) * 1.7) + roll(2, 8));
    return { dmg, mana: calling.manaCost, label: "Sunder" };
  }
  if (player.calling === "mystic") {
    const dmg = Math.max(1, Math.floor(player.maxMana * 0.35) + b.atk + roll(3, 10));
    return { dmg, mana: calling.manaCost, label: "Veil Bolt" };
  }
  const dmg = Math.max(1, str + b.atk + roll(1, 5)) + Math.max(1, Math.floor(str * 0.6) + roll(1, 4));
  return { dmg, mana: calling.manaCost, label: "Twin Shot" };
}

export function monsterHit(combat: CombatState, player: Player) {
  const def = equippedBonus(player).def;
  return Math.max(1, combat.atk + roll(0, 4) - def);
}

export function rollLoot(monsterId: string, scout: boolean): ItemStack[] {
  const m = MONSTERS[monsterId];
  if (!m) return [];
  const out: ItemStack[] = [];
  for (const drop of m.loot) {
    const chance = scout ? drop.chance + 0.12 : drop.chance;
    if (Math.random() < chance) {
      out.push({ id: drop.id, qty: roll(drop.qty[0], drop.qty[1]) });
    }
  }
  if (Math.random() < 0.08) out.push({ id: "health-draught", qty: 1 });
  return out;
}

export function addStack(list: ItemStack[], id: string, qty: number) {
  const next = list.map((s) => ({ ...s }));
  const found = next.find((s) => s.id === id);
  if (found) found.qty += qty;
  else next.push({ id, qty });
  return next;
}

export function takeStack(list: ItemStack[], id: string, qty: number): ItemStack[] | null {
  const found = list.find((s) => s.id === id);
  if (!found || found.qty < qty) return null;
  return list
    .map((s) => (s.id === id ? { ...s, qty: s.qty - qty } : s))
    .filter((s) => s.qty > 0);
}

export function countItem(list: ItemStack[], id: string) {
  return list.find((s) => s.id === id)?.qty ?? 0;
}
