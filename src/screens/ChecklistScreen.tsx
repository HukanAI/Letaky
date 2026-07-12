import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ADDRESSES } from "../data/addresses";
import { GEO } from "../data/geo";
import { useChecklist } from "../lib/useChecklist";
import ConfirmDialog from "../components/ConfirmDialog";
import MapPanel from "../components/MapPanel";
import { useTheme, Colors } from "../theme";

type Mode = "list" | "map";

export default function ChecklistScreen() {
  const insets = useSafeAreaInsets();
  const { colors, scheme, toggle: toggleTheme } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { checked, doneCount, total, toggle, resetAll } = useChecklist();
  const [query, setQuery] = useState("");
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [mode, setMode] = useState<Mode>("list");

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const order: string[] = [];
    const byStreet = new Map<string, string[]>();
    for (const a of ADDRESSES) {
      if (q && !a.toLowerCase().includes(q)) continue;
      const street = GEO[a]?.street ?? "Ostatní";
      if (!byStreet.has(street)) {
        byStreet.set(street, []);
        order.push(street);
      }
      byStreet.get(street)!.push(a);
    }
    return order.map((title) => ({ title, data: byStreet.get(title)! }));
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
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={toggleTheme} style={styles.iconButton} hitSlop={10}>
            <Ionicons
              name={scheme === "dark" ? "sunny" : "moon"}
              size={20}
              color={colors.muted}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setConfirmVisible(true)}
            style={styles.resetButton}
            hitSlop={10}
          >
            <Ionicons name="refresh" size={18} color={colors.muted} />
            <Text style={styles.resetButtonText}>Resetovat</Text>
          </TouchableOpacity>
        </View>
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
            color={mode === "list" ? colors.text : colors.faint}
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
            color={mode === "map" ? colors.text : colors.faint}
          />
          <Text style={[styles.segmentText, mode === "map" && styles.segmentTextActive]}>
            Mapa
          </Text>
        </TouchableOpacity>
      </View>

      {mode === "list" ? (
        <>
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={18} color={colors.faint} style={{ marginRight: 6 }} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Hledat číslo domu…"
              placeholderTextColor={colors.faint}
              style={styles.searchInput}
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
          </View>

          <SectionList
            sections={sections}
            keyExtractor={(item) => item}
            stickySectionHeadersEnabled
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
            renderSectionHeader={({ section }) => {
              const done = section.data.filter((a) => checked[a]).length;
              return (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <Text style={styles.sectionCount}>
                    {done} / {section.data.length}
                  </Text>
                </View>
              );
            }}
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
              <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
              <Text style={styles.legendText}>Zbývá</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
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

function makeStyles(c: Colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 4,
    },
    title: { fontSize: 28, fontWeight: "700", color: c.text },
    headerActions: { flexDirection: "row", alignItems: "center" },
    iconButton: { padding: 6, marginRight: 4 },
    resetButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 6,
      paddingHorizontal: 8,
    },
    resetButtonText: {
      fontSize: 13,
      fontWeight: "600",
      color: c.muted,
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
      backgroundColor: c.progressTrack,
      overflow: "hidden",
      marginRight: 10,
    },
    progressBarFill: { height: 8, borderRadius: 4, backgroundColor: c.primary },
    progressText: {
      fontVariant: ["tabular-nums"],
      fontSize: 14,
      fontWeight: "600",
      color: c.muted,
      minWidth: 56,
      textAlign: "right",
    },
    segment: {
      flexDirection: "row",
      backgroundColor: c.segmentBg,
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
    segmentItemActive: { backgroundColor: c.segmentActive },
    segmentText: {
      fontSize: 14,
      fontWeight: "600",
      color: c.faint,
      marginLeft: 6,
    },
    segmentTextActive: { color: c.text },
    searchWrap: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.searchBg,
      marginHorizontal: 20,
      marginBottom: 12,
      paddingHorizontal: 12,
      height: 40,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.searchBorder,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: c.text,
      ...Platform.select({ web: { outlineStyle: "none" as any } }),
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: c.bg,
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 8,
    },
    sectionTitle: { fontSize: 18, fontWeight: "700", color: c.text },
    sectionCount: {
      fontVariant: ["tabular-nums"],
      fontSize: 13,
      fontWeight: "600",
      color: c.faint,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.card,
      marginHorizontal: 20,
      marginBottom: 8,
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: c.checkbox,
      marginRight: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    checkboxChecked: { backgroundColor: c.primary, borderColor: c.primary },
    rowText: { fontSize: 17, color: c.text, fontWeight: "500" },
    rowTextChecked: { color: c.strike, textDecorationLine: "line-through" },
    emptyText: {
      textAlign: "center",
      color: c.faint,
      marginTop: 40,
      fontSize: 15,
    },
    mapArea: { flex: 1 },
    legend: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingBottom: 10,
    },
    legendItem: { flexDirection: "row", alignItems: "center", marginRight: 16 },
    legendDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: c.bg,
      marginRight: 6,
    },
    legendText: { fontSize: 13, color: c.muted, fontWeight: "500" },
    legendHint: { fontSize: 12, color: c.faint, marginLeft: "auto" },
  });
}
