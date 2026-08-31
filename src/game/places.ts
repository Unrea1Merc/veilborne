import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { City } from "./types";

type NominatimAddress = {
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  suburb?: string;
  municipality?: string;
  county?: string;
};

type NominatimReverse = {
  lat?: string;
  lon?: string;
  name?: string;
  address?: NominatimAddress;
};

function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "place";
}

export const lookupTown = createServerFn({ method: "GET" })
  .inputValidator(z.object({ lat: z.number(), lng: z.number() }))
  .handler(async ({ data }): Promise<City | null> => {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${data.lat}&lon=${data.lng}&zoom=14&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Veilborne/1.0 (Unrea1Merc Game Studios; https://github.com/Unrea1Merc/veilborne)",
      },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as NominatimReverse;
    const addr = body.address ?? {};
    const name =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.hamlet ||
      addr.suburb ||
      addr.municipality ||
      body.name;
    if (!name) return null;
    const size: City["size"] = addr.city ? "city" : addr.town ? "town" : "hamlet";
    const lat = Number(body.lat);
    const lng = Number(body.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return {
      id: `osm:${slug(name)}`,
      name,
      lat,
      lng,
      size,
    };
  });
