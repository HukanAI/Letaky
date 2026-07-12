import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ADDRESSES } from "../data/addresses";
import { useChecklist } from "../lib/useChecklist";
import ConfirmDialog from "../components/ConfirmDialog";
import MapPanel from "../components/MapPanel";

type Mode = "list" | "map";

export default function ChecklistScreen() {
  const insets = useSafeAreaInsets();
  const { checked, doneCount, total, toggle, resetAll } = useChecklist();
  const [query, setQuery] = useState("");
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [mode, setMode] = useState<Mode>("list");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ADDRESSES;
    return ADDRESSES.filter((a) => a.toLowerCase().includes(q));
  }, [query]);

  const handleResetConfirmed = () => {
    resetAll();
    setConfirmVisible(false);
  };

  const progress = total > 0 ? doneCount / total : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Letáky</Text>
        <TouchableOpacity
          onPress={() => setConfirmVisible(true)}
          style={styles.resetButton}
          hitSlop={10}
        >
          <Ionicons name="refresh" size={18} color="#5b6472" />
          <Text style={styles.resetButtonText}>Resetovat</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.progressRow}>
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {doneCount} / {total}
        </Text>
      </View>

      <View style={styles.segment}>
        <TouchableOpacity
          style={[styles.segmentItem, mode === "list" && styles.segmentItemActive]}
          onPress={() => setMode("list")}
        >
          <Ionicons
            name="list"
            size={16}
            color={mode === "list" ? "#1c2333" : "#8a93a2"}
          />
          <Text style={[styles.segmentText, mode === "list" && styles.segmentTextActive]}>
            Seznam
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentItem, mode === "map" && styles.segmentItemActive]}
          onPress={() => setMode("map")}
        >
          <Ionicons
            name="map"
            size={16}
            color={mode === "map" ? "#1c2333" : "#8a93a2"}
          />
          <Text style={[styles.segmentText, mode === "map" && styles.segmentTextActive]}>
            Mapa
          </Text>
        </TouchableOpacity>
      </View>

      {mode === "list" ? (
        <>
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={18} color="#8a93a2" style={{ marginRight: 6 }} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Hledat číslo domu…"
              placeholderTextColor="#8a93a2"
              style={styles.searchInput}
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item}
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
            renderItem={({ item }) => {
              const isChecked = !!checked[item];
              return (
                <TouchableOpacity
                  style={styles.row}
                  activeOpacity={0.6}
                  onPress={() => toggle(item)}
                >
                  <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                    {isChecked && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </View>
                  <Text style={[styles.rowText, isChecked && styles.rowTextChecked]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Žádná adresa neodpovídá hledání.</Text>
            }
          />
        </>
      ) : (
        <View style={styles.mapArea}>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#d64545" }]} />
              <Text style={styles.legendText}>Zbývá</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#2e7d5b" }]} />
              <Text style={styles.legendText}>Hotovo</Text>
            </View>
            <Text style={styles.legendHint}>Klepni na dům = hotovo</Text>
          </View>
          <MapPanel checked={checked} onToggle={toggle} />
        </View>
      )}

      <ConfirmDialog
        visible={confirmVisible}
        title="Resetovat vše?"
        message="Zrušíte odškrtnutí u všech adres. Tato akce se nedá vrátit zpět."
        confirmLabel="Resetovat"
        cancelLabel="Zrušit"
        onConfirm={handleResetConfirmed}
        onCancel={() => setConfirmVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f6f8",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1c2333",
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  resetButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#5b6472",
    marginLeft: 4,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 12,
  },
  progressBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#e2e5eb",
    overflow: "hidden",
    marginRight: 10,
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2e7d5b",
  },
  progressText: {
    fontVariant: ["tabular-nums"],
    fontSize: 14,
    fontWeight: "600",
    color: "#5b6472",
    minWidth: 56,
    textAlign: "right",
  },
  segment: {
    flexDirection: "row",
    backgroundColor: "#e8eaee",
    borderRadius: 10,
    padding: 3,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  segmentItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
  },
  segmentItemActive: {
    backgroundColor: "#fff",
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8a93a2",
    marginLeft: 6,
  },
  segmentTextActive: {
    color: "#1c2333",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e5eb",
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1c2333",
    ...Platform.select({ web: { outlineStyle: "none" as any } }),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginBottom: 8,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eceef2",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#c7ccd6",
    marginRight: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#2e7d5b",
    borderColor: "#2e7d5b",
  },
  rowText: {
    fontSize: 17,
    color: "#1c2333",
    fontWeight: "500",
  },
  rowTextChecked: {
    color: "#9aa2b1",
    textDecorationLine: "line-through",
  },
  emptyText: {
    textAlign: "center",
    color: "#8a93a2",
    marginTop: 40,
    fontSize: 15,
  },
  mapArea: {
    flex: 1,
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#fff",
    marginRight: 6,
  },
  legendText: {
    fontSize: 13,
    color: "#5b6472",
    fontWeight: "500",
  },
  legendHint: {
    fontSize: 12,
    color: "#8a93a2",
    marginLeft: "auto",
  },
});
