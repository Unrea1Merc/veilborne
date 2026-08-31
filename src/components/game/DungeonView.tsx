import { useEffect, useRef } from "react";
import { DUNGEON_COLS, DUNGEON_ROWS } from "@/game/dungeon";
import { useGame } from "@/game/store";
import { playerFrame } from "./widgets";
import { CLOAKS } from "@/game/data";
import { MONSTERS } from "@/game/data";

const TILES = "/art/dungeon-tiles.png";
const SRC = 256;
const SHEET = 4;

export function DungeonView() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const dungeon = useGame((s) => s.dungeon);
  const player = useGame((s) => s.player);
  const frame = useGame((s) => s.frame);
  const images = useRef<Map<string, HTMLImageElement>>(new Map());

  useEffect(() => {
    const load = (src: string) => {
      if (images.current.has(src)) return;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = src;
      images.current.set(src, img);
    };
    load(TILES);
    load("/sprites/props/chest.png");
    for (const d of ["down", "left", "right", "up"] as const) {
      for (let i = 1; i <= 4; i++) load(`/sprites/player/${d}-${i}.png`);
    }
    for (const m of Object.values(MONSTERS)) load(m.sprite);
  }, []);

  useEffect(() => {
    const c = canvas.current;
    const d = dungeon;
    const p = player;
    if (!c || !d || !p) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const parent = c.parentElement;
      const w = parent?.clientWidth ?? 390;
      const h = parent?.clientHeight ?? 640;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (c.width !== Math.floor(w * dpr) || c.height !== Math.floor(h * dpr)) {
        c.width = Math.floor(w * dpr);
        c.height = Math.floor(h * dpr);
        c.style.width = `${w}px`;
        c.style.height = `${h}px`;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = "#10140e";
      ctx.fillRect(0, 0, w, h);

      const pad = 8;
      const tile = Math.max(22, Math.floor(Math.min((w - pad * 2) / DUNGEON_COLS, (h - pad * 2) / DUNGEON_ROWS)));
      const ox = Math.floor((w - tile * DUNGEON_COLS) / 2);
      const oy = Math.floor((h - tile * DUNGEON_ROWS) / 2);
      const sheet = images.current.get(TILES);

      for (let y = 0; y < d.rows; y++) {
        for (let x = 0; x < d.cols; x++) {
          const t = d.tiles[y * d.cols + x] ?? 4;
          const sx = (t % SHEET) * SRC;
          const sy = Math.floor(t / SHEET) * SRC;
          if (sheet && sheet.complete) {
            ctx.drawImage(sheet, sx, sy, SRC, SRC, ox + x * tile, oy + y * tile, tile, tile);
          } else {
            ctx.fillStyle = t >= 4 && t <= 7 ? "#242a1e" : "#3a4634";
            ctx.fillRect(ox + x * tile, oy + y * tile, tile, tile);
          }
        }
      }

      for (const a of d.actors) {
        const ax = ox + a.x * tile;
        const ay = oy + a.y * tile;
        if (a.kind === "chest") {
          const img = images.current.get("/sprites/props/chest.png");
          if (img?.complete && !a.opened) ctx.drawImage(img, ax, ay, tile, tile);
          else if (a.opened) {
            ctx.fillStyle = "#c4b58a55";
            ctx.fillRect(ax + tile * 0.25, ay + tile * 0.4, tile * 0.5, tile * 0.35);
          }
        } else if (a.kind === "stairs") {
          ctx.fillStyle = "#e8eadc";
          ctx.fillRect(ax + tile * 0.3, ay + tile * 0.3, tile * 0.4, tile * 0.4);
        } else {
          const mid = a.monsterId ?? "goblin";
          const src = MONSTERS[mid]?.sprite;
          const img = src ? images.current.get(src) : undefined;
          if (img?.complete) ctx.drawImage(img, ax, ay - 4, tile, tile);
        }
      }

      const ps = playerFrame(d.dir, frame);
      let pimg = images.current.get(ps);
      if (!pimg) {
        pimg = new Image();
        pimg.src = ps;
        images.current.set(ps, pimg);
      }
      ctx.save();
      const hue = CLOAKS[p.cloak]?.hue ?? 0;
      if (hue) ctx.filter = `hue-rotate(${hue}deg)`;
      if (pimg.complete) {
        ctx.drawImage(pimg, ox + d.px * tile, oy + d.py * tile - 6, tile, tile);
      }
      ctx.restore();
    };

    let raf = 0;
    const loop = () => {
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [dungeon, player, frame]);

  return <canvas ref={canvas} className="absolute inset-0 size-full touch-none" />;
}
