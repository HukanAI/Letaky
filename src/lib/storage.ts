import AsyncStorage from "@react-native-async-storage/async-storage";

const CHECKED_KEY = "letaky:checked";

export async function loadChecked(): Promise<Record<string, boolean>> {
  const raw = await AsyncStorage.getItem(CHECKED_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function saveChecked(checked: Record<string, boolean>): Promise<void> {
  await AsyncStorage.setItem(CHECKED_KEY, JSON.stringify(checked));
}
