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

export default function MapPanel({ checked, onToggle }: MapPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.CircleMarker>>({});
  const toggleRef = useRef(onToggle);
  toggleRef.current = onToggle;

  const watchIdRef = useRef<number | null>(null);
  const meMarkerRef = useRef<L.CircleMarker | null>(null);
  const meAccuracyRef = useRef<L.Circle | null>(null);
  const lastPosRef = useRef<L.LatLng | null>(null);
  const [hasFix, setHasFix] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showBanner = (text: string, kind: "error" | "info") => {
    setBanner({ text, kind });
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    if (kind === "info") {
      bannerTimer.current = setTimeout(() => setBanner(null), 4000);
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
    };
  }, []);

  // Recolor markers when the checked state changes
  useEffect(() => {
    for (const p of POINTS) {
      const marker = markersRef.current[p.address];
      if (marker) {
        marker.setStyle({ fillColor: checked[p.address] ? DONE : TODO });
      }
    }
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

  const navigateToNearest = () => {
    const map = mapRef.current;
    const me = lastPosRef.current;
    if (!me) {
      startWatch();
      showBanner("Zjišťuji tvou polohu…", "info");
      return;
    }
    const remaining = POINTS.filter((p) => !checked[p.address]);
    if (remaining.length === 0) {
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
    // Ukázat cíl na mapě
    if (map) {
      map.panTo([best.lat, best.lon]);
      markersRef.current[best.address]?.openTooltip();
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${best.lat},${best.lon}&travelmode=walking`;
    window.open(url, "_blank", "noopener");
  };

  return (
    <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

      <button
        onClick={navigateToNearest}
        title="Navigovat k nejbližšímu nedoručenému domu"
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
          background: ME,
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
          <path d="M21 3L3 10.53v.98l6.84 2.65L12.48 21h.98L21 3z" />
        </svg>
        K nejbližšímu
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

      {banner && (
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
