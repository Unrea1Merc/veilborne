import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import type { Player } from "./types";

export type CloudSave = {
  version: number;
  player: Player | null;
  defeated: Record<string, number>;
  mapStyle: "veil" | "sat";
  savedAt: number;
};

const saveSchema = z.object({
  version: z.number().int().min(1).max(20),
  player: z.unknown().nullable(),
  defeated: z.record(z.string(), z.number()).default({}),
  mapStyle: z.enum(["veil", "sat"]).default("veil"),
  savedAt: z.number().int(),
});

function parsePayload(raw: string): CloudSave | null {
  try {
    const parsed = saveSchema.parse(JSON.parse(raw));
    return parsed as CloudSave;
  } catch {
    return null;
  }
}

export const loadWalkerSave = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<CloudSave | null> => {
    const sql = await getSql();
    const rows = await sql.query<{ payload: string }>(
      "select payload from walker_saves where user_id = $1",
      [context.userId],
    );
    const raw = rows[0]?.payload;
    if (!raw) return null;
    return parsePayload(raw);
  });

export const pushWalkerSave = createServerFn({ method: "POST" })
  .validator((data: CloudSave) => {
    const parsed = saveSchema.parse(data);
    const json = JSON.stringify(parsed);
    if (json.length > 120_000) throw new Error("Save too large");
    return json;
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data: json }) => {
    const sql = await getSql();
    await sql.query(
      `insert into walker_saves (user_id, payload, updated_at)
       values ($1, $2, now())
       on conflict (user_id)
       do update set payload = excluded.payload, updated_at = now()`,
      [context.userId, json],
    );
    return { ok: true as const };
  });

export const clearWalkerSave = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await sql.query("delete from walker_saves where user_id = $1", [context.userId]);
    return { ok: true as const };
  });
