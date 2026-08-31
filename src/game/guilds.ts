import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import type { GuildMember, GuildRank, GuildState } from "./types";
import { memberIdFromName } from "./guild-model";

function asGuild(code: string, name: string, cityId: string, motd: string, members: GuildMember[]): GuildState {
  const leader = members.find((m) => m.rank === "leader");
  return { code, name, cityId, motd, leaderId: leader?.id ?? members[0]?.id ?? "", members };
}

async function loadGuild(code: string): Promise<GuildState | null> {
  const sql = await getSql();
  const g = await sql.query<{ name: string; city_id: string; motd: string }>(
    "select name, city_id, motd from guilds where code = $1",
    [code],
  );
  if (!g[0]) return null;
  const members = await sql.query<{ user_id: string; name: string; rank: string }>(
    "select user_id, name, rank from guild_members where code = $1 order by joined_at asc",
    [code],
  );
  return asGuild(
    code,
    g[0].name,
    g[0].city_id,
    g[0].motd,
    members.map((m) => ({
      id: m.user_id,
      name: m.name,
      rank: m.rank === "leader" || m.rank === "officer" ? (m.rank as GuildRank) : "member",
    })),
  );
}

async function rankIn(code: string, userId: string): Promise<GuildRank | null> {
  const sql = await getSql();
  const rows = await sql.query<{ rank: string }>(
    "select rank from guild_members where code = $1 and user_id = $2",
    [code, userId],
  );
  const r = rows[0]?.rank;
  if (r === "leader" || r === "officer" || r === "member") return r;
  return null;
}

async function loadCodeFor(userId: string): Promise<string | null> {
  const sql = await getSql();
  const rows = await sql.query<{ code: string }>(
    "select code from guild_members where user_id = $1 limit 1",
    [userId],
  );
  return rows[0]?.code ?? null;
}

async function requireGuild(userId: string): Promise<GuildState> {
  const code = await loadCodeFor(userId);
  if (!code) throw new Error("You walk without a company.");
  const g = await loadGuild(code);
  if (!g) throw new Error("You walk without a company.");
  return g;
}

export const loadMyGuild = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<GuildState | null> => {
    const code = await loadCodeFor(context.userId);
    if (!code) return null;
    return loadGuild(code);
  });

export const createGuildCloud = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      name: z.string().min(1).max(22),
      cityId: z.string().min(1).max(64),
      walkerName: z.string().min(1).max(24),
    }),
  )
  .handler(async ({ context, data }): Promise<GuildState> => {
    const existing = await loadCodeFor(context.userId);
    if (existing) {
      const g = await loadGuild(existing);
      if (g) return g;
    }
    const code = `GL-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const name = data.name.trim().slice(0, 22) || "Unnamed Company";
    const sql = await getSql();
    await sql.query(
      "insert into guilds (code, name, city_id, motd, created_by) values ($1, $2, $3, '', $4)",
      [code, name, data.cityId, context.userId],
    );
    await sql.query(
      "insert into guild_members (code, user_id, name, rank) values ($1, $2, $3, 'leader')",
      [code, context.userId, data.walkerName.trim().slice(0, 24)],
    );
    return (await loadGuild(code))!;
  });

export const joinGuildCloud = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ code: z.string().min(4).max(16), walkerName: z.string().min(1).max(24) }))
  .handler(async ({ context, data }): Promise<GuildState> => {
    const code = data.code.trim().toUpperCase();
    const g = await loadGuild(code);
    if (!g) throw new Error("That guild code is not known.");
    const sql = await getSql();
    const mine = await sql.query<{ code: string }>(
      "select code from guild_members where user_id = $1 limit 1",
      [context.userId],
    );
    if (mine[0] && mine[0].code !== code) throw new Error("Leave your company before swearing a new oath.");
    await sql.query(
      `insert into guild_members (code, user_id, name, rank) values ($1, $2, $3, 'member')
       on conflict (code, user_id) do update set name = excluded.name`,
      [code, context.userId, data.walkerName.trim().slice(0, 24)],
    );
    const next = await loadGuild(code);
    if (!next) throw new Error("The hall would not open.");
    return next;
  });

export const renameGuildCloud = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ name: z.string().min(1).max(22) }))
  .handler(async ({ context, data }): Promise<GuildState> => {
    const mine = await requireGuild(context.userId);
    if (!mine) throw new Error("You walk without a company.");
    if ((await rankIn(mine.code, context.userId)) !== "leader") throw new Error("Only the leader may rename the hall.");
    const sql = await getSql();
    await sql.query("update guilds set name = $2 where code = $1", [mine.code, data.name.trim().slice(0, 22)]);
    return (await loadGuild(mine.code))!;
  });

export const setMotdCloud = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ motd: z.string().max(140) }))
  .handler(async ({ context, data }): Promise<GuildState> => {
    const mine = await requireGuild(context.userId);
    if (!mine) throw new Error("You walk without a company.");
    const rank = await rankIn(mine.code, context.userId);
    if (rank !== "leader" && rank !== "officer") throw new Error("Officers set the hall word.");
    const sql = await getSql();
    await sql.query("update guilds set motd = $2 where code = $1", [mine.code, data.motd.trim().slice(0, 140)]);
    return (await loadGuild(mine.code))!;
  });

export const addGuildMemberCloud = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ name: z.string().min(1).max(24) }))
  .handler(async ({ context, data }): Promise<GuildState> => {
    const mine = await requireGuild(context.userId);
    if (!mine) throw new Error("You walk without a company.");
    const rank = await rankIn(mine.code, context.userId);
    if (rank !== "leader" && rank !== "officer") throw new Error("Only leaders and officers may add walkers.");
    const name = data.name.trim().slice(0, 24);
    const sql = await getSql();
    const found = await sql.query<{ user_id: string; name: string }>(
      "select user_id, name from walker_profiles where lower(name) = lower($1) limit 1",
      [name],
    );
    const userId = found[0]?.user_id ?? memberIdFromName(name);
    const display = found[0]?.name ?? name;
    await sql.query(
      `insert into guild_members (code, user_id, name, rank) values ($1, $2, $3, 'member')
       on conflict (code, user_id) do nothing`,
      [mine.code, userId, display],
    );
    return (await loadGuild(mine.code))!;
  });

export const kickGuildMemberCloud = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ memberId: z.string().min(1).max(80) }))
  .handler(async ({ context, data }): Promise<GuildState> => {
    const mine = await requireGuild(context.userId);
    if (!mine) throw new Error("You walk without a company.");
    const me = await rankIn(mine.code, context.userId);
    const target = mine.members.find((m) => m.id === data.memberId);
    if (!target) throw new Error("They do not walk this hall.");
    if (target.rank === "leader") throw new Error("The leader cannot be turned out.");
    if (me !== "leader" && !(me === "officer" && target.rank === "member")) {
      throw new Error("You cannot turn them out.");
    }
    const sql = await getSql();
    await sql.query("delete from guild_members where code = $1 and user_id = $2", [mine.code, data.memberId]);
    return (await loadGuild(mine.code))!;
  });

export const setGuildRankCloud = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ memberId: z.string().min(1).max(80), rank: z.enum(["officer", "member"]) }))
  .handler(async ({ context, data }): Promise<GuildState> => {
    const mine = await requireGuild(context.userId);
    if (!mine) throw new Error("You walk without a company.");
    if ((await rankIn(mine.code, context.userId)) !== "leader") throw new Error("Only the leader grants rank.");
    if (data.memberId === context.userId) throw new Error("You already hold the hall.");
    const sql = await getSql();
    await sql.query("update guild_members set rank = $3 where code = $1 and user_id = $2", [
      mine.code,
      data.memberId,
      data.rank,
    ]);
    return (await loadGuild(mine.code))!;
  });

export const leaveGuildCloud = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ left: true }> => {
    const code = await loadCodeFor(context.userId);
    if (!code) return { left: true };
    const mine = await loadGuild(code);
    if (!mine) return { left: true };
    const sql = await getSql();
    const me = await rankIn(mine.code, context.userId);
    await sql.query("delete from guild_members where code = $1 and user_id = $2", [mine.code, context.userId]);
    if (me === "leader") {
      const next = await sql.query<{ user_id: string }>(
        "select user_id from guild_members where code = $1 order by joined_at asc limit 1",
        [mine.code],
      );
      if (next[0]) {
        await sql.query("update guild_members set rank = 'leader' where code = $1 and user_id = $2", [
          mine.code,
          next[0].user_id,
        ]);
      } else {
        await sql.query("delete from guilds where code = $1", [mine.code]);
      }
    }
    return { left: true };
  });
