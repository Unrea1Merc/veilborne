export type LineageId = "dawnfolk" | "highborn" | "northkin" | "wildkin";
export type CallingId = "blade" | "mystic" | "scout";
export type ScreenId = "title" | "create" | "world" | "combat" | "dungeon" | "house";
export type PanelId =
  | null
  | "bag"
  | "hero"
  | "craft"
  | "guild"
  | "store"
  | "invite"
  | "build"
  | "journal"
  | "friends";
export type Dir = "down" | "left" | "right" | "up";
export type Slot = "weapon" | "helm" | "armor" | "boots" | "accessory";
export type ItemKind = "weapon" | "armor" | "consumable" | "material" | "quest";
export type Rarity = "common" | "uncommon" | "rare" | "relic";
export type EntityKind = "monster" | "cave" | "chest" | "wanderer" | "city" | "house" | "guild" | "shop";

export interface Lineage {
  id: LineageId;
  name: string;
  title: string;
  blurb: string;
  hp: number;
  strength: number;
  mana: number;
}

export interface Calling {
  id: CallingId;
  name: string;
  blurb: string;
  skill: string;
  skillBlurb: string;
  manaCost: number;
  weaponHint: string;
}

export interface ItemDef {
  id: string;
  name: string;
  kind: ItemKind;
  slot?: Slot;
  rarity: Rarity;
  icon: string;
  atk?: number;
  def?: number;
  hp?: number;
  mana?: number;
  str?: number;
  desc: string;
  value: number;
}

export interface ItemStack {
  id: string;
  qty: number;
}

export interface Recipe {
  id: string;
  name: string;
  out: ItemStack;
  ins: ItemStack[];
  station: "camp" | "house" | "guild";
}

export interface MonsterDef {
  id: string;
  name: string;
  hp: number;
  atk: number;
  xp: number;
  gold: number;
  sprite: string;
  loot: Array<{ id: string; chance: number; qty: [number, number] }>;
  tags: Array<"wild" | "night" | "cave" | "city" | "boss">;
}

export interface City {
  id: string;
  name: string;
  lat: number;
  lng: number;
  size?: "city" | "town" | "hamlet";
}

export interface Equipment {
  weapon: string | null;
  helm: string | null;
  armor: string | null;
  boots: string | null;
  accessory: string | null;
}

export interface HouseState {
  lat: number;
  lng: number;
  storage: ItemStack[];
}

export type GuildRank = "leader" | "officer" | "member";

export interface GuildMember {
  id: string;
  name: string;
  rank: GuildRank;
}

export interface GuildState {
  name: string;
  code: string;
  cityId: string;
  motd: string;
  leaderId: string;
  members: GuildMember[];
}

export interface Player {
  name: string;
  lineage: LineageId;
  calling: CallingId;
  cloak: number;
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  strength: number;
  gold: number;
  veilmarks: number;
  revives: number;
  lat: number;
  lng: number;
  heading: number;
  dir: Dir;
  inventory: ItemStack[];
  equipment: Equipment;
  house: HouseState | null;
  guild: GuildState | null;
  shards: number;
  discovered: string[];
}

export interface WorldEntity {
  id: string;
  kind: EntityKind;
  lat: number;
  lng: number;
  name: string;
  sprite: string;
  level?: number;
  monsterId?: string;
  cityId?: string;
  wandererTitle?: string;
}

export interface CombatState {
  monsterId: string;
  name: string;
  sprite: string;
  hp: number;
  maxHp: number;
  atk: number;
  xp: number;
  gold: number;
  loot: ItemStack[];
  log: string[];
  from: "world" | "dungeon";
  dungeonMonsterId?: string;
  background: "wild" | "cave";
  waiting: boolean;
}

export interface DungeonCell {
  tx: number;
  ty: number;
  walk: boolean;
  tile: number;
}

export interface DungeonActor {
  id: string;
  kind: "monster" | "chest" | "stairs" | "boss";
  x: number;
  y: number;
  monsterId?: string;
  opened?: boolean;
}

export interface DungeonState {
  seed: string;
  name: string;
  cols: number;
  rows: number;
  tiles: number[];
  walk: boolean[];
  actors: DungeonActor[];
  px: number;
  py: number;
  dir: Dir;
  cleared: boolean;
}

export interface Toast {
  id: number;
  text: string;
}
