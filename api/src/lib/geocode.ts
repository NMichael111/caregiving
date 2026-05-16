export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

// Nominatim usage policy requires a descriptive User-Agent.
const USER_AGENT = "homecare-app/0.1 (Village Caregiving take-home)";

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", address);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const results = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
    }>;
    if (results.length === 0) return null;
    const r = results[0];
    return { lat: parseFloat(r.lat), lng: parseFloat(r.lon), displayName: r.display_name };
  } catch (err) {
    console.warn("[geocode] failed:", err);
    return null;
  }
}
