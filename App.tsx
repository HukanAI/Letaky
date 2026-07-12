import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import ChecklistScreen from "./src/screens/ChecklistScreen";

export default function App() {
  return (
    <SafeAreaProvider>
      <ChecklistScreen />
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
