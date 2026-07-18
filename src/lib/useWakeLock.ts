import { useEffect } from "react";

// Drží obrazovku rozsvícenou (Screen Wake Lock API), dokud je appka viditelná.
// Funguje na webu/PWA; na nativu se bezpečně nic nestane.
export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (typeof document === "undefined" || typeof navigator === "undefined") return;
    const nav = navigator as any;
    if (!nav.wakeLock || typeof nav.wakeLock.request !== "function") return;
    if (!enabled) return;

    let lock: any = null;

    const request = async () => {
      try {
        if (document.visibilityState !== "visible" || lock) return;
        lock = await nav.wakeLock.request("screen");
        lock.addEventListener?.("release", () => {
          lock = null;
        });
      } catch {
        // zamítnuto nebo nepodporováno – tiše ignorujeme
      }
    };

    // Wake lock se uvolní, když appka není vidět; po návratu ho znovu vezmeme.
    const onVisible = () => {
      if (document.visibilityState === "visible") request();
    };

    request();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      if (lock) {
        try {
          lock.release();
        } catch {
          // ignore
        }
        lock = null;
      }
    };
  }, [enabled]);
}
