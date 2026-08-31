import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { WANDER_NAMES, npcIdFromName } from "./data";

export type FriendRow = {
  otherId: string;
  name: string;
  status: "pending" | "accepted" | "blocked";
  incoming: boolean;
  level: number;
};

export type MessageRow = {
  id: number;
  fromId: string;
  toId: string;
  fromMe: boolean;
  body: string;
  createdAt: string;
};

export type ParcelRow = {
  id: number;
  fromId: string;
  toId: string;
  fromName: string;
  toName: string;
  fromMe: boolean;
  kind: "gift" | "trade";
  gold: number;
  items: Array<{ id: string; qty: number }>;
  askGold: number;
  askItems: Array<{ id: string; qty: number }>;
  status: "pending" | "accepted" | "declined" | "claimed";
  createdAt: string;
};

export type ProfileRow = {
  userId: string;
  name: string;
  level: number;
};

const stackSchema = z.object({ id: z.string().max(40), qty: z.number().int().min(1).max(99) });

function isNpc(id: string) {
  return id.startsWith("npc:");
}

function parseParcelPayload(raw: string) {
  try {
    const p = JSON.parse(raw) as {
      gold?: number;
      items?: Array<{ id: string; qty: number }>;
      askGold?: number;
      askItems?: Array<{ id: string; qty: number }>;
    };
    return {
      gold: p.gold ?? 0,
      items: p.items ?? [],
      askGold: p.askGold ?? 0,
      askItems: p.askItems ?? [],
    };
  } catch {
    return { gold: 0, items: [], askGold: 0, askItems: [] };
  }
}

const NPC_LINES = [
  "The Veil is thin tonight. Watch the parks.",
  "Meet me by the old oak if you find a shard.",
  "Guild roads are safer in pairs.",
  "I left a draught by the waystone — or I thought I did.",
  "Walk north at dusk. Wolves forget the lamp-light.",
  "Your cloak sits well. Don’t sell it cheap.",
];

function npcReply(name: string) {
  const line = NPC_LINES[Math.floor(Math.random() * NPC_LINES.length)]!;
  return `${name}: “${line}”`;
}

export const upsertProfile = createServerFn({ method: "POST" })
  .validator((data: { name: string; level: number; lat: number; lng: number }) => ({
    name: data.name.trim().slice(0, 24) || "Walker",
    level: Math.max(1, Math.min(99, Math.floor(data.level))),
    lat: data.lat,
    lng: data.lng,
  }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const clash = await sql.query<{ user_id: string }>(
      "select user_id from walker_profiles where lower(name) = lower($1) and user_id <> $2 limit 1",
      [data.name, context.userId],
    );
    const name = clash[0] ? undefined : data.name;
    if (name) {
      await sql.query(
        `insert into walker_profiles (user_id, name, level, lat, lng, updated_at)
         values ($1, $2, $3, $4, $5, now())
         on conflict (user_id) do update set
           name = excluded.name, level = excluded.level, lat = excluded.lat, lng = excluded.lng, updated_at = now()`,
        [context.userId, name, data.level, data.lat, data.lng],
      );
    } else {
      await sql.query(
        `insert into walker_profiles (user_id, name, level, lat, lng, updated_at)
         values ($1, $2, $3, $4, $5, now())
         on conflict (user_id) do update set
           level = excluded.level, lat = excluded.lat, lng = excluded.lng, updated_at = now()`,
        [context.userId, data.name, data.level, data.lat, data.lng],
      );
    }
    return { ok: true as const, nameTaken: Boolean(clash[0]) };
  });

export function cleanWalkerName(raw: string) {
  return raw.trim().replace(/\s+/g, " ").slice(0, 24);
}

export const nameIsTaken = createServerFn({ method: "GET" })
  .validator((q: string) => cleanWalkerName(q))
  .handler(async ({ data: name }): Promise<{ taken: boolean }> => {
    if (name.length < 2) return { taken: true };
    const sql = await getSql();
    const rows = await sql.query<{ user_id: string }>(
      "select user_id from walker_profiles where lower(name) = lower($1) limit 1",
      [name],
    );
    return { taken: Boolean(rows[0]) };
  });

export const claimWalkerName = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((q: string) => cleanWalkerName(q))
  .handler(async ({ context, data: name }): Promise<{ name: string }> => {
    if (name.length < 2) throw new Error("Pick a longer name.");
    const sql = await getSql();
    const clash = await sql.query<{ user_id: string }>(
      "select user_id from walker_profiles where lower(name) = lower($1) and user_id <> $2 limit 1",
      [name, context.userId],
    );
    if (clash[0]) throw new Error("Another walker already bears that name.");
    await sql.query(
      `insert into walker_profiles (user_id, name, level, lat, lng, updated_at)
       values ($1, $2, 1, null, null, now())
       on conflict (user_id) do update set name = excluded.name, updated_at = now()`,
      [context.userId, name],
    );
    await sql.query("update guild_members set name = $2 where user_id = $1", [context.userId, name]);
    return { name };
  });

export const listFriends = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ friends: FriendRow[]; blocked: FriendRow[] }> => {
    const sql = await getSql();
    const rows = await sql.query<{
      from_id: string;
      to_id: string;
      from_name: string;
      to_name: string;
      status: string;
    }>(
      `select from_id, to_id, from_name, to_name, status
       from friendships
       where from_id = $1 or to_id = $1
       order by created_at desc`,
      [context.userId],
    );
    const blockedIds = new Set(
      (
        await sql.query<{ blocked_id: string }>("select blocked_id from blocks where user_id = $1", [
          context.userId,
        ])
      ).map((r) => r.blocked_id),
    );
    const friends: FriendRow[] = [];
    for (const r of rows) {
      const incoming = r.to_id === context.userId;
      const otherId = incoming ? r.from_id : r.to_id;
      const name = incoming ? r.from_name : r.to_name;
      if (r.status === "blocked" && !incoming) continue;
      friends.push({
        otherId,
        name,
        status: r.status as FriendRow["status"],
        incoming,
        level: 1,
      });
    }
    const blocked: FriendRow[] = [];
    if (blockedIds.size) {
      const ids = [...blockedIds];
      const ph = ids.map((_, i) => `$${i + 1}`).join(",");
      const profs = await sql.query<{ user_id: string; name: string; level: number }>(
        `select user_id, name, level from walker_profiles where user_id in (${ph})`,
        ids,
      );
      for (const p of profs) {
        blocked.push({ otherId: p.user_id, name: p.name, status: "blocked", incoming: false, level: p.level });
      }
      for (const id of ids) {
        if (!blocked.some((b) => b.otherId === id)) {
          blocked.push({ otherId: id, name: id.replace(/^npc:/, ""), status: "blocked", incoming: false, level: 1 });
        }
      }
    }
    return { friends, blocked };
  });

export const searchWalkers = createServerFn({ method: "GET" })
  .validator((q: string) => q.trim().slice(0, 40))
  .middleware([authMiddleware])
  .handler(async ({ context, data: q }): Promise<ProfileRow[]> => {
    const sql = await getSql();
    const blocked = (
      await sql.query<{ blocked_id: string }>("select blocked_id from blocks where user_id = $1", [context.userId])
    ).map((r) => r.blocked_id);
    const like = `%${q.replace(/%/g, "")}%`;
    const rows = await sql.query<{ user_id: string; name: string; level: number }>(
      `select user_id, name, level from walker_profiles
       where user_id <> $1 and name ilike $2
       order by level desc, name asc
       limit 20`,
      [context.userId, like || "%"],
    );
    return rows
      .filter((r) => !blocked.includes(r.user_id))
      .map((r) => ({ userId: r.user_id, name: r.name, level: r.level }));
  });

export const requestFriend = createServerFn({ method: "POST" })
  .validator((data: { otherId: string; otherName: string; myName: string }) => ({
    otherId: data.otherId.slice(0, 80),
    otherName: data.otherName.trim().slice(0, 24) || "Walker",
    myName: data.myName.trim().slice(0, 24) || "Walker",
  }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    if (data.otherId === context.userId) throw new Error("You already walk with yourself.");
    const sql = await getSql();
    const blocked = await sql.query(
      "select 1 from blocks where (user_id = $1 and blocked_id = $2) or (user_id = $2 and blocked_id = $1) limit 1",
      [context.userId, data.otherId],
    );
    if (blocked.length) throw new Error("That road is closed.");
    const status = isNpc(data.otherId) ? "accepted" : "pending";
    await sql.query(
      `insert into friendships (from_id, to_id, from_name, to_name, status)
       values ($1, $2, $3, $4, $5)
       on conflict (from_id, to_id) do update set status = excluded.status`,
      [context.userId, data.otherId, data.myName, data.otherName, status],
    );
    if (isNpc(data.otherId)) {
      await sql.query("insert into messages (from_id, to_id, body) values ($1, $2, $3)", [
        data.otherId,
        context.userId,
        `${data.otherName} clasps your forearm. “Then we walk the same map.”`,
      ]);
    }
    return { status };
  });

export const acceptFriend = createServerFn({ method: "POST" })
  .validator((otherId: string) => otherId.slice(0, 80))
  .middleware([authMiddleware])
  .handler(async ({ context, data: otherId }) => {
    const sql = await getSql();
    await sql.query(
      `update friendships set status = 'accepted' where from_id = $1 and to_id = $2 and status = 'pending'`,
      [otherId, context.userId],
    );
    return { ok: true as const };
  });

export const removeFriend = createServerFn({ method: "POST" })
  .validator((otherId: string) => otherId.slice(0, 80))
  .middleware([authMiddleware])
  .handler(async ({ context, data: otherId }) => {
    const sql = await getSql();
    await sql.query(
      `delete from friendships where (from_id = $1 and to_id = $2) or (from_id = $2 and to_id = $1)`,
      [context.userId, otherId],
    );
    return { ok: true as const };
  });

export const blockWalker = createServerFn({ method: "POST" })
  .validator((otherId: string) => otherId.slice(0, 80))
  .middleware([authMiddleware])
  .handler(async ({ context, data: otherId }) => {
    const sql = await getSql();
    await sql.query(
      `insert into blocks (user_id, blocked_id) values ($1, $2) on conflict do nothing`,
      [context.userId, otherId],
    );
    await sql.query(
      `delete from friendships where (from_id = $1 and to_id = $2) or (from_id = $2 and to_id = $1)`,
      [context.userId, otherId],
    );
    return { ok: true as const };
  });

export const unblockWalker = createServerFn({ method: "POST" })
  .validator((otherId: string) => otherId.slice(0, 80))
  .middleware([authMiddleware])
  .handler(async ({ context, data: otherId }) => {
    const sql = await getSql();
    await sql.query("delete from blocks where user_id = $1 and blocked_id = $2", [context.userId, otherId]);
    return { ok: true as const };
  });

export const listThread = createServerFn({ method: "GET" })
  .validator((otherId: string) => otherId.slice(0, 80))
  .middleware([authMiddleware])
  .handler(async ({ context, data: otherId }): Promise<MessageRow[]> => {
    const sql = await getSql();
    const rows = await sql.query<{ id: number; from_id: string; to_id: string; body: string; created_at: string }>(
      `select id, from_id, to_id, body, created_at::text as created_at
       from messages
       where (from_id = $1 and to_id = $2) or (from_id = $2 and to_id = $1)
       order by id asc
       limit 80`,
      [context.userId, otherId],
    );
    return rows.map((r) => ({
      id: r.id,
      fromId: r.from_id,
      toId: r.to_id,
      fromMe: r.from_id === context.userId,
      body: r.body,
      createdAt: r.created_at,
    }));
  });

export const sendMessage = createServerFn({ method: "POST" })
  .validator((data: { otherId: string; body: string }) => ({
    otherId: data.otherId.slice(0, 80),
    body: data.body.trim().slice(0, 280),
  }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    if (!data.body) throw new Error("Say something.");
    const sql = await getSql();
    const blocked = await sql.query(
      "select 1 from blocks where (user_id = $1 and blocked_id = $2) or (user_id = $2 and blocked_id = $1) limit 1",
      [context.userId, data.otherId],
    );
    if (blocked.length) throw new Error("That walker will not hear you.");
    await sql.query("insert into messages (from_id, to_id, body) values ($1, $2, $3)", [
      context.userId,
      data.otherId,
      data.body,
    ]);
    if (isNpc(data.otherId)) {
      const name = WANDER_NAMES.find((n) => npcIdFromName(n) === data.otherId) ?? "A walker";
      await sql.query("insert into messages (from_id, to_id, body) values ($1, $2, $3)", [
        data.otherId,
        context.userId,
        npcReply(name),
      ]);
    }
    return { ok: true as const };
  });

export const listParcels = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<ParcelRow[]> => {
    const sql = await getSql();
    const rows = await sql.query<{
      id: number;
      from_id: string;
      to_id: string;
      from_name: string;
      to_name: string;
      kind: string;
      payload: string;
      status: string;
      created_at: string;
    }>(
      `select id, from_id, to_id, from_name, to_name, kind, payload, status, created_at::text as created_at
       from parcels
       where from_id = $1 or to_id = $1
       order by id desc
       limit 40`,
      [context.userId],
    );
    return rows.map((r) => {
      const p = parseParcelPayload(r.payload);
      return {
        id: r.id,
        fromId: r.from_id,
        toId: r.to_id,
        fromName: r.from_name,
        toName: r.to_name,
        fromMe: r.from_id === context.userId,
        kind: r.kind as "gift" | "trade",
        gold: p.gold,
        items: p.items,
        askGold: p.askGold,
        askItems: p.askItems,
        status: r.status as ParcelRow["status"],
        createdAt: r.created_at,
      };
    });
  });

export const sendParcel = createServerFn({ method: "POST" })
  .validator((data: {
    otherId: string;
    otherName: string;
    myName: string;
    kind: "gift" | "trade";
    gold: number;
    items: Array<{ id: string; qty: number }>;
    askGold?: number;
    askItems?: Array<{ id: string; qty: number }>;
  }) => {
    const items = z.array(stackSchema).max(6).parse(data.items);
    const askItems = z.array(stackSchema).max(6).parse(data.askItems ?? []);
    return {
      otherId: data.otherId.slice(0, 80),
      otherName: data.otherName.trim().slice(0, 24) || "Walker",
      myName: data.myName.trim().slice(0, 24) || "Walker",
      kind: data.kind,
      gold: Math.max(0, Math.min(99999, Math.floor(data.gold))),
      items,
      askGold: Math.max(0, Math.min(99999, Math.floor(data.askGold ?? 0))),
      askItems,
    };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const payload = JSON.stringify({
      gold: data.gold,
      items: data.items,
      askGold: data.askGold,
      askItems: data.askItems,
    });
    const npcAccept = isNpc(data.otherId) && data.kind === "gift";
    const status = npcAccept ? "claimed" : "pending";
    await sql.query(
      `insert into parcels (from_id, to_id, from_name, to_name, kind, payload, status)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [context.userId, data.otherId, data.myName, data.otherName, data.kind, payload, status],
    );
    if (isNpc(data.otherId) && data.kind === "gift") {
      await sql.query(
        `insert into parcels (from_id, to_id, from_name, to_name, kind, payload, status)
         values ($1, $2, $3, $4, 'gift', $5, 'pending')`,
        [
          data.otherId,
          context.userId,
          data.otherName,
          data.myName,
          JSON.stringify({ gold: 8, items: [{ id: "herb", qty: 2 }], askGold: 0, askItems: [] }),
        ],
      );
      await sql.query("insert into messages (from_id, to_id, body) values ($1, $2, $3)", [
        data.otherId,
        context.userId,
        `${data.otherName} presses a small bundle into your hands. “For the road.”`,
      ]);
    }
    if (isNpc(data.otherId) && data.kind === "trade") {
      await sql.query(`update parcels set status = 'accepted' where from_id = $1 and to_id = $2 and status = 'pending'`, [
        context.userId,
        data.otherId,
      ]);
    }
    return { ok: true as const, auto: isNpc(data.otherId) };
  });

export const respondParcel = createServerFn({ method: "POST" })
  .validator((data: { id: number; action: "accept" | "decline" | "claim" }) => data)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql.query<{
      id: number;
      from_id: string;
      to_id: string;
      kind: string;
      payload: string;
      status: string;
    }>("select id, from_id, to_id, kind, payload, status from parcels where id = $1", [data.id]);
    const row = rows[0];
    if (!row) throw new Error("That parcel is gone.");
    if (row.to_id !== context.userId && row.from_id !== context.userId) throw new Error("Not your parcel.");
    if (data.action === "decline") {
      if (row.to_id !== context.userId) throw new Error("Not yours to refuse.");
      await sql.query("update parcels set status = 'declined' where id = $1 and to_id = $2", [data.id, context.userId]);
      return { ok: true as const, payload: parseParcelPayload(row.payload), kind: row.kind, action: "decline" as const };
    }
    if (data.action === "claim" || data.action === "accept") {
      if (row.to_id !== context.userId) throw new Error("Not yours to take.");
      const next = row.kind === "gift" ? "claimed" : "accepted";
      await sql.query("update parcels set status = $1 where id = $2 and to_id = $3 and status = 'pending'", [
        next,
        data.id,
        context.userId,
      ]);
      return {
        ok: true as const,
        payload: parseParcelPayload(row.payload),
        kind: row.kind,
        action: data.action,
      };
    }
    return { ok: true as const, payload: parseParcelPayload(row.payload), kind: row.kind, action: data.action };
  });
