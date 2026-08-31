import { CELL, CITIES, CITY_RADIUS_M, MONSTERS, WANDER_NAMES } from "./data";
import type { City, Dir, MonsterDef, WorldEntity } from "./types";

export function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function cellKey(lat: number, lng: number) {
  return `${Math.floor(lat / CELL)}_${Math.floor(lng / CELL)}`;
}

export function cellCenter(key: string) {
  const [i, j] = key.split("_").map(Number);
  return { lat: (i + 0.5) * CELL, lng: (j + 0.5) * CELL };
}

export function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dlat = ((lat2 - lat1) * Math.PI) / 180;
  const dlng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dlat / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dlng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function nearestCity(lat: number, lng: number): { city: City; meters: number } {
  let best = CITIES[0]!;
  let bestD = Infinity;
  for (const c of CITIES) {
    const d = haversine(lat, lng, c.lat, c.lng);
    if (d < bestD) {
      best = c;
      bestD = d;
    }
  }
  return { city: best, meters: bestD };
}

export function inMappedTown(lat: number, lng: number) {
  const n = nearestCity(lat, lng);
  return n.meters <= CITY_RADIUS_M ? n : null;
}

export function encodeInvite(lat: number, lng: number) {
  const a = Math.round((lat + 90) * 10000).toString(36).toUpperCase();
  const b = Math.round((lng + 180) * 10000).toString(36).toUpperCase();
  return `VB-${a}-${b}`;
}

export function decodeInvite(code: string): { lat: number; lng: number } | null {
  const m = code.trim().toUpperCase().match(/^VB-([0-9A-Z]+)-([0-9A-Z]+)$/);
  if (!m) return null;
  const lat = parseInt(m[1]!, 36) / 10000 - 90;
  const lng = parseInt(m[2]!, 36) / 10000 - 180;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -85 || lat > 85 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

export function metersToDeg(lat: number, northM: number, eastM: number) {
  const dLat = northM / 110540;
  const dLng = eastM / (111320 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
  return { dLat, dLng };
}

export function dirFromVector(north: number, east: number): Dir {
  if (Math.abs(north) >= Math.abs(east)) return north >= 0 ? "up" : "down";
  return east >= 0 ? "right" : "left";
}

export function yawFromVector(north: number, east: number) {
  return Math.atan2(-east, north);
}

export function isNight(date = new Date()) {
  const h = date.getHours();
  return h < 6 || h >= 20;
}

function pickMonster(rng: () => number, cave: boolean, urban: boolean): MonsterDef {
  const night = isNight();
  const pool = Object.values(MONSTERS).filter((m) => {
    if (m.tags.includes("boss")) return rng() < 0.04;
    if (cave) return m.tags.includes("cave") || m.tags.includes("wild");
    if (urban) return m.tags.includes("city") || m.tags.includes("wild");
    if (night) return m.tags.includes("night") || m.tags.includes("wild");
    return m.tags.includes("wild");
  });
  return pool[Math.floor(rng() * pool.length)] ?? MONSTERS.goblin!;
}

export function gatherEntities(
  lat: number,
  lng: number,
  defeated: Record<string, number>,
  house: { lat: number; lng: number } | null,
  guildCityId: string | null,
  now = Date.now(),
): WorldEntity[] {
  const out: WorldEntity[] = [];
  const ci = Math.floor(lat / CELL);
  const cj = Math.floor(lng / CELL);
  const urban = Boolean(inMappedTown(lat, lng));

  for (let di = -2; di <= 2; di++) {
    for (let dj = -2; dj <= 2; dj++) {
      const key = `${ci + di}_${cj + dj}`;
      const rng = mulberry32(hashStr(`vb:${key}`));
      const { lat: clat, lng: clng } = cellCenter(key);
      const jitter = (n: number) => (rng() - 0.5) * CELL * n;

      if (rng() < 0.55) {
        const m = pickMonster(rng, false, urban);
        const id = `m:${key}`;
        if (!defeated[id] || now - defeated[id]! > 180_000) {
          out.push({
            id,
            kind: "monster",
            lat: clat + jitter(0.7),
            lng: clng + jitter(0.7),
            name: m.name,
            sprite: m.sprite,
            level: 1 + Math.floor(rng() * 4),
            monsterId: m.id,
          });
        }
      }

      if (rng() < 0.16) {
        const id = `c:${key}`;
        out.push({
          id,
          kind: "cave",
          lat: clat + jitter(0.5),
          lng: clng + jitter(0.5),
          name: "Veil Cave",
          sprite: "/sprites/props/cave.png",
        });
      }

      if (rng() < 0.1) {
        const id = `t:${key}`;
        if (!defeated[id] || now - defeated[id]! > 300_000) {
          out.push({
            id,
            kind: "chest",
            lat: clat + jitter(0.6),
            lng: clng + jitter(0.6),
            name: "Waychest",
            sprite: "/sprites/props/chest.png",
          });
        }
      }

      if (rng() < 0.12) {
        const nm = WANDER_NAMES[Math.floor(rng() * WANDER_NAMES.length)]!;
        out.push({
          id: `w:${key}`,
          kind: "wanderer",
          lat: clat + jitter(0.8),
          lng: clng + jitter(0.8),
          name: nm,
          sprite: rng() < 0.5 ? "/sprites/classes/scout-down.png" : "/sprites/classes/mystic-down.png",
          level: 2 + Math.floor(rng() * 8),
          wandererTitle: rng() < 0.5 ? "guild scout" : "lone walker",
        });
      }
    }
  }

  const town = inMappedTown(lat, lng);
  if (town) {
    out.push({
      id: `city:${town.city.id}`,
      kind: "city",
      lat: town.city.lat,
      lng: town.city.lng,
      name: town.city.name,
      sprite: "/sprites/props/guild.png",
      cityId: town.city.id,
    });
    out.push({
      id: `shop:${town.city.id}`,
      kind: "shop",
      lat: town.city.lat + 0.00035,
      lng: town.city.lng + 0.0004,
      name: `${town.city.name} Store`,
      sprite: "/sprites/props/shop.png",
      cityId: town.city.id,
    });
    out.push({
      id: `guild:${town.city.id}`,
      kind: "guild",
      lat: town.city.lat - 0.00028,
      lng: town.city.lng - 0.00032,
      name: "Guild Hall",
      sprite: "/sprites/props/guild.png",
      cityId: town.city.id,
    });
  }

  if (house) {
    out.push({
      id: "house:mine",
      kind: "house",
      lat: house.lat,
      lng: house.lng,
      name: "Your House",
      sprite: "/sprites/props/house.png",
    });
  }

  if (guildCityId) {
    const g = CITIES.find((c) => c.id === guildCityId);
    if (g && !out.some((e) => e.id === `guild:${g.id}`)) {
      out.push({
        id: `guild:${g.id}`,
        kind: "guild",
        lat: g.lat,
        lng: g.lng,
        name: "Guild Hall",
        sprite: "/sprites/props/guild.png",
        cityId: g.id,
      });
    }
  }

  return out;
}

export function closestEntity(lat: number, lng: number, list: WorldEntity[], maxM: number) {
  let best: WorldEntity | null = null;
  let bestD = maxM;
  for (const e of list) {
    const d = haversine(lat, lng, e.lat, e.lng);
    if (d < bestD) {
      best = e;
      bestD = d;
    }
  }
  return best ? { entity: best, meters: bestD } : null;
}
