import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  CALLINGS,
  COMPANY,
  ITEMS,
  LINEAGES,
  RECIPES,
  SHARD_GOAL,
  STORY,
  STORE_OFFERS,
  iconSrc,
  xpToNext,
} from "@/game/data";
import { countItem, equippedBonus } from "@/game/combat";
import { nearestCity, settlementById } from "@/game/world";
import { useGame } from "@/game/store";
import type { PanelId, Slot } from "@/game/types";
import { PanelFrame, Pixel, SoftBtn } from "./widgets";
import { cn } from "@/lib/utils";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { forgetWalkerEverywhere } from "./cloud-sync";
import { FriendsPanel } from "./friends";
import { claimWalkerName, listFriends, nameIsTaken, type FriendRow } from "@/game/social";
import { VAULT_PACKS, formatUsd, packGrantLine, type VaultPack } from "@/game/vault";
import { buyVaultPack } from "@/game/vault-buy";
import { shareBeta } from "@/game/share";
import { canManage, rankLabel, rankOf } from "@/game/guild-model";
import {
  addGuildMemberCloud,
  createGuildCloud,
  joinGuildCloud,
  kickGuildMemberCloud,
  leaveGuildCloud,
  loadMyGuild,
  renameGuildCloud,
  setGuildRankCloud,
  setMotdCloud,
} from "@/game/guilds";
import type { GuildRank, GuildState } from "@/game/types";

const SLOTS: Slot[] = ["weapon", "helm", "armor", "boots", "accessory"];

export function GamePanels() {
  const panel = useGame((s) => s.panel);
  const setPanel = useGame((s) => s.setPanel);
  if (!panel) return null;
  const title: Record<Exclude<PanelId, null>, string> = {
    bag: "Pack",
    hero: "Walker",
    craft: "Forge",
    guild: "Guild",
    store: "Store",
    invite: "Roads",
    build: "Plot",
    journal: "Journal",
    friends: "Friends",
  };
  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end bg-bg/40 md:justify-stretch md:bg-transparent">
      <button type="button" className="min-h-12 flex-1 md:hidden" aria-label="Close panel" onClick={() => setPanel(null)} />
      <PanelFrame title={title[panel]} onClose={() => setPanel(null)}>
        {panel === "bag" && <BagPanel />}
        {panel === "hero" && <HeroPanel />}
        {panel === "craft" && <CraftPanel />}
        {panel === "guild" && <GuildPanel />}
        {panel === "store" && <StorePanel />}
        {panel === "invite" && <InvitePanel />}
        {panel === "build" && <BuildPanel />}
        {panel === "journal" && <JournalPanel />}
        {panel === "friends" && <FriendsPanel />}
      </PanelFrame>
    </div>
  );
}

function BagPanel() {
  const player = useGame((s) => s.player);
  const useItem = useGame((s) => s.useItem);
  const equip = useGame((s) => s.equip);
  if (!player) return null;
  if (player.inventory.length === 0) {
    return <p className="text-sm text-muted">The pack is empty. Hunt, or open a waychest.</p>;
  }
  return (
    <ul className="space-y-2">
      {player.inventory.map((stack) => {
        const def = ITEMS[stack.id];
        if (!def) return null;
        const equipped = Object.values(player.equipment).includes(stack.id);
        return (
          <li key={stack.id} className="flex items-center gap-3 rounded-md bg-raised px-2 py-2 ring-1 ring-border">
            <Pixel src={iconSrc(def.icon)} size={36} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate font-display text-sm text-fg">{def.name}</span>
                <span className="tabular-nums text-xs text-muted">×{stack.qty}</span>
              </div>
              <p className="truncate text-xs text-muted">{def.desc}</p>
            </div>
            {def.kind === "consumable" ? (
              <SoftBtn className="shrink-0 px-2 text-xs" onClick={() => useItem(stack.id, true)}>
                Use
              </SoftBtn>
            ) : def.slot ? (
              <SoftBtn
                className="shrink-0 px-2 text-xs"
                primary={!equipped}
                disabled={equipped}
                onClick={() => equip(stack.id)}
              >
                {equipped ? "On" : "Wear"}
              </SoftBtn>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function HeroPanel() {
  const player = useGame((s) => s.player);
  const unequip = useGame((s) => s.unequip);
  const renameWalker = useGame((s) => s.renameWalker);
  const toast = useGame((s) => s.toast);
  const { user } = useCurrentUserState();
  const [alias, setAlias] = useState(player?.name ?? "");
  const [busy, setBusy] = useState(false);
  if (!player) return null;
  const hero = player;
  const lin = LINEAGES.find((l) => l.id === player.lineage);
  const call = CALLINGS.find((c) => c.id === player.calling);
  const bonus = equippedBonus(player);
  const need = xpToNext(player.level);

  async function saveName() {
    const next = alias.trim().replace(/\s+/g, " ").slice(0, 24);
    if (next.length < 2) {
      toast("Pick a longer name.");
      return;
    }
    if (next.toLowerCase() === hero.name.toLowerCase() && next === hero.name) {
      toast("That is already your name.");
      return;
    }
    setBusy(true);
    try {
      if (user) {
        const claimed = await claimWalkerName({ data: next });
        renameWalker(claimed.name);
      } else {
        const { taken } = await nameIsTaken({ data: next });
        if (taken && next.toLowerCase() !== hero.name.toLowerCase()) {
          toast("Another walker already bears that name.");
          return;
        }
        renameWalker(next);
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "That name will not hold.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-xl text-fg">{player.name}</h3>
        <p className="text-sm text-muted">
          {lin?.name} {call?.name} · Lv {player.level}
        </p>
        <p className="mt-1 text-xs tabular-nums text-faint">
          XP {player.xp}/{need} · Str {player.strength} · Atk +{bonus.atk} · Def +{bonus.def}
        </p>
      </div>
      <label className="block text-xs tracking-wide text-muted uppercase">
        Walker name
        <div className="mt-1.5 flex gap-2">
          <input
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            maxLength={24}
            className="h-11 min-w-0 flex-1 rounded-md bg-raised px-3 text-base text-fg ring-1 ring-border outline-none"
          />
          <SoftBtn disabled={busy} onClick={() => void saveName()}>
            {busy ? "Checking…" : "Change"}
          </SoftBtn>
        </div>
      </label>
      <p className="text-xs text-faint">Names are unique. If another walker holds it, pick another.</p>
      <div className="grid grid-cols-1 gap-2">
        {SLOTS.map((slot) => {
          const id = player.equipment[slot];
          const def = id ? ITEMS[id] : null;
          return (
            <div key={slot} className="flex items-center gap-3 rounded-md bg-raised px-2 py-2 ring-1 ring-border">
              <Pixel src={iconSrc(def?.icon ?? (slot === "weapon" ? "sword" : "armor"))} size={32} className={def ? "" : "opacity-40"} />
              <div className="min-w-0 flex-1">
                <div className="text-[11px] tracking-wide text-muted uppercase">{slot}</div>
                <div className="font-display text-sm text-fg">{def?.name ?? "Empty"}</div>
              </div>
              {id ? (
                <SoftBtn className="px-2 text-xs" onClick={() => unequip(slot)}>
                  Remove
                </SoftBtn>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CraftPanel() {
  const player = useGame((s) => s.player);
  const screen = useGame((s) => s.screen);
  const craft = useGame((s) => s.craft);
  if (!player) return null;
  return (
    <ul className="space-y-2">
      {RECIPES.map((r) => {
        const locked =
          (r.station === "house" && screen !== "house") || (r.station === "guild" && !player.guild);
        const can = r.ins.every((n) => countItem(player.inventory, n.id) >= n.qty);
        const out = ITEMS[r.out.id];
        return (
          <li key={r.id} className="rounded-md bg-raised px-3 py-3 ring-1 ring-border">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Pixel src={iconSrc(out?.icon ?? "hammer")} size={32} />
                <div>
                  <div className="font-display text-sm text-fg">{r.name}</div>
                  <div className="text-[11px] text-muted">
                    {r.station} · {r.ins.map((n) => `${n.qty} ${ITEMS[n.id]?.name ?? n.id}`).join(", ")}
                  </div>
                </div>
              </div>
              <SoftBtn primary disabled={!can || locked} className="px-2 text-xs" onClick={() => craft(r.id)}>
                {locked ? "Locked" : "Make"}
              </SoftBtn>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function GuildPanel() {
  const player = useGame((s) => s.player);
  const createGuild = useGame((s) => s.createGuild);
  const joinGuild = useGame((s) => s.joinGuild);
  const applyGuild = useGame((s) => s.applyGuild);
  const renameGuild = useGame((s) => s.renameGuild);
  const setGuildMotd = useGame((s) => s.setGuildMotd);
  const addGuildMember = useGame((s) => s.addGuildMember);
  const kickGuildMember = useGame((s) => s.kickGuildMember);
  const setGuildRank = useGame((s) => s.setGuildRank);
  const leaveGuild = useGame((s) => s.leaveGuild);
  const travelGuild = useGame((s) => s.travelGuild);
  const toast = useGame((s) => s.toast);
  const { user } = useCurrentUserState();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [rename, setRename] = useState("");
  const [motd, setMotd] = useState("");
  const [invite, setInvite] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    void loadMyGuild()
      .then((g) => {
        if (g) applyGuild(g);
      })
      .catch(() => undefined);
  }, [user, applyGuild]);

  if (!player) return null;

  async function run(fn: () => Promise<GuildState | { left: true } | void>, fallback: () => void) {
    setBusy(true);
    try {
      if (user) {
        const result = await fn();
        if (result && "code" in result) applyGuild(result);
        else if (result && "left" in result) applyGuild(null);
      } else {
        fallback();
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "The hall would not answer.");
      fallback();
    } finally {
      setBusy(false);
    }
  }

  if (player.guild) {
    const city = settlementById(player.guild.cityId);
    const rank = rankOf(player.guild, player.name);
    const leader = rank === "leader";
    const officer = canManage(rank);
    return (
      <div className="space-y-3">
        <div>
          <h3 className="font-display text-lg text-fg">{player.guild.name}</h3>
          <p className="text-sm text-muted">
            Hall in {city?.name ?? "a mapped town"} · {rank ? rankLabel(rank) : "Walker"}
          </p>
          <p className="mt-1 font-display text-xs tracking-wide text-gold">{player.guild.code}</p>
          {player.guild.motd ? <p className="mt-2 text-sm text-fg">“{player.guild.motd}”</p> : null}
        </div>
        <SoftBtn
          className="w-full"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(player.guild!.code);
              setCopied(true);
              setTimeout(() => setCopied(false), 1400);
            } catch {
              /* ignore */
            }
          }}
        >
          {copied ? "Code copied" : "Copy guild code"}
        </SoftBtn>

        {leader ? (
          <label className="block text-xs tracking-wide text-muted uppercase">
            Rename company
            <div className="mt-1.5 flex gap-2">
              <input
                value={rename}
                onChange={(e) => setRename(e.target.value)}
                className="h-11 min-w-0 flex-1 rounded-md bg-raised px-3 text-base text-fg ring-1 ring-border outline-none"
                placeholder={player.guild.name}
              />
              <SoftBtn
                disabled={busy}
                onClick={() =>
                  void run(
                    () => renameGuildCloud({ data: { name: rename } }),
                    () => renameGuild(rename),
                  )
                }
              >
                Set
              </SoftBtn>
            </div>
          </label>
        ) : null}

        {officer ? (
          <label className="block text-xs tracking-wide text-muted uppercase">
            Hall word
            <div className="mt-1.5 flex gap-2">
              <input
                value={motd}
                onChange={(e) => setMotd(e.target.value)}
                className="h-11 min-w-0 flex-1 rounded-md bg-raised px-3 text-base text-fg ring-1 ring-border outline-none"
                placeholder="Walk together."
              />
              <SoftBtn
                disabled={busy}
                onClick={() =>
                  void run(
                    () => setMotdCloud({ data: { motd } }),
                    () => setGuildMotd(motd),
                  )
                }
              >
                Post
              </SoftBtn>
            </div>
          </label>
        ) : null}

        <p className="text-sm text-muted">Members · {player.guild.members.length}</p>
        <ul className="space-y-1">
          {player.guild.members.map((m) => (
            <li key={m.id} className="flex items-center gap-2 rounded-md bg-raised px-3 py-2 ring-1 ring-border">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-fg">{m.name}</p>
                <p className="text-[11px] tracking-wide text-gold uppercase">{rankLabel(m.rank)}</p>
              </div>
              {leader && m.rank !== "leader" ? (
                <button
                  type="button"
                  className="min-h-11 text-xs text-muted"
                  disabled={busy}
                  onClick={() =>
                    void run(
                      () =>
                        setGuildRankCloud({
                          data: { memberId: m.id, rank: m.rank === "officer" ? "member" : "officer" },
                        }),
                      () => setGuildRank(m.id, m.rank === "officer" ? "member" : "officer"),
                    )
                  }
                >
                  {m.rank === "officer" ? "Demote" : "Officer"}
                </button>
              ) : null}
              {officer && m.rank !== "leader" && m.name !== player.name ? (
                <button
                  type="button"
                  className="min-h-11 text-xs text-hp"
                  disabled={busy}
                  onClick={() =>
                    void run(
                      () => kickGuildMemberCloud({ data: { memberId: m.id } }),
                      () => kickGuildMember(m.id),
                    )
                  }
                >
                  Kick
                </button>
              ) : null}
            </li>
          ))}
        </ul>

        {officer ? (
          <label className="block text-xs tracking-wide text-muted uppercase">
            Add walker
            <div className="mt-1.5 flex gap-2">
              <input
                value={invite}
                onChange={(e) => setInvite(e.target.value)}
                className="h-11 min-w-0 flex-1 rounded-md bg-raised px-3 text-base text-fg ring-1 ring-border outline-none"
                placeholder="Name"
              />
              <SoftBtn
                disabled={busy}
                onClick={() => {
                  const n = invite.trim();
                  if (!n) return;
                  void run(
                    () => addGuildMemberCloud({ data: { name: n } }),
                    () => addGuildMember(n),
                  );
                  setInvite("");
                }}
              >
                Add
              </SoftBtn>
            </div>
          </label>
        ) : null}

        <SoftBtn className="w-full" onClick={() => travelGuild()}>
          Fold to the hall
        </SoftBtn>
        <SoftBtn
          className="w-full"
          disabled={busy}
          onClick={() =>
            void run(
              () => leaveGuildCloud(),
              () => leaveGuild(),
            )
          }
        >
          Leave the hall
        </SoftBtn>
        <p className="text-xs text-faint">Leaders rename and grant officers. Officers add and kick walkers. Share the code so friends can swear in.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Raise a company in this town, or swear in with a guild code.</p>
      <label className="block text-xs tracking-wide text-muted uppercase">
        Company name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1.5 h-11 w-full rounded-md bg-raised px-3 text-base text-fg ring-1 ring-border outline-none"
          placeholder="Ashwalkers"
        />
      </label>
      <SoftBtn
        primary
        className="w-full"
        disabled={busy}
        onClick={() => {
          const city = nearestCity(player.lat, player.lng).city;
          void run(
            () =>
              createGuildCloud({
                data: { name: name || "Ashwalkers", cityId: city.id, walkerName: player.name },
              }),
            () => createGuild(name),
          );
        }}
      >
        Raise a hall
      </SoftBtn>
      <label className="block text-xs tracking-wide text-muted uppercase">
        Guild code
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="mt-1.5 h-11 w-full rounded-md bg-raised px-3 text-base text-fg ring-1 ring-border outline-none"
          placeholder="GL-XXXXX"
        />
      </label>
      <SoftBtn
        className="w-full"
        disabled={busy}
        onClick={() =>
          void run(
            () => joinGuildCloud({ data: { code, walkerName: player.name } }),
            () => joinGuild(code),
          )
        }
      >
        Swear in
      </SoftBtn>
    </div>
  );
}

function StorePanel() {
  const player = useGame((s) => s.player);
  const buy = useGame((s) => s.buy);
  const creditVault = useGame((s) => s.creditVault);
  const toast = useGame((s) => s.toast);
  const { user, isPending } = useCurrentUserState();
  const [tab, setTab] = useState<"supplies" | "vault">("vault");
  const [pick, setPick] = useState<VaultPack | null>(null);
  const [busy, setBusy] = useState(false);
  if (!player) return null;

  async function pay(pack: VaultPack) {
    if (!user) return;
    setBusy(true);
    try {
      const grant = await buyVaultPack({ data: pack.id });
      creditVault(grant);
      toast(`${grant.name} is yours. ${packGrantLine(pack)}.`);
      setPick(null);
    } catch (e) {
      toast(e instanceof Error ? e.message : "The Vault would not open.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Gold {player.gold} · Veilmarks {player.veilmarks} · Revives {player.revives}
      </p>
      <div className="flex gap-1 rounded-md bg-raised p-1 ring-1 ring-border">
        <button
          type="button"
          className={cn("min-h-10 flex-1 rounded-sm font-display text-xs tracking-wide", tab === "vault" ? "bg-surface text-fg" : "text-muted")}
          onClick={() => setTab("vault")}
        >
          Crown Vault
        </button>
        <button
          type="button"
          className={cn("min-h-10 flex-1 rounded-sm font-display text-xs tracking-wide", tab === "supplies" ? "bg-surface text-fg" : "text-muted")}
          onClick={() => setTab("supplies")}
        >
          Supplies
        </button>
      </div>

      {tab === "vault" ? (
        <div className="space-y-2">
          <p className="text-sm text-fg">
            Buy Veilmarks and gold with US dollars. Packs bind to your signed-in account.
          </p>
          {isPending ? <div className="h-12 animate-pulse rounded-md bg-raised" /> : null}
          {!isPending && !user ? (
            <Link
              to="/login"
              className="flex min-h-11 items-center justify-center rounded-md bg-accent px-3 font-display text-sm text-accent-fg"
            >
              Sign in to buy
            </Link>
          ) : null}
          {VAULT_PACKS.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-md bg-raised px-2 py-2 ring-1 ring-border">
              <Pixel src={iconSrc(p.icon)} size={36} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-sm text-fg">{p.name}</span>
                  {p.tag === "popular" ? <span className="text-[10px] tracking-wide text-gold uppercase">Favored</span> : null}
                  {p.tag === "best" ? <span className="text-[10px] tracking-wide text-gold uppercase">Best</span> : null}
                </div>
                <p className="text-xs text-muted">{packGrantLine(p)}</p>
              </div>
              <SoftBtn
                primary
                className="px-2 text-xs"
                disabled={!user || busy}
                onClick={() => setPick(p)}
              >
                {formatUsd(p.usdCents)}
              </SoftBtn>
            </div>
          ))}
          {pick ? (
            <div className="rounded-md bg-surface p-3 ring-1 ring-border">
              <p className="font-display text-sm text-fg">Pay {formatUsd(pick.usdCents)}</p>
              <p className="mt-1 text-sm text-muted">
                {pick.name} — {packGrantLine(pick)}. Charged in US dollars to your signed-in account.
              </p>
              <div className="mt-3 flex gap-2">
                <SoftBtn primary className="flex-1" disabled={busy} onClick={() => void pay(pick)}>
                  {busy ? "Opening…" : `Pay ${formatUsd(pick.usdCents)}`}
                </SoftBtn>
                <SoftBtn className="flex-1" disabled={busy} onClick={() => setPick(null)}>
                  Not now
                </SoftBtn>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <ul className="space-y-2">
          {STORE_OFFERS.map((o) => (
            <li key={o.id} className="flex items-center gap-3 rounded-md bg-raised px-2 py-2 ring-1 ring-border">
              <Pixel src={iconSrc(o.icon)} size={36} />
              <div className="min-w-0 flex-1">
                <div className="font-display text-sm text-fg">{o.name}</div>
                <p className="text-xs text-muted">{o.desc}</p>
              </div>
              <div className="flex flex-col gap-1">
                <SoftBtn className="px-2 text-xs" onClick={() => buy(o.id, "gold")}>
                  {o.gold}g
                </SoftBtn>
                {o.veilmarks ? (
                  <SoftBtn className="px-2 text-xs" onClick={() => buy(o.id, "veilmarks")}>
                    {o.veilmarks} vm
                  </SoftBtn>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function InvitePanel() {
  const player = useGame((s) => s.player);
  const getInvite = useGame((s) => s.getInvite);
  const travelInvite = useGame((s) => s.travelInvite);
  const travelCity = useGame((s) => s.travelCity);
  const travelGuild = useGame((s) => s.travelGuild);
  const travelFriend = useGame((s) => s.travelFriend);
  const { user } = useCurrentUserState();
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [shareLabel, setShareLabel] = useState("Text the beta");
  const [pals, setPals] = useState<FriendRow[]>([]);
  const mine = player ? getInvite() : "";
  const nearest = player ? nearestCity(player.lat, player.lng) : null;
  const bound = useMemo(() => {
    if (!player) return [];
    const list = [...(player.boundTowns ?? [])];
    const seen = new Set<string>();
    return list.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }, [player]);

  useEffect(() => {
    if (!user) return;
    void listFriends()
      .then((r) => setPals(r.friends.filter((f) => f.status === "accepted")))
      .catch(() => setPals([]));
  }, [user]);

  if (!player) return null;
  return (
    <div className="space-y-4">
      <div className="rounded-md bg-raised p-3 ring-1 ring-border">
        <p className="font-display text-sm text-fg">Closed beta</p>
        <p className="mt-1 text-sm text-muted">
          Send a link. Friends open it in Safari or Chrome, then add Veilborne to their Home Screen.
        </p>
        <SoftBtn
          primary
          className="mt-3 w-full"
          onClick={() => {
            void shareBeta().then((how) => {
              setShareLabel(how === "copied" ? "Copied — paste in Messages" : "Sent");
              setTimeout(() => setShareLabel("Text the beta"), 1800);
            });
          }}
        >
          {shareLabel}
        </SoftBtn>
        <p className="mt-2 text-xs text-faint">iPhone: Safari → Share → Add to Home Screen. Android: Chrome → Install app.</p>
      </div>
      <div>
        <p className="text-xs tracking-wide text-muted uppercase">Your invite</p>
        <div className="mt-1 flex gap-2">
          <code className="flex-1 rounded-md bg-raised px-3 py-2.5 text-sm text-gold ring-1 ring-border">{mine}</code>
          <SoftBtn
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(mine);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              } catch {
                /* ignore */
              }
            }}
          >
            {copied ? "Copied" : "Copy"}
          </SoftBtn>
        </div>
        <p className="mt-2 text-xs text-faint">Friends fold the Veil to your feet with this code.</p>
      </div>
      <label className="block text-xs tracking-wide text-muted uppercase">
        Friend or guild invite
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="mt-1.5 h-11 w-full rounded-md bg-raised px-3 text-base text-fg ring-1 ring-border outline-none"
          placeholder="VB-…"
        />
      </label>
      <SoftBtn primary className="w-full" onClick={() => travelInvite(code)}>
        Step through
      </SoftBtn>
      <p className="text-xs tracking-wide text-muted uppercase">Bound roads</p>
      {player.guild ? (
        <SoftBtn primary className="w-full" onClick={() => travelGuild()}>
          Fold to {player.guild.name} hall
        </SoftBtn>
      ) : null}
      {pals.length ? (
        <div className="space-y-1.5">
          <p className="text-xs tracking-wide text-muted uppercase">Friends</p>
          {pals.map((f) => (
            <SoftBtn
              key={f.otherId}
              className="w-full"
              disabled={f.lat == null || f.lng == null}
              onClick={() => {
                if (f.lat == null || f.lng == null) return;
                travelFriend(f.lat, f.lng, f.name);
              }}
            >
              {f.lat == null ? `${f.name} · no last shore` : `Fold to ${f.name}`}
            </SoftBtn>
          ))}
        </div>
      ) : user ? (
        <p className="text-sm text-muted">Add a friend, then fold to their last shore from here.</p>
      ) : (
        <p className="text-sm text-muted">Sign in to fold to friends.</p>
      )}
      {bound.length === 0 ? (
        <p className="text-sm text-muted">Walk into a town to bind its stone. Then you can fold back anytime.</p>
      ) : (
        <div className="grid grid-cols-2 gap-1.5">
          {bound.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => travelCity(c.id)}
              className={cn(
                "min-h-11 rounded-md px-2 text-left text-sm ring-1 ring-border",
                nearest?.city.id === c.id ? "bg-accent/20 text-fg" : "bg-raised text-fg",
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BuildPanel() {
  const player = useGame((s) => s.player);
  const placeHouse = useGame((s) => s.placeHouse);
  const enterHouse = useGame((s) => s.enterHouse);
  if (!player) return null;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Claim this plot. A house lets you sleep, forge iron, and bind Quick Revives. Relocating costs 80 gold.
      </p>
      <SoftBtn primary className="w-full" onClick={placeHouse}>
        {player.house ? "Move house here (80g)" : "Raise a house"}
      </SoftBtn>
      {player.house ? (
        <SoftBtn className="w-full" onClick={enterHouse}>
          Enter house
        </SoftBtn>
      ) : null}
    </div>
  );
}

function JournalPanel() {
  const player = useGame((s) => s.player);
  if (!player) return null;
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-lg text-fg">Crown shards</h3>
        <p className="text-sm text-muted">
          {player.shards} / {SHARD_GOAL} — cave bosses drop the rest.
        </p>
        <div className="mt-2 h-2 overflow-hidden rounded-sm bg-raised ring-1 ring-border">
          <div
            className="h-full bg-gold"
            style={{ width: `${Math.min(100, (player.shards / SHARD_GOAL) * 100)}%` }}
          />
        </div>
      </div>
      <div className="space-y-2 text-sm leading-relaxed text-muted">
        {STORY.map((l) => (
          <p key={l}>{l}</p>
        ))}
      </div>
      <p className="text-xs text-faint">{COMPANY}</p>
      <AccountJournal />
      <SoftBtn
        danger
        className="w-full"
        onClick={() => {
          if (confirm("Forget this walker on this device and in the Veil?")) {
            void forgetWalkerEverywhere();
          }
        }}
      >
        Forget this walker
      </SoftBtn>
    </div>
  );
}

function AccountJournal() {
  const { user, isPending } = useCurrentUserState();
  return (
    <div className="rounded-md bg-raised px-3 py-3 ring-1 ring-border">
      <p className="font-display text-xs tracking-wide text-muted uppercase">Linked account</p>
      {isPending ? (
        <div className="mt-2 h-8 w-full animate-pulse rounded-md bg-surface" />
      ) : user ? (
        <div className="mt-2 text-fg">
          <UserButton />
          <p className="mt-1.5 text-xs text-muted">
            Signed in. The Veil keeps this walker on every phone that uses this account.
          </p>
        </div>
      ) : (
        <div className="mt-2">
          <p className="text-sm text-muted">
            Sign in with Google to pick this walker up on another device. X and email work too.
          </p>
          <Link
            to="/login"
            className="mt-2 flex min-h-11 items-center justify-center rounded-md bg-accent px-3 font-display text-sm text-accent-fg"
          >
            Link Google
          </Link>
        </div>
      )}
    </div>
  );
}

