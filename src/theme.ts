import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  createElement,
} from "react";
import { Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Scheme = "light" | "dark";

export type Colors = {
  bg: string;
  text: string;
  muted: string;
  faint: string;
  primary: string;
  danger: string;
  card: string;
  cardBorder: string;
  checkbox: string;
  progressTrack: string;
  segmentBg: string;
  segmentActive: string;
  searchBg: string;
  searchBorder: string;
  strike: string;
  controlBg: string;
  controlIcon: string;
};

export const lightColors: Colors = {
  bg: "#f5f6f8",
  text: "#1c2333",
  muted: "#5b6472",
  faint: "#8a93a2",
  primary: "#2e7d5b",
  danger: "#d64545",
  card: "#ffffff",
  cardBorder: "#eceef2",
  checkbox: "#c7ccd6",
  progressTrack: "#e2e5eb",
  segmentBg: "#e8eaee",
  segmentActive: "#ffffff",
  searchBg: "#ffffff",
  searchBorder: "#e2e5eb",
  strike: "#9aa2b1",
  controlBg: "#ffffff",
  controlIcon: "#5b6472",
};

export const darkColors: Colors = {
  bg: "#14161a",
  text: "#f2f4f8",
  muted: "#9aa3b2",
  faint: "#6b7280",
  primary: "#2e7d5b",
  danger: "#d64545",
  card: "#1e2128",
  cardBorder: "#2a2e37",
  checkbox: "#4a505c",
  progressTrack: "#2a2e37",
  segmentBg: "#23262e",
  segmentActive: "#3a3f4a",
  searchBg: "#1e2128",
  searchBorder: "#2f333c",
  strike: "#6b7280",
  controlBg: "#23262e",
  controlIcon: "#9aa3b2",
};

const THEME_KEY = "letaky:theme";

type ThemeCtx = {
  scheme: Scheme;
  colors: Colors;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeCtx>({
  scheme: "light",
  colors: lightColors,
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [scheme, setScheme] = useState<Scheme>(
    Appearance.getColorScheme() === "dark" ? "dark" : "light"
  );

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((v) => {
      if (v === "light" || v === "dark") setScheme(v);
    });
  }, []);

  const toggle = () =>
    setScheme((s) => {
      const next: Scheme = s === "light" ? "dark" : "light";
      AsyncStorage.setItem(THEME_KEY, next);
      return next;
    });

  const colors = scheme === "dark" ? darkColors : lightColors;

  return createElement(
    ThemeContext.Provider,
    { value: { scheme, colors, toggle } },
    children
  );
}

export const useTheme = () => useContext(ThemeContext);
