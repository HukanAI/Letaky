# Letáky

Jednoduchá mobilní aplikace pro roznos letáků. Zobrazuje seznam čísel domů z trasy
a u každého umožňuje jedním klepnutím zaškrtnout, že už je leták doručen. Stav se
ukládá přímo v telefonu (funguje i offline) a zůstává zachovaný i po zavření appky.

Funkce:
- Seznam všech adres v pořadí trasy (viz `src/data/addresses.ts`, zdroj `Letaky.docx`)
- Zaškrtávání jednotlivých adres, ihned se ukládá do zařízení
- Ukazatel postupu (kolik z kolika je hotovo)
- Vyhledávání/filtrování podle čísla domu
- Tlačítko pro reset všech zaškrtnutí (na další kolo roznosu)

Funguje na Androidu i iPhonu (jedna společná aplikace postavená na React Native / Expo).

## Spuštění při vývoji (bez instalace do telefonu)

1. Nainstaluj závislosti:
   ```
   npm install
   ```
2. Spusť vývojový server:
   ```
   npx expo start
   ```
3. V telefonu si nainstaluj zdarma aplikaci **Expo Go** (App Store / Google Play)
   a naskenuj QR kód, který se zobrazí v terminálu. Aplikace se otevře přímo
   v Expo Go — žádný build není potřeba.

## Sestavení instalovatelné aplikace (APK / IPA)

Pro plnohodnotnou instalovatelnou aplikaci (ikona na ploše, bez Expo Go) se používá
[EAS Build](https://docs.expo.dev/build/introduction/) — cloudová služba od Expo,
zdarma pro menší projekty, nepotřebuje Mac ani Android Studio.

1. Vytvoř si zdarma účet na [expo.dev](https://expo.dev) a přihlas se:
   ```
   npx eas-cli login
   ```
2. Android APK (dá se rovnou nainstalovat do telefonu):
   ```
   npx eas-cli build --platform android --profile preview
   ```
3. iOS (potřebuje Apple Developer účet, 99 USD/rok, kvůli podepsání aplikace):
   ```
   npx eas-cli build --platform ios --profile preview
   ```

Po dokončení buildu (pár minut, běží na serverech Expo) dostaneš odkaz ke stažení
`.apk`/`.ipa` souboru přímo do telefonu.

## Úprava seznamu adres

Adresy jsou v [`src/data/addresses.ts`](src/data/addresses.ts) jako obyčejné pole
řetězců — stačí ho upravit a spustit `npm start` znovu.

## Technologie

- [Expo](https://expo.dev) / React Native + TypeScript
- `@react-native-async-storage/async-storage` pro uložení zaškrtnutých adres v zařízení
