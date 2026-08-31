import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { VAULT_PACKS } from "./vault";

export const buyVaultPack = createServerFn({ method: "POST" })
  .validator((sku: string) => {
    const pack = VAULT_PACKS.find((p) => p.id === sku);
    if (!pack) throw new Error("Unknown pack");
    return pack.id;
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data: sku }) => {
    const pack = VAULT_PACKS.find((p) => p.id === sku);
    if (!pack) throw new Error("Unknown pack");
    const sql = await getSql();
    const recent = await sql.query<{ n: number }>(
      "select count(*)::int as n from vault_orders where user_id = $1 and created_at > now() - interval '30 seconds'",
      [context.userId],
    );
    if ((recent[0]?.n ?? 0) >= 6) throw new Error("The Vault is busy. Wait a breath.");
    await sql.query(
      `insert into vault_orders (user_id, sku, usd_cents, gold, veilmarks, revives)
       values ($1, $2, $3, $4, $5, $6)`,
      [context.userId, pack.id, pack.usdCents, pack.gold, pack.veilmarks, pack.revives],
    );
    return {
      id: pack.id,
      name: pack.name,
      usdCents: pack.usdCents,
      gold: pack.gold,
      veilmarks: pack.veilmarks,
      revives: pack.revives,
    };
  });

export const listVaultOrders = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    return sql.query<{ sku: string; usd_cents: number; created_at: string }>(
      `select sku, usd_cents, created_at::text as created_at
       from vault_orders
       where user_id = $1
       order by id desc
       limit 8`,
      [context.userId],
    );
  });
