export type VaultPack = {
  id: string;
  name: string;
  desc: string;
  usdCents: number;
  gold: number;
  veilmarks: number;
  revives: number;
  icon: string;
  tag?: "popular" | "best";
};

export const VAULT_PACKS: VaultPack[] = [
  {
    id: "vm-ember",
    name: "Ember Pinch",
    desc: "A spark of the Veil. Enough for a revive.",
    usdCents: 99,
    gold: 0,
    veilmarks: 40,
    revives: 0,
    icon: "potion-mp",
  },
  {
    id: "vm-cache",
    name: "Veil Cache",
    desc: "The walker’s usual purse of marks.",
    usdCents: 299,
    gold: 0,
    veilmarks: 130,
    revives: 0,
    icon: "potion-mp",
    tag: "popular",
  },
  {
    id: "vm-coffer",
    name: "Crown Coffer",
    desc: "Marks enough to stand after many falls.",
    usdCents: 799,
    gold: 0,
    veilmarks: 380,
    revives: 0,
    icon: "potion-mp",
  },
  {
    id: "vm-hoard",
    name: "Elder Hoard",
    desc: "A deep well of Veilmarks.",
    usdCents: 1999,
    gold: 0,
    veilmarks: 1000,
    revives: 0,
    icon: "potion-mp",
    tag: "best",
  },
  {
    id: "g-purse",
    name: "Coin Purse",
    desc: "Town gold for draughts and steel.",
    usdCents: 99,
    gold: 250,
    veilmarks: 0,
    revives: 0,
    icon: "coin",
  },
  {
    id: "g-box",
    name: "Strongbox",
    desc: "A chest of mapped coin.",
    usdCents: 299,
    gold: 850,
    veilmarks: 0,
    revives: 0,
    icon: "coin",
    tag: "popular",
  },
  {
    id: "g-guild",
    name: "Guild Chest",
    desc: "Pay a hall. Outfit a party.",
    usdCents: 699,
    gold: 2400,
    veilmarks: 0,
    revives: 0,
    icon: "coin",
  },
  {
    id: "g-royal",
    name: "Royal Tribute",
    desc: "Gold enough to raise a house twice.",
    usdCents: 1499,
    gold: 6500,
    veilmarks: 0,
    revives: 0,
    icon: "coin",
    tag: "best",
  },
  {
    id: "b-walker",
    name: "Walker’s Kit",
    desc: "Marks, gold, and a bound revive.",
    usdCents: 399,
    gold: 400,
    veilmarks: 80,
    revives: 1,
    icon: "revive",
    tag: "popular",
  },
  {
    id: "b-seeker",
    name: "Shard Seeker",
    desc: "For the long road to the Crown.",
    usdCents: 999,
    gold: 1600,
    veilmarks: 260,
    revives: 3,
    icon: "revive",
    tag: "best",
  },
];

export function formatUsd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function packGrantLine(p: VaultPack) {
  const bits: string[] = [];
  if (p.veilmarks) bits.push(`${p.veilmarks} Veilmarks`);
  if (p.gold) bits.push(`${p.gold} gold`);
  if (p.revives) bits.push(`${p.revives} revive${p.revives === 1 ? "" : "s"}`);
  return bits.join(" · ");
}
