import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import ChecklistScreen from "./src/screens/ChecklistScreen";
import { ThemeProvider, useTheme } from "./src/theme";

function ThemedApp() {
  const { scheme } = useTheme();
  return (
    <>
      <ChecklistScreen />
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
