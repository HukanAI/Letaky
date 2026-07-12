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

export default function MapPanel({ checked, onToggle }: MapPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.CircleMarker>>({});
  const toggleRef = useRef(onToggle);
  toggleRef.current = onToggle;

  const watchIdRef = useRef<number | null>(null);
  const meMarkerRef = useRef<L.CircleMarker | null>(null);
  const meAccuracyRef = useRef<L.Circle | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Init map once
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

    // Leaflet may misread size inside a flex container until laid out.
    setTimeout(() => map.invalidateSize(), 0);

    return () => {
      if (watchIdRef.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
      meMarkerRef.current = null;
      meAccuracyRef.current = null;
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

  const stopLocate = () => {
    if (watchIdRef.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = null;
    if (meMarkerRef.current) {
      meMarkerRef.current.remove();
      meMarkerRef.current = null;
    }
    if (meAccuracyRef.current) {
      meAccuracyRef.current.remove();
      meAccuracyRef.current = null;
    }
    setLocating(false);
  };

  const toggleLocate = () => {
    const map = mapRef.current;
    if (!map) return;

    if (watchIdRef.current != null) {
      stopLocate();
      return;
    }
    if (!("geolocation" in navigator)) {
      setGeoError("Poloha není v tomto zařízení dostupná.");
      return;
    }

    setGeoError(null);
    setLocating(true);
    let firstFix = true;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const ll = L.latLng(latitude, longitude);
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
        if (firstFix) {
          map.setView(ll, Math.max(map.getZoom(), 17));
          firstFix = false;
        }
      },
      (err) => {
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Přístup k poloze byl zamítnut."
            : "Polohu se nepodařilo zjistit."
        );
        stopLocate();
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
  };

  return (
    <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

      <button
        onClick={toggleLocate}
        title={locating ? "Vypnout sledování polohy" : "Kde jsem"}
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
          stroke={locating ? ME : "#5b6472"}
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

      {geoError && (
        <div
          style={{
            position: "absolute",
            top: 10,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            background: "#fdecec",
            color: "#a12727",
            border: "1px solid #f3c2c2",
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: 13,
            maxWidth: "90%",
            textAlign: "center",
          }}
        >
          {geoError}
        </div>
      )}
    </div>
  );
}
