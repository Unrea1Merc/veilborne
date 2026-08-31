import type { Calling, CallingId, City, ItemDef, Lineage, LineageId, MonsterDef, Recipe } from "./types";


export const SAVE_VERSION = 1;
export const SAVE_KEY = "veilborne-save-v1";
export const COMPANY = "Unrea1Merc Game Studios";
export const GAME_TITLE = "Veilborne";
export const GAME_TAG = "The Hidden Kingdoms";

export const CELL = 0.0024;
export const CITY_RADIUS_M = 9000;
export const INTERACT_M = 42;
export const SHARD_GOAL = 5;
export const START_LAT = 35.2271;
export const START_LNG = -80.8431;

export const STORY = [
  "The Elder Crown bound two worlds: the one you walk, and Aetherfell beneath it.",
  "When the Crown shattered, the Veil tore. Monsters hunt the same streets, parks, and hills as you.",
  "You are Veilborne — a walker who sees both layers. Raise a house. Join a guild. Gather five Crown shards.",
  "Restore the Crown. Or claim its pieces for yourself.",
];

export const LINEAGES: Lineage[] = [
  {
    id: "dawnfolk",
    name: "Dawnfolk",
    title: "of the walking cities",
    blurb: "Balanced heirs of the first mapped kingdoms. Steady sword-arm, steady will.",
    hp: 0,
    strength: 0,
    mana: 0,
  },
  {
    id: "highborn",
    name: "Highborn",
    title: "of the torn spires",
    blurb: "Tall-blooded scholars of the Veil. Thin-skinned, bright with mana.",
    hp: -8,
    strength: -1,
    mana: 14,
  },
  {
    id: "northkin",
    name: "Northkin",
    title: "of the frost marches",
    blurb: "Winter-hardened. They take a beating and keep walking.",
    hp: 16,
    strength: 1,
    mana: -6,
  },
  {
    id: "wildkin",
    name: "Wildkin",
    title: "of the green between",
    blurb: "Beast-blooded scouts. Strong of claw, impatient with walls.",
    hp: 4,
    strength: 3,
    mana: -4,
  },
];

export const CALLINGS: Calling[] = [
  {
    id: "blade",
    name: "Blade",
    blurb: "Steel first. You close the gap and end the hunt.",
    skill: "Sunder",
    skillBlurb: "A heavy cut that scales with strength.",
    manaCost: 8,
    weaponHint: "swords",
  },
  {
    id: "mystic",
    name: "Mystic",
    blurb: "You pull threads of the Veil and throw them as light.",
    skill: "Veil Bolt",
    skillBlurb: "A mana lance. Ignores a portion of armor.",
    manaCost: 12,
    weaponHint: "staves",
  },
  {
    id: "scout",
    name: "Scout",
    blurb: "Two shots, one breath. You never stand still.",
    skill: "Twin Shot",
    skillBlurb: "Two lighter hits; high chance to loot extra.",
    manaCost: 10,
    weaponHint: "bows",
  },
];

export const CLOAKS = [
  { name: "Sage", hue: 0 },
  { name: "Ash", hue: 40 },
  { name: "River", hue: 160 },
  { name: "Dusk", hue: 220 },
  { name: "Ember", hue: 320 },
  { name: "Bone", hue: 80 },
];

export const ITEMS: Record<string, ItemDef> = {
  "rusty-blade": {
    id: "rusty-blade",
    name: "Rusty Blade",
    kind: "weapon",
    slot: "weapon",
    rarity: "common",
    icon: "sword",
    atk: 4,
    desc: "A traveler's first mistake, still sharp enough.",
    value: 12,
  },
  "iron-sword": {
    id: "iron-sword",
    name: "Iron Sword",
    kind: "weapon",
    slot: "weapon",
    rarity: "uncommon",
    icon: "sword",
    atk: 9,
    desc: "Honest steel from a mapped town forge.",
    value: 48,
  },
  "veil-edge": {
    id: "veil-edge",
    name: "Veil Edge",
    kind: "weapon",
    slot: "weapon",
    rarity: "rare",
    icon: "sword",
    atk: 16,
    str: 2,
    desc: "The metal remembers both worlds.",
    value: 160,
  },
  "oak-staff": {
    id: "oak-staff",
    name: "Oak Staff",
    kind: "weapon",
    slot: "weapon",
    rarity: "common",
    icon: "staff",
    atk: 3,
    mana: 6,
    desc: "A walking stick that hums at dusk.",
    value: 14,
  },
  "crystal-staff": {
    id: "crystal-staff",
    name: "Crystal Staff",
    kind: "weapon",
    slot: "weapon",
    rarity: "rare",
    icon: "staff",
    atk: 11,
    mana: 14,
    desc: "A captured tear of the Veil.",
    value: 150,
  },
  "hunter-bow": {
    id: "hunter-bow",
    name: "Hunter Bow",
    kind: "weapon",
    slot: "weapon",
    rarity: "common",
    icon: "bow",
    atk: 5,
    desc: "Quiet, hungry, patient.",
    value: 16,
  },
  "rune-bow": {
    id: "rune-bow",
    name: "Rune Bow",
    kind: "weapon",
    slot: "weapon",
    rarity: "rare",
    icon: "bow",
    atk: 13,
    desc: "Each arrow writes a small law.",
    value: 155,
  },
  "cloth-wrap": {
    id: "cloth-wrap",
    name: "Cloth Wrap",
    kind: "armor",
    slot: "armor",
    rarity: "common",
    icon: "armor",
    def: 2,
    desc: "Better than skin.",
    value: 10,
  },
  "leather-jack": {
    id: "leather-jack",
    name: "Leather Jack",
    kind: "armor",
    slot: "armor",
    rarity: "uncommon",
    icon: "armor",
    def: 6,
    hp: 8,
    desc: "Boiled hide, stitched by a guild hand.",
    value: 54,
  },
  "chain-shirt": {
    id: "chain-shirt",
    name: "Chain Shirt",
    kind: "armor",
    slot: "armor",
    rarity: "rare",
    icon: "armor",
    def: 11,
    hp: 16,
    desc: "Rings that remember every blow.",
    value: 140,
  },
  "leather-helm": {
    id: "leather-helm",
    name: "Leather Helm",
    kind: "armor",
    slot: "helm",
    rarity: "common",
    icon: "helm",
    def: 2,
    desc: "Keeps the rain and the claws off.",
    value: 18,
  },
  "iron-helm": {
    id: "iron-helm",
    name: "Iron Helm",
    kind: "armor",
    slot: "helm",
    rarity: "uncommon",
    icon: "helm",
    def: 5,
    desc: "A mapped-town standard.",
    value: 44,
  },
  "trail-boots": {
    id: "trail-boots",
    name: "Trail Boots",
    kind: "armor",
    slot: "boots",
    rarity: "common",
    icon: "boots",
    def: 1,
    desc: "Miles already in the soles.",
    value: 14,
  },
  "guard-shield": {
    id: "guard-shield",
    name: "Guard Shield",
    kind: "armor",
    slot: "accessory",
    rarity: "uncommon",
    icon: "shield",
    def: 4,
    desc: "A city crest, filed off.",
    value: 40,
  },
  "health-draught": {
    id: "health-draught",
    name: "Health Draught",
    kind: "consumable",
    rarity: "common",
    icon: "potion-hp",
    desc: "Restores a stout measure of health.",
    value: 28,
  },
  "mana-draught": {
    id: "mana-draught",
    name: "Mana Draught",
    kind: "consumable",
    rarity: "common",
    icon: "potion-mp",
    desc: "Clears the static from your Veil-sight.",
    value: 28,
  },
  "quick-revive": {
    id: "quick-revive",
    name: "Quick Revive",
    kind: "consumable",
    rarity: "rare",
    icon: "revive",
    desc: "Rise where you fell. No walk back to town.",
    value: 120,
  },
  herb: {
    id: "herb",
    name: "Veil Herb",
    kind: "material",
    rarity: "common",
    icon: "herb",
    desc: "Bitter green that grows on torn ground.",
    value: 4,
  },
  ore: {
    id: "ore",
    name: "Iron Ore",
    kind: "material",
    rarity: "common",
    icon: "ore",
    desc: "Heavy, honest, useful.",
    value: 6,
  },
  pelt: {
    id: "pelt",
    name: "Beast Pelt",
    kind: "material",
    rarity: "common",
    icon: "pelt",
    desc: "Still warm if you were quick.",
    value: 7,
  },
  bone: {
    id: "bone",
    name: "Old Bone",
    kind: "material",
    rarity: "common",
    icon: "bone",
    desc: "Something walked these streets before you.",
    value: 5,
  },
  shard: {
    id: "shard",
    name: "Crown Shard",
    kind: "quest",
    rarity: "relic",
    icon: "coin",
    desc: "A fragment of the Elder Crown. Five make a throne.",
    value: 0,
  },
};

export const RECIPES: Recipe[] = [
  {
    id: "brew-hp",
    name: "Brew Health Draught",
    out: { id: "health-draught", qty: 1 },
    ins: [
      { id: "herb", qty: 2 },
      { id: "bone", qty: 1 },
    ],
    station: "camp",
  },
  {
    id: "brew-mp",
    name: "Brew Mana Draught",
    out: { id: "mana-draught", qty: 1 },
    ins: [
      { id: "herb", qty: 2 },
      { id: "ore", qty: 1 },
    ],
    station: "camp",
  },
  {
    id: "forge-sword",
    name: "Forge Iron Sword",
    out: { id: "iron-sword", qty: 1 },
    ins: [
      { id: "ore", qty: 3 },
      { id: "bone", qty: 1 },
    ],
    station: "house",
  },
  {
    id: "stitch-jack",
    name: "Stitch Leather Jack",
    out: { id: "leather-jack", qty: 1 },
    ins: [
      { id: "pelt", qty: 3 },
      { id: "herb", qty: 1 },
    ],
    station: "house",
  },
  {
    id: "forge-helm",
    name: "Forge Iron Helm",
    out: { id: "iron-helm", qty: 1 },
    ins: [
      { id: "ore", qty: 2 },
      { id: "pelt", qty: 1 },
    ],
    station: "house",
  },
  {
    id: "guild-chain",
    name: "Guild Chain Shirt",
    out: { id: "chain-shirt", qty: 1 },
    ins: [
      { id: "ore", qty: 4 },
      { id: "pelt", qty: 2 },
    ],
    station: "guild",
  },
  {
    id: "guild-edge",
    name: "Temper Veil Edge",
    out: { id: "veil-edge", qty: 1 },
    ins: [
      { id: "iron-sword", qty: 1 },
      { id: "ore", qty: 3 },
      { id: "herb", qty: 2 },
    ],
    station: "guild",
  },
  {
    id: "phoenix",
    name: "Bind a Quick Revive",
    out: { id: "quick-revive", qty: 1 },
    ins: [
      { id: "herb", qty: 4 },
      { id: "bone", qty: 2 },
      { id: "pelt", qty: 1 },
    ],
    station: "house",
  },
];

export const MONSTERS: Record<string, MonsterDef> = {
  slime: {
    id: "slime",
    name: "Mire Slime",
    hp: 22,
    atk: 5,
    xp: 12,
    gold: 6,
    sprite: "/sprites/monsters/slime.png",
    loot: [{ id: "herb", chance: 0.7, qty: [1, 2] }],
    tags: ["wild"],
  },
  goblin: {
    id: "goblin",
    name: "Hedge Goblin",
    hp: 28,
    atk: 7,
    xp: 18,
    gold: 10,
    sprite: "/sprites/monsters/goblin.png",
    loot: [
      { id: "bone", chance: 0.5, qty: [1, 1] },
      { id: "herb", chance: 0.4, qty: [1, 2] },
    ],
    tags: ["wild", "city"],
  },
  wolf: {
    id: "wolf",
    name: "Park Wolf",
    hp: 34,
    atk: 9,
    xp: 22,
    gold: 8,
    sprite: "/sprites/monsters/wolf.png",
    loot: [{ id: "pelt", chance: 0.75, qty: [1, 2] }],
    tags: ["wild"],
  },
  spider: {
    id: "spider",
    name: "Cave Spider",
    hp: 30,
    atk: 10,
    xp: 24,
    gold: 9,
    sprite: "/sprites/monsters/spider.png",
    loot: [
      { id: "herb", chance: 0.4, qty: [1, 1] },
      { id: "bone", chance: 0.3, qty: [1, 1] },
    ],
    tags: ["cave"],
  },
  skeleton: {
    id: "skeleton",
    name: "Street Wight",
    hp: 38,
    atk: 11,
    xp: 28,
    gold: 14,
    sprite: "/sprites/monsters/skeleton.png",
    loot: [
      { id: "bone", chance: 0.9, qty: [1, 3] },
      { id: "rusty-blade", chance: 0.12, qty: [1, 1] },
    ],
    tags: ["night", "cave"],
  },
  imp: {
    id: "imp",
    name: "Alley Imp",
    hp: 24,
    atk: 8,
    xp: 16,
    gold: 12,
    sprite: "/sprites/monsters/imp.png",
    loot: [
      { id: "ore", chance: 0.35, qty: [1, 1] },
      { id: "herb", chance: 0.4, qty: [1, 1] },
    ],
    tags: ["city", "night"],
  },
  orc: {
    id: "orc",
    name: "Ash Orc",
    hp: 52,
    atk: 13,
    xp: 40,
    gold: 22,
    sprite: "/sprites/monsters/orc.png",
    loot: [
      { id: "ore", chance: 0.6, qty: [1, 3] },
      { id: "pelt", chance: 0.4, qty: [1, 1] },
    ],
    tags: ["wild", "cave"],
  },
  wraith: {
    id: "wraith",
    name: "Veil Wraith",
    hp: 44,
    atk: 14,
    xp: 36,
    gold: 18,
    sprite: "/sprites/monsters/wraith.png",
    loot: [
      { id: "herb", chance: 0.5, qty: [1, 2] },
      { id: "mana-draught", chance: 0.2, qty: [1, 1] },
    ],
    tags: ["night", "cave"],
  },
  troll: {
    id: "troll",
    name: "Underpass Troll",
    hp: 70,
    atk: 16,
    xp: 55,
    gold: 32,
    sprite: "/sprites/monsters/troll.png",
    loot: [
      { id: "ore", chance: 0.8, qty: [2, 4] },
      { id: "leather-helm", chance: 0.15, qty: [1, 1] },
    ],
    tags: ["cave", "boss"],
  },
  dragon: {
    id: "dragon",
    name: "Shard Wyrm",
    hp: 96,
    atk: 18,
    xp: 90,
    gold: 60,
    sprite: "/sprites/monsters/dragon.png",
    loot: [
      { id: "ore", chance: 1, qty: [2, 5] },
      { id: "veil-edge", chance: 0.08, qty: [1, 1] },
    ],
    tags: ["boss", "cave"],
  },
};

export const CITIES: City[] = [
  { id: "charlotte", name: "Charlotte", lat: 35.2271, lng: -80.8431 },
  { id: "nyc", name: "New York", lat: 40.7128, lng: -74.006 },
  { id: "la", name: "Los Angeles", lat: 34.0522, lng: -118.2437 },
  { id: "chicago", name: "Chicago", lat: 41.8781, lng: -87.6298 },
  { id: "miami", name: "Miami", lat: 25.7617, lng: -80.1918 },
  { id: "seattle", name: "Seattle", lat: 47.6062, lng: -122.3321 },
  { id: "denver", name: "Denver", lat: 39.7392, lng: -104.9903 },
  { id: "austin", name: "Austin", lat: 30.2672, lng: -97.7431 },
  { id: "london", name: "London", lat: 51.5074, lng: -0.1278 },
  { id: "paris", name: "Paris", lat: 48.8566, lng: 2.3522 },
  { id: "berlin", name: "Berlin", lat: 52.52, lng: 13.405 },
  { id: "rome", name: "Rome", lat: 41.9028, lng: 12.4964 },
  { id: "madrid", name: "Madrid", lat: 40.4168, lng: -3.7038 },
  { id: "tokyo", name: "Tokyo", lat: 35.6762, lng: 139.6503 },
  { id: "seoul", name: "Seoul", lat: 37.5665, lng: 126.978 },
  { id: "sydney", name: "Sydney", lat: -33.8688, lng: 151.2093 },
  { id: "toronto", name: "Toronto", lat: 43.6532, lng: -79.3832 },
  { id: "mexico", name: "Mexico City", lat: 19.4326, lng: -99.1332 },
  { id: "sao", name: "São Paulo", lat: -23.5505, lng: -46.6333 },
  { id: "cairo", name: "Cairo", lat: 30.0444, lng: 31.2357 },
  { id: "nairobi", name: "Nairobi", lat: -1.2921, lng: 36.8219 },
  { id: "mumbai", name: "Mumbai", lat: 19.076, lng: 72.8777 },
  { id: "singapore", name: "Singapore", lat: 1.3521, lng: 103.8198 },
  { id: "auckland", name: "Auckland", lat: -36.8509, lng: 174.7645 },
  { id: "vancouver", name: "Vancouver", lat: 49.2827, lng: -123.1207 },
  { id: "boston", name: "Boston", lat: 42.3601, lng: -71.0589 },
  { id: "atlanta", name: "Atlanta", lat: 33.749, lng: -84.388 },
  { id: "phoenix", name: "Phoenix", lat: 33.4484, lng: -112.074 },
  { id: "dublin", name: "Dublin", lat: 53.3498, lng: -6.2603 },
  { id: "oslo", name: "Oslo", lat: 59.9139, lng: 10.7522 },
];

export const WANDER_NAMES = [
  "Sera Vale",
  "Brann Oak",
  "Lysa Thorn",
  "Calder Rune",
  "Mirin Ash",
  "Tov Ember",
  "Neris Holt",
  "Jace Quill",
  "Orla Finn",
  "Perrin Shade",
  "Kest Rowan",
  "Auden Vale",
];

export function npcIdFromName(name: string) {
  return `npc:${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

export const STORE_OFFERS: Array<{
  id: string;
  itemId?: string;
  name: string;
  desc: string;
  gold: number;
  veilmarks?: number;
  icon: string;
  kind: "item" | "revive" | "restock";
}> = [
  {
    id: "buy-hp",
    itemId: "health-draught",
    name: "Health Draught",
    desc: "Sip in the field. Stand back up.",
    gold: 35,
    icon: "potion-hp",
    kind: "item",
  },
  {
    id: "buy-mp",
    itemId: "mana-draught",
    name: "Mana Draught",
    desc: "For the bolt you cannot afford to miss.",
    gold: 35,
    icon: "potion-mp",
    kind: "item",
  },
  {
    id: "buy-hp5",
    itemId: "health-draught",
    name: "Five Draughts",
    desc: "A traveler's bundle.",
    gold: 150,
    icon: "potion-hp",
    kind: "item",
  },
  {
    id: "buy-revive",
    name: "Quick Revive",
    desc: "Do not walk back to town. Rise here.",
    gold: 140,
    veilmarks: 3,
    icon: "revive",
    kind: "revive",
  },
  {
    id: "buy-sword",
    itemId: "iron-sword",
    name: "Iron Sword",
    desc: "Town steel. Reliable.",
    gold: 70,
    icon: "sword",
    kind: "item",
  },
  {
    id: "buy-staff",
    itemId: "oak-staff",
    name: "Oak Staff",
    desc: "A mystic's first true tool.",
    gold: 55,
    icon: "staff",
    kind: "item",
  },
  {
    id: "buy-bow",
    itemId: "hunter-bow",
    name: "Hunter Bow",
    desc: "For those who keep their distance.",
    gold: 58,
    icon: "bow",
    kind: "item",
  },
  {
    id: "buy-jack",
    itemId: "leather-jack",
    name: "Leather Jack",
    desc: "A little less death.",
    gold: 80,
    icon: "armor",
    kind: "item",
  },
];

export function xpToNext(level: number) {
  return Math.floor(36 * Math.pow(level, 1.55));
}

export function baseStats(lineage: LineageId, calling: CallingId) {
  const l = LINEAGES.find((x) => x.id === lineage)!;
  const extraHp = calling === "blade" ? 8 : calling === "scout" ? 4 : 0;
  const extraStr = calling === "blade" ? 2 : calling === "scout" ? 1 : 0;
  const extraMn = calling === "mystic" ? 10 : calling === "scout" ? 4 : 0;
  return {
    maxHp: 48 + l.hp + extraHp,
    strength: 6 + l.strength + extraStr,
    maxMana: 22 + l.mana + extraMn,
  };
}

export function starterWeapon(calling: CallingId) {
  if (calling === "mystic") return "oak-staff";
  if (calling === "scout") return "hunter-bow";
  return "rusty-blade";
}

export function iconSrc(icon: string) {
  return `/sprites/icons/${icon}.png`;
}
