import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ADDRESSES } from "../data/addresses";
import { GEO } from "../data/geo";

export type MapPanelProps = {
  checked: Record<string, boolean>;
  onToggle: (address: string) => void;
};

const DONE = "#2e7d5b";
const TODO = "#d64545";
const ME = "#1e73e8";

const POINTS = ADDRESSES.filter((a) => GEO[a]).map((a) => ({
  address: a,
  ...GEO[a],
}));

type Banner = { text: string; kind: "error" | "info" } | null;

function formatDist(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

export default function MapPanel({ checked, onToggle }: MapPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.CircleMarker>>({});
  const toggleRef = useRef(onToggle);
  toggleRef.current = onToggle;

  const checkedRef = useRef(checked);
  checkedRef.current = checked;

  const watchIdRef = useRef<number | null>(null);
  const meMarkerRef = useRef<L.CircleMarker | null>(null);
  const meAccuracyRef = useRef<L.Circle | null>(null);
  const lastPosRef = useRef<L.LatLng | null>(null);

  const guidingRef = useRef(false);
  const guideTargetRef = useRef<string | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const routeOriginRef = useRef<L.LatLng | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [hasFix, setHasFix] = useState(false);
  const [guiding, setGuiding] = useState(false);
  const [guideInfo, setGuideInfo] = useState<string | null>(null);
  const [banner, setBanner] = useState<Banner>(null);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showBanner = (text: string, kind: "error" | "info") => {
    setBanner({ text, kind });
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    if (kind === "info") {
      bannerTimer.current = setTimeout(() => setBanner(null), 4000);
    }
  };

  const styleMarker = (address: string) => {
    const m = markersRef.current[address];
    if (!m) return;
    const done = !!checkedRef.current[address];
    const isTarget = guideTargetRef.current === address;
    m.setStyle({
      fillColor: done ? DONE : TODO,
      color: isTarget ? ME : "#ffffff",
      weight: isTarget ? 4 : 2,
    });
    m.setRadius(isTarget ? 11 : 9);
  };

  const styleAllMarkers = () => {
    for (const p of POINTS) styleMarker(p.address);
  };

  const stopGuiding = () => {
    guidingRef.current = false;
    guideTargetRef.current = null;
    routeOriginRef.current = null;
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setGuiding(false);
    setGuideInfo(null);
    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }
    styleAllMarkers();
  };

  const drawRoute = (latlngs: L.LatLngExpression[], approx: boolean) => {
    const map = mapRef.current;
    if (!map) return;
    if (!routeLineRef.current) {
      routeLineRef.current = L.polyline(latlngs, {
        color: ME,
        weight: 5,
        opacity: 0.85,
      }).addTo(map);
    } else {
      routeLineRef.current.setLatLngs(latlngs);
    }
    routeLineRef.current.setStyle({
      dashArray: approx ? "6 8" : "",
      weight: approx ? 4 : 5,
    });
  };

  const fetchRoute = (
    from: L.LatLng,
    target: { address: string; street: string; lat: number; lon: number },
    crowDist: number
  ) => {
    setGuideInfo(`${target.street} ${target.address} · …`);
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const url =
      `https://routing.openstreetmap.de/routed-foot/route/v1/driving/` +
      `${from.lng},${from.lat};${target.lon},${target.lat}` +
      `?overview=full&geometries=geojson`;

    const fallback = () => {
      drawRoute(
        [
          [from.lat, from.lng],
          [target.lat, target.lon],
        ],
        true
      );
      setGuideInfo(
        `${target.street} ${target.address} · ${formatDist(crowDist)} (přímo)`
      );
    };

    fetch(url, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((data) => {
        if (guideTargetRef.current !== target.address) return;
        const route = data?.routes?.[0];
        if (data?.code === "Ok" && route) {
          const latlngs = route.geometry.coordinates.map(
            ([lon, lat]: [number, number]) => [lat, lon] as L.LatLngExpression
          );
          drawRoute(latlngs, false);
          const mins = Math.max(1, Math.round(route.duration / 60));
          setGuideInfo(
            `${target.street} ${target.address} · ${formatDist(
              route.distance
            )} · ≈ ${mins} min`
          );
        } else {
          fallback();
        }
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        fallback();
      });
  };

  const updateGuidance = () => {
    const map = mapRef.current;
    const me = lastPosRef.current;
    if (!guidingRef.current || !map || !me) return;

    const remaining = POINTS.filter((p) => !checkedRef.current[p.address]);
    if (remaining.length === 0) {
      stopGuiding();
      showBanner("Všechny domy jsou hotové 🎉", "info");
      return;
    }

    let best = remaining[0];
    let bestDist = Infinity;
    for (const p of remaining) {
      const d = me.distanceTo(L.latLng(p.lat, p.lon));
      if (d < bestDist) {
        bestDist = d;
        best = p;
      }
    }

    const targetChanged = guideTargetRef.current !== best.address;
    guideTargetRef.current = best.address;
    if (targetChanged) styleAllMarkers();

    const movedFar =
      !routeOriginRef.current || me.distanceTo(routeOriginRef.current) > 20;

    if (targetChanged || movedFar || !routeLineRef.current) {
      routeOriginRef.current = me;
      fetchRoute(me, best, bestDist);
    } else if (routeLineRef.current) {
      // Between refetches keep the line visually attached to the moving dot.
      const pts = routeLineRef.current.getLatLngs() as L.LatLng[];
      if (pts.length) {
        pts[0] = me;
        routeLineRef.current.setLatLngs(pts);
      }
    }
  };

  const startWatch = () => {
    if (watchIdRef.current != null) return;
    if (!("geolocation" in navigator)) {
      showBanner("Poloha není v tomto zařízení dostupná.", "error");
      return;
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const map = mapRef.current;
        if (!map) return;
        const { latitude, longitude, accuracy } = pos.coords;
        const ll = L.latLng(latitude, longitude);
        lastPosRef.current = ll;
        setHasFix(true);
        setBanner((b) => (b && b.kind === "error" ? null : b));
        if (!meMarkerRef.current) {
          meAccuracyRef.current = L.circle(ll, {
            radius: accuracy,
            color: ME,
            weight: 1,
            fillColor: ME,
            fillOpacity: 0.12,
          }).addTo(map);
          meMarkerRef.current = L.circleMarker(ll, {
            radius: 8,
            weight: 3,
            color: "#ffffff",
            fillColor: ME,
            fillOpacity: 1,
          }).addTo(map);
          meMarkerRef.current.bindTooltip("Tady jsem", {
            direction: "top",
            offset: [0, -8],
          });
        } else {
          meMarkerRef.current.setLatLng(ll);
          meAccuracyRef.current?.setLatLng(ll).setRadius(accuracy);
        }
        updateGuidance();
      },
      (err) => {
        showBanner(
          err.code === err.PERMISSION_DENIED
            ? "Přístup k poloze byl zamítnut."
            : "Polohu se nepodařilo zjistit.",
          "error"
        );
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
  };

  // Init map + start location tracking immediately
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
    });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(map);

    const latlngs: L.LatLngExpression[] = [];
    for (const p of POINTS) {
      const marker = L.circleMarker([p.lat, p.lon], {
        radius: 9,
        weight: 2,
        color: "#ffffff",
        fillColor: TODO,
        fillOpacity: 0.95,
      });
      marker.bindTooltip(`${p.street} ${p.address}`, {
        direction: "top",
        offset: [0, -8],
      });
      marker.on("click", () => toggleRef.current(p.address));
      marker.addTo(map);
      markersRef.current[p.address] = marker;
      latlngs.push([p.lat, p.lon]);
    }

    map.fitBounds(L.latLngBounds(latlngs).pad(0.15));
    setTimeout(() => map.invalidateSize(), 0);

    startWatch();

    return () => {
      if (watchIdRef.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
      meMarkerRef.current = null;
      meAccuracyRef.current = null;
      lastPosRef.current = null;
      routeLineRef.current = null;
    };
  }, []);

  // Recolor markers + refresh guidance when the checked state changes
  useEffect(() => {
    styleAllMarkers();
    updateGuidance();
  }, [checked]);

  const centerOnMe = () => {
    const map = mapRef.current;
    const me = lastPosRef.current;
    if (me && map) {
      map.setView(me, Math.max(map.getZoom(), 17));
    } else {
      startWatch();
      showBanner("Zjišťuji tvou polohu…", "info");
    }
  };

  const toggleGuiding = () => {
    const map = mapRef.current;
    if (guidingRef.current) {
      stopGuiding();
      return;
    }
    const me = lastPosRef.current;
    if (!me) {
      startWatch();
      showBanner("Zjišťuji tvou polohu…", "info");
      return;
    }
    if (POINTS.every((p) => checkedRef.current[p.address])) {
      showBanner("Všechny domy jsou hotové 🎉", "info");
      return;
    }
    guidingRef.current = true;
    setGuiding(true);
    updateGuidance();
    const target = guideTargetRef.current
      ? GEO[guideTargetRef.current]
      : null;
    if (map && target) {
      map.fitBounds(
        L.latLngBounds([
          [me.lat, me.lng],
          [target.lat, target.lon],
        ]).pad(0.3),
        { maxZoom: 18 }
      );
    }
  };

  return (
    <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

      <button
        onClick={toggleGuiding}
        title={
          guiding
            ? "Ukončit navigaci"
            : "Navigovat k nejbližšímu nedoručenému domu"
        }
        style={{
          position: "absolute",
          left: 12,
          bottom: 28,
          zIndex: 1000,
          height: 44,
          paddingLeft: 14,
          paddingRight: 16,
          borderRadius: 22,
          border: "none",
          background: guiding ? "#a12727" : ME,
          color: "#ffffff",
          boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true">
          {guiding ? (
            <path d="M6 6l12 12M18 6L6 18" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          ) : (
            <path d="M21 3L3 10.53v.98l6.84 2.65L12.48 21h.98L21 3z" />
          )}
        </svg>
        {guiding ? "Ukončit" : "K nejbližšímu"}
      </button>

      <button
        onClick={centerOnMe}
        title="Vycentrovat na mou polohu"
        style={{
          position: "absolute",
          right: 12,
          bottom: 28,
          zIndex: 1000,
          width: 44,
          height: 44,
          borderRadius: 22,
          border: "none",
          background: "#ffffff",
          boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
        }}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke={hasFix ? ME : "#5b6472"}
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="12" cy="12" r="4" />
          <line x1="12" y1="1.5" x2="12" y2="5" />
          <line x1="12" y1="19" x2="12" y2="22.5" />
          <line x1="1.5" y1="12" x2="5" y2="12" />
          <line x1="19" y1="12" x2="22.5" y2="12" />
        </svg>
      </button>

      {guiding && guideInfo && (
        <div
          style={{
            position: "absolute",
            top: 10,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            background: ME,
            color: "#ffffff",
            borderRadius: 8,
            padding: "7px 14px",
            fontSize: 14,
            fontWeight: 600,
            maxWidth: "90%",
            textAlign: "center",
            boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
          }}
        >
          ➤ {guideInfo}
        </div>
      )}

      {banner && !(guiding && guideInfo) && (
        <div
          style={{
            position: "absolute",
            top: 10,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            background: banner.kind === "error" ? "#fdecec" : "#eaf1fb",
            color: banner.kind === "error" ? "#a12727" : "#1a4a8a",
            border: `1px solid ${banner.kind === "error" ? "#f3c2c2" : "#c2d6f3"}`,
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: 13,
            maxWidth: "90%",
            textAlign: "center",
          }}
        >
          {banner.text}
        </div>
      )}
    </div>
  );
}
