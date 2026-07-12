import { useCallback, useEffect, useMemo, useState } from "react";
import { ADDRESSES } from "../data/addresses";
import { loadChecked, saveChecked } from "./storage";

export type Checklist = {
  checked: Record<string, boolean>;
  loaded: boolean;
  doneCount: number;
  total: number;
  toggle: (address: string) => void;
  resetAll: () => void;
};

// Sdílený stav odškrtnutých adres + persistence.
// Používá ho seznam i mapa, aby zůstaly synchronní.
export function useChecklist(): Checklist {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadChecked().then((data) => {
      setChecked(data);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) saveChecked(checked);
  }, [checked, loaded]);

  const toggle = useCallback((address: string) => {
    setChecked((prev) => ({ ...prev, [address]: !prev[address] }));
  }, []);

  const resetAll = useCallback(() => setChecked({}), []);

  const doneCount = useMemo(
    () => ADDRESSES.filter((a) => checked[a]).length,
    [checked]
  );

  return {
    checked,
    loaded,
    doneCount,
    total: ADDRESSES.length,
    toggle,
    resetAll,
  };
}
