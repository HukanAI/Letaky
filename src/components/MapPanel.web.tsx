import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ADDRESSES } from "../data/addresses";
import { GEO } from "../data/geo";
import { useTheme } from "../theme";

export type MapPanelProps = {
  checked: Record<string, boolean>;
  onToggle: (address: string) => void;
};

const DONE = "#2e7d5b";
const TODO = "#d64545";
const ME = "#1e73e8";
const OSRM = "https://routing.openstreetmap.de/routed-foot";

const POINTS = ADDRESSES.filter((a) => GEO[a]).map((a) => ({
  address: a,
  ...GEO[a],
}));

type Banner = { text: string; kind: "error" | "info" } | null;

function formatDist(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}
function formatMin(s: number): string {
  return `≈ ${Math.max(1, Math.round(s / 60))} min`;
}

const meIconHtml =
  '<div style="position:relative;width:34px;height:34px;">' +
  '<div class="me-arrow" style="position:absolute;inset:0;transform-origin:50% 50%;opacity:0;transition:transform .15s ease;">' +
  '<svg width="34" height="34" viewBox="0 0 34 34"><path d="M17 1 L23 13 L17 10 L11 13 Z" fill="' +
  ME +
  '" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"/></svg>' +
  "</div>" +
  '<div style="position:absolute;left:8px;top:8px;width:12px;height:12px;border-radius:50%;background:' +
  ME +
  ';border:3px solid #ffffff;box-shadow:0 0 3px rgba(0,0,0,0.4);"></div>' +
  "</div>";

const TILES = {
  light: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap",
    options: { maxZoom: 19 } as L.TileLayerOptions,
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "© OpenStreetMap, © CARTO",
    options: { maxZoom: 20, subdomains: "abcd" } as L.TileLayerOptions,
  },
};

// Číselné štítky u domů zmizí pod tímto zoomem, aby se při oddálení nepřekrývaly.
const LABEL_MIN_ZOOM = 17;
// Do této vzdálenosti (m) od nedoručeného domu ho GPS automaticky označí.
const AUTO_RADIUS = 15;

function ensureLabelStyles() {
  if (document.getElementById("letaky-map-styles")) return;
  const s = document.createElement("style");
  s.id = "letaky-map-styles";
  s.textContent = [
    ".house-label{background:transparent;border:none;box-shadow:none;padding:0;margin:0;font-weight:600;font-size:11px;color:#1c2333;text-shadow:0 0 3px #fff,0 0 3px #fff,0 0 3px #fff;white-space:nowrap;}",
    ".house-label:before{display:none !important;}",
    ".house-label.done-label{opacity:.55;text-decoration:line-through;}",
    ".leaflet-container.theme-dark .house-label{color:#e8ebf0;text-shadow:0 0 3px #000,0 0 3px #000,0 0 3px #000;}",
    ".leaflet-container.labels-hidden .house-label{display:none;}",
  ].join("\n");
  document.head.appendChild(s);
}

export default function MapPanel({ checked, onToggle }: MapPanelProps) {
  const { scheme, colors } = useTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.CircleMarker>>({});
  const toggleRef = useRef(onToggle);
  toggleRef.current = onToggle;

  const checkedRef = useRef(checked);
  checkedRef.current = checked;

  const watchIdRef = useRef<number | null>(null);
  const meMarkerRef = useRef<L.Marker | null>(null);
  const meAccuracyRef = useRef<L.Circle | null>(null);
  const lastPosRef = useRef<L.LatLng | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const autoCheckedRef = useRef<Set<string>>(new Set());

  const headingRef = useRef<number | null>(null);
  const headingEnabledRef = useRef(false);
  const orientHandlerRef = useRef<((e: any) => void) | null>(null);

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

  // --- Heading (which way you're facing) ---
  const applyHeading = (deg: number) => {
    const m = meMarkerRef.current;
    const el = m ? (m.getElement() as HTMLElement | null) : null;
    const arrow = el?.querySelector<HTMLElement>(".me-arrow");
    if (arrow) {
      arrow.style.transform = `rotate(${deg}deg)`;
      arrow.style.opacity = "1";
    }
  };

  if (!orientHandlerRef.current) {
    orientHandlerRef.current = (e: any) => {
      let h: number | null = null;
      if (typeof e.webkitCompassHeading === "number") h = e.webkitCompassHeading;
      else if (typeof e.alpha === "number") h = 360 - e.alpha;
      if (h == null || isNaN(h)) return;
      h = ((h % 360) + 360) % 360;
      headingRef.current = h;
      applyHeading(h);
    };
  }

  const enableHeading = async () => {
    if (headingEnabledRef.current) return;
    const DOE: any = (window as any).DeviceOrientationEvent;
    if (!DOE) return;
    try {
      if (typeof DOE.requestPermission === "function") {
        const res = await DOE.requestPermission();
        if (res !== "granted") return;
      }
    } catch {
      return;
    }
    headingEnabledRef.current = true;
    window.addEventListener("deviceorientationabsolute", orientHandlerRef.current!, true);
    window.addEventListener("deviceorientation", orientHandlerRef.current!, true);
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
    const el = m.getTooltip()?.getElement() as HTMLElement | undefined;
    if (el) el.classList.toggle("done-label", done);
  };
  const styleAllMarkers = () => {
    for (const p of POINTS) styleMarker(p.address);
  };

  const updateLabelVisibility = () => {
    const map = mapRef.current;
    if (!map) return;
    const c = map.getContainer();
    if (map.getZoom() < LABEL_MIN_ZOOM) c.classList.add("labels-hidden");
    else c.classList.remove("labels-hidden");
  };

  // Automaticky označí nedoručený dům, jakmile jsi u něj (a přesnost GPS je dobrá).
  const maybeAutoCheck = (here: L.LatLng, accuracy: number) => {
    if (accuracy > 25) return;
    let near: (typeof POINTS)[number] | null = null;
    let nearD = Infinity;
    for (const p of POINTS) {
      if (checkedRef.current[p.address]) continue;
      if (autoCheckedRef.current.has(p.address)) continue;
      const d = here.distanceTo(L.latLng(p.lat, p.lon));
      if (d < nearD) {
        nearD = d;
        near = p;
      }
    }
    if (near && nearD <= AUTO_RADIUS) {
      autoCheckedRef.current.add(near.address);
      toggleRef.current(near.address);
      showBanner(`Označeno: ${near.street} ${near.address}`, "info");
      (navigator as any).vibrate?.(60);
    }
  };

  // --- Single-target guidance (nearest undelivered) ---
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
      `${OSRM}/route/v1/driving/${from.lng},${from.lat};${target.lon},${target.lat}` +
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
          setGuideInfo(
            `${target.street} ${target.address} · ${formatDist(
              route.distance
            )} · ${formatMin(route.duration)}`
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
      const pts = routeLineRef.current.getLatLngs() as L.LatLng[];
      if (pts.length) {
        pts[0] = me;
        routeLineRef.current.setLatLngs(pts);
      }
    }
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
            interactive: false,
          }).addTo(map);
          meMarkerRef.current = L.marker(ll, {
            icon: L.divIcon({
              className: "me-icon",
              html: meIconHtml,
              iconSize: [34, 34],
              iconAnchor: [17, 17],
            }),
            interactive: false,
            keyboard: false,
          }).addTo(map);
          if (headingRef.current != null) applyHeading(headingRef.current);
        } else {
          meMarkerRef.current.setLatLng(ll);
          meAccuracyRef.current?.setLatLng(ll).setRadius(accuracy);
        }
        if (headingRef.current != null) applyHeading(headingRef.current);
        maybeAutoCheck(ll, accuracy);
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

  // Init map + start location tracking + heading immediately
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    ensureLabelStyles();

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
    });
    mapRef.current = map;

    const latlngs: L.LatLngExpression[] = [];
    for (const p of POINTS) {
      const marker = L.circleMarker([p.lat, p.lon], {
        radius: 9,
        weight: 2,
        color: "#ffffff",
        fillColor: TODO,
        fillOpacity: 0.95,
      });
      marker.bindTooltip(p.address, {
        permanent: true,
        direction: "top",
        offset: [0, -4],
        className: "house-label",
      });
      marker.on("click", () => toggleRef.current(p.address));
      marker.addTo(map);
      markersRef.current[p.address] = marker;
      latlngs.push([p.lat, p.lon]);
    }

    map.fitBounds(L.latLngBounds(latlngs).pad(0.15));
    map.on("zoomend", updateLabelVisibility);
    setTimeout(() => {
      map.invalidateSize();
      updateLabelVisibility();
    }, 0);

    startWatch();
    enableHeading();

    return () => {
      if (watchIdRef.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (orientHandlerRef.current) {
        window.removeEventListener("deviceorientationabsolute", orientHandlerRef.current, true);
        window.removeEventListener("deviceorientation", orientHandlerRef.current, true);
      }
      headingEnabledRef.current = false;
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
      meMarkerRef.current = null;
      meAccuracyRef.current = null;
      lastPosRef.current = null;
      routeLineRef.current = null;
      tileLayerRef.current = null;
    };
  }, []);

  // Swap map tiles + theme class when the color scheme changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const cfg = scheme === "dark" ? TILES.dark : TILES.light;
    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);
    tileLayerRef.current = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      ...cfg.options,
    }).addTo(map);
    tileLayerRef.current.bringToBack();
    const c = map.getContainer();
    c.classList.remove("theme-light", "theme-dark");
    c.classList.add(scheme === "dark" ? "theme-dark" : "theme-light");
  }, [scheme]);

  // Recolor markers + refresh guidance when the checked state changes
  useEffect(() => {
    styleAllMarkers();
    updateGuidance();
  }, [checked]);

  const centerOnMe = () => {
    enableHeading();
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
    enableHeading();
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
    const target = guideTargetRef.current ? GEO[guideTargetRef.current] : null;
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

  const btnBase: React.CSSProperties = {
    position: "absolute",
    zIndex: 1000,
    height: 44,
    borderRadius: 22,
    border: "none",
    color: "#ffffff",
    boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
    fontWeight: 600,
    paddingLeft: 14,
    paddingRight: 16,
  };

  return (
    <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

      <button
        onClick={toggleGuiding}
        title={
          guiding ? "Ukončit navigaci" : "Navigovat k nejbližšímu nedoručenému domu"
        }
        style={{
          ...btnBase,
          left: 12,
          bottom: 28,
          background: guiding ? "#a12727" : ME,
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
          background: colors.controlBg,
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
          stroke={hasFix ? ME : colors.controlIcon}
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

      {guiding && guideInfo ? (
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
      ) : (
        banner && (
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
        )
      )}
    </div>
  );
}
