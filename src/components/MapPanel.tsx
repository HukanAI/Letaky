import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../theme";

export type MapPanelProps = {
  checked: Record<string, boolean>;
  onToggle: (address: string) => void;
};

// Nativní fallback. Interaktivní mapa je ve webové (nainstalované) verzi
// aplikace; nativní build by vyžadoval react-native-maps a dev build.
export default function MapPanel(_props: MapPanelProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <Ionicons name="map-outline" size={48} color={colors.checkbox} />
      <Text style={[styles.text, { color: colors.faint }]}>
        Mapa je dostupná v nainstalované (webové) verzi aplikace.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  text: {
    marginTop: 12,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 21,
  },
});
