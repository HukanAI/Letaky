import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

export type MapPanelProps = {
  checked: Record<string, boolean>;
  onToggle: (address: string) => void;
  autoCheck?: boolean;
};

// Nativní fallback. Interaktivní mapa je ve webové (nainstalované) verzi
// aplikace; nativní build by vyžadoval react-native-maps a dev build.
export default function MapPanel(_props: MapPanelProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="map-outline" size={48} color="#c7ccd6" />
      <Text style={styles.text}>
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
    color: "#8a93a2",
    textAlign: "center",
    lineHeight: 21,
  },
});
