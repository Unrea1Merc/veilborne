import { hashStr, mulberry32 } from "./world";
import type { Dir, DungeonActor, DungeonState } from "./types";

export const DUNGEON_COLS = 13;
export const DUNGEON_ROWS = 11;

export function generateDungeon(seed: string): DungeonState {
  const rng = mulberry32(hashStr(seed));
  const cols = DUNGEON_COLS;
  const rows = DUNGEON_ROWS;
  const tiles = new Array<number>(cols * rows).fill(4);
  const walk = new Array<boolean>(cols * rows).fill(false);

  const idx = (x: number, y: number) => y * cols + x;
  const floorTile = () => [0, 1, 2, 3, 13][Math.floor(rng() * 5)]!;

  for (let y = 1; y < rows - 1; y++) {
    for (let x = 1; x < cols - 1; x++) {
      tiles[idx(x, y)] = floorTile();
      walk[idx(x, y)] = true;
    }
  }

  for (let x = 0; x < cols; x++) {
    tiles[idx(x, 0)] = 4;
    tiles[idx(x, rows - 1)] = 7;
    walk[idx(x, 0)] = false;
    walk[idx(x, rows - 1)] = false;
  }
  for (let y = 0; y < rows; y++) {
    tiles[idx(0, y)] = 5;
    tiles[idx(cols - 1, y)] = 6;
    walk[idx(0, y)] = false;
    walk[idx(cols - 1, y)] = false;
  }

  tiles[idx(1, 1)] = 9;
  tiles[idx(cols - 2, 1)] = 9;
  tiles[idx(1, rows - 2)] = 8;
  tiles[idx(cols - 2, rows - 2)] = 15;

  for (let i = 0; i < 8; i++) {
    const x = 2 + Math.floor(rng() * (cols - 4));
    const y = 2 + Math.floor(rng() * (rows - 4));
    if ((x === 2 && y === rows - 2) || (x === cols - 2 && y === 2)) continue;
    tiles[idx(x, y)] = rng() < 0.5 ? 15 : 10;
    walk[idx(x, y)] = false;
  }

  const px = 2;
  const py = rows - 2;
  walk[idx(px, py)] = true;
  tiles[idx(px, py)] = 0;

  const actors: DungeonActor[] = [];
  const used = new Set<string>([`${px},${py}`]);
  const place = (kind: DungeonActor["kind"], monsterId?: string) => {
    for (let tries = 0; tries < 40; tries++) {
      const x = 2 + Math.floor(rng() * (cols - 4));
      const y = 1 + Math.floor(rng() * (rows - 3));
      const k = `${x},${y}`;
      if (!walk[idx(x, y)] || used.has(k)) continue;
      used.add(k);
      actors.push({
        id: `${kind}-${x}-${y}`,
        kind,
        x,
        y,
        monsterId,
        opened: false,
      });
      return;
    }
  };

  const caveMobs = ["spider", "skeleton", "goblin", "wraith", "orc", "imp"] as const;
  const count = 3 + Math.floor(rng() * 3);
  for (let i = 0; i < count; i++) {
    place("monster", caveMobs[Math.floor(rng() * caveMobs.length)]);
  }
  place("chest");
  place("chest");
  const boss = rng() < 0.45 ? "dragon" : "troll";
  place("boss", boss);
  tiles[idx(cols - 2, 2)] = 11;
  walk[idx(cols - 2, 2)] = true;
  actors.push({ id: "stairs", kind: "stairs", x: cols - 2, y: 2 });

  const names = ["Hollow of Ash", "Mossvault", "Bonewell", "Underhearth", "Shardpit"];
  return {
    seed,
    name: names[Math.floor(rng() * names.length)]!,
    cols,
    rows,
    tiles,
    walk,
    actors,
    px,
    py,
    dir: "up",
    cleared: false,
  };
}

export function tryStep(d: DungeonState, dx: number, dy: number): DungeonState {
  const nx = d.px + dx;
  const ny = d.py + dy;
  let dir: Dir = d.dir;
  if (dx < 0) dir = "left";
  else if (dx > 0) dir = "right";
  else if (dy < 0) dir = "up";
  else if (dy > 0) dir = "down";
  if (nx < 0 || ny < 0 || nx >= d.cols || ny >= d.rows) return { ...d, dir };
  if (!d.walk[ny * d.cols + nx]) return { ...d, dir };
  return { ...d, px: nx, py: ny, dir };
}
