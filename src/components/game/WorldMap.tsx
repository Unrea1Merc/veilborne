import { useEffect, useRef, useState } from "react";
import type { Dir, WorldEntity } from "@/game/types";
import { useGame } from "@/game/store";
import { CLOAKS } from "@/game/data";
import { inMappedTown, nearestCity, settlementRadius } from "@/game/world";
import { playerFrame } from "./widgets";

export interface Ghost {
  id: string;
  name: string;
  lat: number;
  lng: number;
  dir: Dir;
  level: number;
  cloak: number;
}

const VEIL_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}";
const SAT_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const VEIL_ATTR = "Tiles © Esri";
const SAT_ATTR = "Tiles © Esri";

function markerHtml(src: string, size: number, cloak?: number, label?: string) {
  const hue = cloak != null ? (CLOAKS[cloak]?.hue ?? 0) : 0;
  const filter = cloak != null ? `filter:hue-rotate(${hue}deg)` : "";
  const tag = label
    ? `<span style="display:block;text-align:center;font:600 10px/1 Cinzel,serif;color:#e8eadc;text-shadow:0 1px 2px #10140e">${label}</span>`
    : "";
  return `<div class="vb-marker-inner"><img src="${src}" width="${size}" height="${size}" alt="" style="image-rendering:pixelated;${filter}" />${tag}</div>`;
}

export function WorldMap({ ghosts }: { ghosts: Ghost[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerRef = useRef<import("leaflet").TileLayer | null>(null);
  const playerMark = useRef<import("leaflet").Marker | null>(null);
  const entityMarks = useRef(new Map<string, import("leaflet").Marker>());
  const ghostMarks = useRef(new Map<string, import("leaflet").Marker>());
  const ringRef = useRef<import("leaflet").Circle | null>(null);
  const Lref = useRef<typeof import("leaflet") | null>(null);
  const [ready, setReady] = useState(false);

  const lat = useGame((s) => s.player?.lat ?? 35.2271);
  const lng = useGame((s) => s.player?.lng ?? -80.8431);
  const dir = useGame((s) => s.player?.dir ?? "down");
  const cloak = useGame((s) => s.player?.cloak ?? 0);
  const frame = useGame((s) => s.frame);
  const follow = useGame((s) => s.follow);
  const mapStyle = useGame((s) => s.mapStyle);
  const entities = useGame((s) => s.entities);
  const interact = useGame((s) => s.interact);
  const setFollow = useGame((s) => s.setFollow);

  useEffect(() => {
    let dead = false;
    void import("leaflet").then((mod) => {
      if (dead || !wrap.current) return;
      const L = mod.default;
      Lref.current = L;
      const map = L.map(wrap.current, {
        zoomControl: false,
        attributionControl: true,
        zoomSnap: 0.25,
        tapHold: false,
      }).setView([lat, lng], 17);
      mapRef.current = map;
      requestAnimationFrame(() => map.invalidateSize());
      const tiles = L.tileLayer(mapStyle === "sat" ? SAT_URL : VEIL_URL, {
        attribution: mapStyle === "sat" ? SAT_ATTR : VEIL_ATTR,
        maxZoom: 20,
        maxNativeZoom: 19,
      }).addTo(map);
      layerRef.current = tiles;
      wrap.current.classList.toggle("satellite", mapStyle === "sat");
      layerRef.current = tiles;
      map.on("dragstart", () => setFollow(false));
      const icon = L.divIcon({
        className: "vb-marker",
        html: markerHtml(playerFrame(dir, frame), 52, cloak),
        iconSize: [52, 64],
        iconAnchor: [26, 56],
      });
      playerMark.current = L.marker([lat, lng], { icon, zIndexOffset: 800 }).addTo(map);
      setReady(true);
    });
    return () => {
      dead = true;
      setReady(false);
      mapRef.current?.remove();
      mapRef.current = null;
      playerMark.current = null;
      entityMarks.current.clear();
      ghostMarks.current.clear();
      ringRef.current = null;
    };
    // mount once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const L = Lref.current;
    const map = mapRef.current;
    if (!L || !map) return;
    layerRef.current?.remove();
    layerRef.current = L.tileLayer(mapStyle === "sat" ? SAT_URL : VEIL_URL, {
      attribution: mapStyle === "sat" ? SAT_ATTR : VEIL_ATTR,
      maxZoom: 20,
      maxNativeZoom: 19,
    }).addTo(map);
    wrap.current?.classList.toggle("satellite", mapStyle === "sat");
  }, [mapStyle, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const sync = () => map.invalidateSize();
    sync();
    window.visualViewport?.addEventListener("resize", sync);
    window.addEventListener("resize", sync);
    return () => {
      window.visualViewport?.removeEventListener("resize", sync);
      window.removeEventListener("resize", sync);
    };
  }, [ready]);

  useEffect(() => {
    const mark = playerMark.current;
    const map = mapRef.current;
    if (!mark || !map) return;
    mark.setLatLng([lat, lng]);
    const root = mark.getElement();
    const img = root?.querySelector("img");
    const src = playerFrame(dir, frame);
    if (img instanceof HTMLImageElement && img.getAttribute("src") !== src) {
      img.setAttribute("src", src);
    }
    if (img instanceof HTMLImageElement) {
      const hue = CLOAKS[cloak]?.hue ?? 0;
      const next = `hue-rotate(${hue}deg)`;
      if (img.style.filter !== next) img.style.filter = next;
    }
    if (follow) {
      const now = performance.now();
      const last = (map as unknown as { _vbPan?: number })._vbPan ?? 0;
      if (now - last > 90) {
        (map as unknown as { _vbPan?: number })._vbPan = now;
        const c = map.getCenter();
        if (Math.abs(c.lat - lat) > 0.000015 || Math.abs(c.lng - lng) > 0.000015) {
          map.setView([lat, lng], map.getZoom(), { animate: false });
        }
      }
    }
  }, [lat, lng, dir, frame, cloak, follow, ready]);

  useEffect(() => {
    const L = Lref.current;
    const map = mapRef.current;
    if (!L || !map || !ready) return;
    const here = inMappedTown(lat, lng) ?? nearestCity(lat, lng);
    const show = here.meters <= settlementRadius(here.city) * 1.35;
    if (!show) {
      ringRef.current?.remove();
      ringRef.current = null;
      return;
    }
    const r = settlementRadius(here.city);
    if (!ringRef.current) {
      ringRef.current = L.circle([here.city.lat, here.city.lng], {
        radius: r,
        color: "#c9a44a",
        weight: 2,
        opacity: 0.55,
        fillColor: "#c9a44a",
        fillOpacity: 0.04,
        interactive: false,
      }).addTo(map);
    } else {
      ringRef.current.setLatLng([here.city.lat, here.city.lng]);
      ringRef.current.setRadius(r);
    }
  }, [lat, lng, ready]);

  useEffect(() => {
    const L = Lref.current;
    const map = mapRef.current;
    if (!L || !map) return;
    const keep = new Set<string>();
    for (const e of entities) {
      keep.add(e.id);
      const label =
        e.kind === "wanderer"
          ? e.name
          : e.kind === "city"
            ? e.name
            : e.kind === "shop"
              ? "Store"
              : e.kind === "guild"
                ? "Hall"
                : e.kind === "house"
                  ? "Home"
                  : undefined;
      const size =
        e.kind === "monster" ? 44 : e.kind === "wanderer" ? 40 : e.kind === "city" || e.kind === "shop" || e.kind === "guild" || e.kind === "house" ? 36 : 40;
      const html = markerHtml(e.sprite, size, undefined, label);
      const icon = L.divIcon({
        className: "vb-marker",
        html,
        iconSize: [size, size + 14],
        iconAnchor: [size / 2, size + 6],
      });
      let m = entityMarks.current.get(e.id);
      if (!m) {
        m = L.marker([e.lat, e.lng], { icon, zIndexOffset: e.kind === "monster" ? 400 : 300 }).addTo(map);
        m.on("click", () => {
          const target: WorldEntity | undefined = useGame.getState().entities.find((x) => x.id === e.id);
          useGame.getState().interact(target);
        });
        entityMarks.current.set(e.id, m);
        (m as unknown as { _vbSrc?: string })._vbSrc = html;
      } else {
        m.setLatLng([e.lat, e.lng]);
        if ((m as unknown as { _vbSrc?: string })._vbSrc !== html) {
          m.setIcon(icon);
          (m as unknown as { _vbSrc?: string })._vbSrc = html;
        }
      }
    }
    for (const [id, m] of entityMarks.current) {
      if (!keep.has(id)) {
        m.remove();
        entityMarks.current.delete(id);
      }
    }
  }, [entities, interact, ready]);

  useEffect(() => {
    const L = Lref.current;
    const map = mapRef.current;
    if (!L || !map) return;
    const keep = new Set<string>();
    for (const g of ghosts) {
      keep.add(g.id);
      const icon = L.divIcon({
        className: "vb-marker",
        html: markerHtml(playerFrame(g.dir, 1), 48, g.cloak, g.name),
        iconSize: [48, 64],
        iconAnchor: [24, 56],
      });
      let m = ghostMarks.current.get(g.id);
      if (!m) {
        m = L.marker([g.lat, g.lng], { icon, zIndexOffset: 700 }).addTo(map);
        ghostMarks.current.set(g.id, m);
        (m as unknown as { _vbSrc?: string })._vbSrc = g.id + g.dir;
      } else {
        m.setLatLng([g.lat, g.lng]);
        const key = g.id + g.dir;
        if ((m as unknown as { _vbSrc?: string })._vbSrc !== key) {
          m.setIcon(icon);
          (m as unknown as { _vbSrc?: string })._vbSrc = key;
        }
      }
    }
    for (const [id, m] of ghostMarks.current) {
      if (!keep.has(id)) {
        m.remove();
        ghostMarks.current.delete(id);
      }
    }
  }, [ghosts, ready]);

  return <div ref={wrap} className="vb-map absolute inset-0" />;
}
