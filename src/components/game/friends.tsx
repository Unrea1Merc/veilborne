import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ITEMS, iconSrc } from "@/game/data";
import { addStack, takeStack } from "@/game/combat";
import { useGame } from "@/game/store";
import {
  acceptFriend,
  blockWalker,
  listFriends,
  listParcels,
  listThread,
  removeFriend,
  requestFriend,
  respondParcel,
  searchWalkers,
  sendMessage,
  sendParcel,
  unblockWalker,
  type FriendRow,
  type MessageRow,
  type ParcelRow,
  type ProfileRow,
} from "@/game/social";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Pixel, SoftBtn } from "./widgets";

type Tab = "list" | "find" | "mail" | "parcels";

export function FriendsPanel() {
  const { user, isPending } = useCurrentUserState();
  const player = useGame((s) => s.player);
  const target = useGame((s) => s.socialTarget);
  const setSocialTarget = useGame((s) => s.setSocialTarget);
  const toast = useGame((s) => s.toast);
  const travelFriend = useGame((s) => s.travelFriend);
  const [tab, setTab] = useState<Tab>(target ? "mail" : "list");
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [blocked, setBlocked] = useState<FriendRow[]>([]);
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<ProfileRow[]>([]);
  const [thread, setThread] = useState<MessageRow[]>([]);
  const [draft, setDraft] = useState("");
  const [parcels, setParcels] = useState<ParcelRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [giftGold, setGiftGold] = useState(0);
  const [giftItem, setGiftItem] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const active = target ?? (friends.find((f) => f.status === "accepted") ? { id: friends.find((f) => f.status === "accepted")!.otherId, name: friends.find((f) => f.status === "accepted")!.name } : null);

  async function refresh() {
    try {
      const [f, p] = await Promise.all([listFriends(), listParcels()]);
      setFriends(f.friends);
      setBlocked(f.blocked);
      setParcels(p);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load friends.");
    }
  }

  useEffect(() => {
    if (isPending || !user) return;
    void refresh();
  }, [user, isPending]);

  useEffect(() => {
    if (!user || !active) return;
    void listThread({ data: active.id })
      .then(setThread)
      .catch(() => setThread([]));
  }, [user, active?.id]);

  const accepted = friends.filter((f) => f.status === "accepted");
  const pendingIn = friends.filter((f) => f.status === "pending" && f.incoming);
  const pendingOut = friends.filter((f) => f.status === "pending" && !f.incoming);
  const giftables = useMemo(() => {
    if (!player) return [];
    return player.inventory.filter((s) => ITEMS[s.id]?.kind === "consumable" || ITEMS[s.id]?.kind === "material");
  }, [player]);

  if (isPending) return <div className="h-16 animate-pulse rounded-md bg-raised" />;
  if (!user) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-fg">Link an account to add walkers, send mail, trade, and gift.</p>
        <Link
          to="/login"
          className="flex min-h-11 items-center justify-center rounded-md bg-accent px-3 font-display text-sm text-accent-fg"
        >
          Link Google
        </Link>
      </div>
    );
  }

  async function add(id: string, name: string) {
    if (!player) return;
    setBusy(true);
    try {
      await requestFriend({ data: { otherId: id, otherName: name, myName: player.name } });
      toast(`${name} is on your road.`);
      setSocialTarget({ id, name });
      await refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not add.");
    } finally {
      setBusy(false);
    }
  }

  async function sendMail() {
    if (!active || !draft.trim()) return;
    setBusy(true);
    try {
      await sendMessage({ data: { otherId: active.id, body: draft } });
      setDraft("");
      setThread(await listThread({ data: active.id }));
    } catch (e) {
      toast(e instanceof Error ? e.message : "Message failed.");
    } finally {
      setBusy(false);
    }
  }

  async function give() {
    if (!player || !active) return;
    const gold = Math.max(0, Math.floor(giftGold));
    const items = giftItem ? [{ id: giftItem, qty: 1 }] : [];
    if (gold <= 0 && items.length === 0) {
      toast("Choose gold or an item.");
      return;
    }
    if (gold > player.gold) {
      toast("Not enough gold.");
      return;
    }
    let inv = player.inventory;
    if (giftItem) {
      const next = takeStack(inv, giftItem, 1);
      if (!next) {
        toast("You do not carry that.");
        return;
      }
      inv = next;
    }
    useGame.setState({ player: { ...player, gold: player.gold - gold, inventory: inv } });
    setBusy(true);
    try {
      await sendParcel({
        data: {
          otherId: active.id,
          otherName: active.name,
          myName: player.name,
          kind: "gift",
          gold,
          items,
        },
      });
      toast(`Gift sent to ${active.name}.`);
      setGiftGold(0);
      setGiftItem("");
      await refresh();
      setThread(await listThread({ data: active.id }));
    } catch (e) {
      useGame.setState({ player });
      toast(e instanceof Error ? e.message : "Gift failed.");
    } finally {
      setBusy(false);
    }
  }

  async function trade() {
    if (!player || !active) return;
    const gold = Math.max(0, Math.floor(giftGold));
    const items = giftItem ? [{ id: giftItem, qty: 1 }] : [];
    if (gold <= 0 && items.length === 0) {
      toast("Offer something.");
      return;
    }
    if (gold > player.gold) {
      toast("Not enough gold.");
      return;
    }
    let inv = player.inventory;
    if (giftItem) {
      const next = takeStack(inv, giftItem, 1);
      if (!next) {
        toast("You do not carry that.");
        return;
      }
      inv = next;
    }
    useGame.setState({ player: { ...player, gold: player.gold - gold, inventory: inv } });
    setBusy(true);
    try {
      const res = await sendParcel({
        data: {
          otherId: active.id,
          otherName: active.name,
          myName: player.name,
          kind: "trade",
          gold,
          items,
          askGold: 5,
          askItems: [{ id: "herb", qty: 1 }],
        },
      });
      if (res.auto) {
        const p = useGame.getState().player;
        if (p) {
          useGame.setState({
            player: { ...p, gold: p.gold + 5, inventory: addStack(p.inventory, "herb", 1) },
          });
        }
        toast(`${active.name} accepts the trade.`);
      } else {
        toast(`Trade offered to ${active.name}.`);
      }
      setGiftGold(0);
      setGiftItem("");
      await refresh();
    } catch (e) {
      useGame.setState({ player });
      toast(e instanceof Error ? e.message : "Trade failed.");
    } finally {
      setBusy(false);
    }
  }

  async function takeParcel(p: ParcelRow, action: "accept" | "decline" | "claim") {
    const me = useGame.getState().player;
    if (!me) return;
    setBusy(true);
    try {
      const res = await respondParcel({ data: { id: p.id, action } });
      if (action === "decline") {
        toast("Parcel refused.");
      } else {
        let gold = me.gold + res.payload.gold;
        let inv = me.inventory;
        for (const it of res.payload.items) inv = addStack(inv, it.id, it.qty);
        if (p.kind === "trade") {
          gold -= res.payload.askGold;
          for (const it of res.payload.askItems) {
            const next = takeStack(inv, it.id, it.qty);
            if (next) inv = next;
          }
        }
        useGame.setState({ player: { ...me, gold: Math.max(0, gold), inventory: inv } });
        toast(p.kind === "gift" ? "Gift claimed." : "Trade done.");
      }
      await refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1 rounded-md bg-raised p-1 ring-1 ring-border">
        {(["list", "find", "mail", "parcels"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`min-h-10 flex-1 rounded-sm font-display text-xs tracking-wide capitalize ${tab === t ? "bg-surface text-fg" : "text-muted"}`}
          >
            {t === "list" ? "Friends" : t === "find" ? "Add" : t === "mail" ? "Mail" : "Gifts"}
          </button>
        ))}
      </div>
      {err ? <p className="text-sm text-hp">{err}</p> : null}

      {tab === "list" ? (
        <div className="space-y-3">
          {pendingIn.length ? (
            <div>
              <p className="font-display text-xs tracking-wide text-muted uppercase">Asks</p>
              {pendingIn.map((f) => (
                <Row key={f.otherId} name={f.name} meta="wants to walk with you">
                  <SoftBtn className="px-3" onClick={() => void acceptFriend({ data: f.otherId }).then(refresh)}>
                    Accept
                  </SoftBtn>
                  <SoftBtn className="px-3" onClick={() => void removeFriend({ data: f.otherId }).then(refresh)}>
                    No
                  </SoftBtn>
                </Row>
              ))}
            </div>
          ) : null}
          {accepted.length === 0 && pendingOut.length === 0 ? (
            <p className="text-sm text-muted">No friends yet. Add a walker from the map, or search a name.</p>
          ) : null}
          {accepted.map((f) => (
            <Row key={f.otherId} name={f.name} meta="friend">
              <SoftBtn
                className="px-3"
                disabled={f.lat == null || f.lng == null}
                onClick={() => {
                  if (f.lat == null || f.lng == null) {
                    toast(`${f.name} has no last shore yet.`);
                    return;
                  }
                  travelFriend(f.lat, f.lng, f.name);
                }}
              >
                Fold
              </SoftBtn>
              <SoftBtn className="px-3" onClick={() => { setSocialTarget({ id: f.otherId, name: f.name }); setTab("mail"); }}>
                Mail
              </SoftBtn>
              <SoftBtn className="px-3" onClick={() => { setSocialTarget({ id: f.otherId, name: f.name }); setTab("parcels"); }}>
                Gift
              </SoftBtn>
              <SoftBtn className="px-3" onClick={() => void removeFriend({ data: f.otherId }).then(refresh)}>
                Remove
              </SoftBtn>
              <SoftBtn danger className="px-3" onClick={() => void blockWalker({ data: f.otherId }).then(refresh)}>
                Block
              </SoftBtn>
            </Row>
          ))}
          {pendingOut.map((f) => (
            <Row key={f.otherId} name={f.name} meta="waiting">
              <SoftBtn className="px-3" onClick={() => void removeFriend({ data: f.otherId }).then(refresh)}>
                Cancel
              </SoftBtn>
            </Row>
          ))}
          {blocked.length ? (
            <div>
              <p className="font-display text-xs tracking-wide text-muted uppercase">Blocked</p>
              {blocked.map((f) => (
                <Row key={f.otherId} name={f.name} meta="blocked">
                  <SoftBtn className="px-3" onClick={() => void unblockWalker({ data: f.otherId }).then(refresh)}>
                    Unblock
                  </SoftBtn>
                </Row>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "find" ? (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            void searchWalkers({ data: query }).then(setFound).catch(() => setFound([]));
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Walker name"
            className="h-11 w-full rounded-md bg-raised px-3 text-base text-fg ring-1 ring-border outline-none"
          />
          <SoftBtn type="submit" className="w-full" disabled={busy}>
            Search the Veil
          </SoftBtn>
          {found.map((p) => (
            <Row key={p.userId} name={p.name} meta={`Lv ${p.level}`}>
              <SoftBtn className="px-3" disabled={busy} onClick={() => void add(p.userId, p.name)}>
                Add
              </SoftBtn>
              <SoftBtn danger className="px-3" onClick={() => void blockWalker({ data: p.userId }).then(refresh)}>
                Block
              </SoftBtn>
            </Row>
          ))}
        </form>
      ) : null}

      {tab === "mail" ? (
        <div className="space-y-2">
          {active ? (
            <>
              <p className="font-display text-sm text-fg">{active.name}</p>
              <div className="max-h-44 space-y-1.5 overflow-y-auto rounded-md bg-raised px-3 py-2 ring-1 ring-border">
                {thread.length === 0 ? <p className="text-sm text-muted">No letters yet.</p> : null}
                {thread.map((m) => (
                  <p key={m.id} className={`text-sm ${m.fromMe ? "text-fg" : "text-muted"}`}>
                    {m.fromMe ? "You: " : ""}
                    {m.body}
                  </p>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write a line"
                  className="h-11 min-w-0 flex-1 rounded-md bg-raised px-3 text-base text-fg ring-1 ring-border outline-none"
                />
                <SoftBtn primary disabled={busy} onClick={() => void sendMail()}>
                  Send
                </SoftBtn>
              </div>
              {!accepted.some((f) => f.otherId === active.id) ? (
                <SoftBtn className="w-full" disabled={busy} onClick={() => void add(active.id, active.name)}>
                  Add {active.name}
                </SoftBtn>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted">Pick a friend, or approach a walker on the map.</p>
          )}
        </div>
      ) : null}

      {tab === "parcels" ? (
        <div className="space-y-3">
          {active ? (
            <div className="space-y-2 rounded-md bg-raised p-3 ring-1 ring-border">
              <p className="font-display text-sm text-fg">To {active.name}</p>
              <label className="block text-xs text-muted">
                Gold
                <input
                  type="number"
                  min={0}
                  value={giftGold}
                  onChange={(e) => setGiftGold(Number(e.target.value))}
                  className="mt-1 h-11 w-full rounded-md bg-surface px-3 text-base text-fg ring-1 ring-border outline-none"
                />
              </label>
              <div className="flex flex-wrap gap-1">
                {giftables.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setGiftItem(s.id)}
                    className={`flex min-h-11 items-center gap-1 rounded-md px-2 text-xs ring-1 ring-border ${giftItem === s.id ? "bg-accent text-accent-fg" : "bg-surface text-fg"}`}
                  >
                    <Pixel src={iconSrc(ITEMS[s.id]?.icon ?? "herb")} size={20} />
                    {ITEMS[s.id]?.name ?? s.id} ×{s.qty}
                  </button>
                ))}
                {giftables.length === 0 ? <p className="text-xs text-muted">Carry a draught or herb to gift.</p> : null}
              </div>
              <div className="flex gap-2">
                <SoftBtn primary className="flex-1" disabled={busy} onClick={() => void give()}>
                  Gift
                </SoftBtn>
                <SoftBtn className="flex-1" disabled={busy} onClick={() => void trade()}>
                  Trade
                </SoftBtn>
              </div>
              <p className="text-xs text-muted">Trade offers 5g and an herb in return from map walkers.</p>
            </div>
          ) : (
            <p className="text-sm text-muted">Choose a friend first.</p>
          )}
          {parcels.map((p) => (
            <div key={p.id} className="rounded-md bg-raised px-3 py-2 ring-1 ring-border">
              <p className="font-display text-sm text-fg">
                {p.kind === "gift" ? "Gift" : "Trade"} · {p.fromMe ? `to ${p.toName}` : `from ${p.fromName}`}
              </p>
              <p className="text-xs text-muted">
                {p.gold}g
                {p.items.map((i) => ` · ${ITEMS[i.id]?.name ?? i.id} ×${i.qty}`).join("")}
                {p.kind === "trade" ? ` for ${p.askGold}g` : ""}
                {` · ${p.status}`}
              </p>
              {!p.fromMe && p.status === "pending" ? (
                <div className="mt-2 flex gap-2">
                  <SoftBtn primary className="flex-1" disabled={busy} onClick={() => void takeParcel(p, p.kind === "gift" ? "claim" : "accept")}>
                    {p.kind === "gift" ? "Claim" : "Accept"}
                  </SoftBtn>
                  <SoftBtn className="flex-1" disabled={busy} onClick={() => void takeParcel(p, "decline")}>
                    Decline
                  </SoftBtn>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Row({ name, meta, children }: { name: string; meta: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md bg-raised px-3 py-2 ring-1 ring-border">
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-sm text-fg">{name}</p>
        <p className="text-xs text-muted">{meta}</p>
      </div>
      {children}
    </div>
  );
}
