import React, { useEffect, useRef } from "react";
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
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
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

  return (
    <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
    </div>
  );
}
