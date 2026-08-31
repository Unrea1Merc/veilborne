import type { GuildMember, GuildRank, GuildState } from "./types";

export function memberIdFromName(name: string) {
  return `w:${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "walker"}`;
}

export function normalizeGuild(raw: unknown): GuildState | null {
  if (!raw || typeof raw !== "object") return null;
  const g = raw as Partial<GuildState> & { members?: unknown };
  if (typeof g.name !== "string" || typeof g.code !== "string") return null;
  const members: GuildMember[] = [];
  if (Array.isArray(g.members)) {
    for (const m of g.members) {
      if (typeof m === "string") {
        members.push({ id: memberIdFromName(m), name: m, rank: members.length === 0 ? "leader" : "member" });
      } else if (m && typeof m === "object" && "name" in m) {
        const row = m as GuildMember;
        members.push({
          id: row.id || memberIdFromName(row.name),
          name: row.name,
          rank: row.rank === "leader" || row.rank === "officer" ? row.rank : "member",
        });
      }
    }
  }
  const leaderId = typeof g.leaderId === "string" && g.leaderId ? g.leaderId : members.find((m) => m.rank === "leader")?.id ?? members[0]?.id ?? "";
  return {
    name: g.name.slice(0, 22),
    code: g.code,
    cityId: typeof g.cityId === "string" ? g.cityId : "",
    motd: typeof g.motd === "string" ? g.motd.slice(0, 140) : "",
    leaderId,
    members,
  };
}

export function rankOf(guild: GuildState, name: string): GuildRank | null {
  const id = memberIdFromName(name);
  const row = guild.members.find((m) => m.id === id || m.name === name);
  return row?.rank ?? null;
}

export function canManage(rank: GuildRank | null) {
  return rank === "leader" || rank === "officer";
}

export function rankLabel(rank: GuildRank) {
  if (rank === "leader") return "Leader";
  if (rank === "officer") return "Officer";
  return "Member";
}
