import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  Platform,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ADDRESSES } from "../data/addresses";
import { loadChecked, saveChecked } from "../lib/storage";

export default function ChecklistScreen() {
  const insets = useSafeAreaInsets();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
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

  const doneCount = useMemo(
    () => ADDRESSES.filter((a) => checked[a]).length,
    [checked]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ADDRESSES;
    return ADDRESSES.filter((a) => a.toLowerCase().includes(q));
  }, [query]);

  const handleReset = () => {
    Alert.alert(
      "Resetovat vše?",
      "Zrušíte odškrtnutí u všech adres. Tato akce se nedá vrátit zpět.",
      [
        { text: "Zrušit", style: "cancel" },
        {
          text: "Resetovat",
          style: "destructive",
          onPress: () => setChecked({}),
        },
      ]
    );
  };

  const progress = ADDRESSES.length > 0 ? doneCount / ADDRESSES.length : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Letáky</Text>
        <TouchableOpacity onPress={handleReset} style={styles.resetButton} hitSlop={10}>
          <Ionicons name="refresh" size={22} color="#5b6472" />
        </TouchableOpacity>
      </View>

      <View style={styles.progressRow}>
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {doneCount} / {ADDRESSES.length}
        </Text>
      </View>

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
    padding: 6,
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
});
