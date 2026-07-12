# Letáky

Jednoduchá mobilní aplikace pro roznos letáků. Zobrazuje seznam čísel domů z trasy
a u každého umožňuje jedním klepnutím zaškrtnout, že už je leták doručen. Stav se
ukládá přímo v telefonu (funguje i offline) a zůstává zachovaný i po zavření appky.

Funkce:
- Přepínání mezi **seznamem** a **mapou** domů
- Seznam všech adres v pořadí trasy (viz `src/data/addresses.ts`, zdroj `Letaky.docx`)
- Mapa s domy zvýrazněnými přímo na jejich poloze (Karviná-Mizerov) — klepnutím
  na dům ho označíš jako hotový, barva se změní (červená = zbývá, zelená = hotovo).
  U každého domu je **trvalý štítek s číslem** (po přiblížení, aby se nepřekrývaly).
- **Automatické odškrtnutí při příchodu k domu** — jakmile jsi podle GPS do ~15 m
  od nedoručeného domu (a poloha je dost přesná), sám se označí jako hotový.
- **Tmavý režim** — přepínač (měsíc/slunce) v hlavičce; ve výchozím stavu se řídí
  nastavením telefonu. Mapa v tmavém režimu používá tmavé podkladové dlaždice.
- GPS poloha se na mapě zapne a sleduje **automaticky** po otevření mapy
  (vyžaduje povolení polohy v prohlížeči). Poloha je zobrazená jako **šipka
  ukazující směr, kterým se díváš** (podle kompasu telefonu); dokud kompas nemá
  data, ukáže se jen tečka. Tlačítko se zaměřovačem mapu vycentruje na tvou polohu.
- Tlačítko **„K nejbližšímu"** zapne navigaci **přímo v aplikaci**: na mapě
  nakreslí trasu **po ulicích** od tvé polohy k nejbližšímu ještě nedoručenému
  domu, cíl zvýrazní a nahoře ukáže jeho adresu, vzdálenost a čas chůze. Jak se
  pohybuješ a jak odškrtáváš domy, se cíl i trasa průběžně přepočítávají.
  (Pokud by routovací služba nebyla dostupná, čára se zobrazí přímá „vzdušnou
  čarou".)
- Zaškrtávání jednotlivých adres, ihned se ukládá do zařízení (seznam i mapa sdílí stav)
- Ukazatel postupu (kolik z kolika je hotovo)
- Vyhledávání/filtrování podle čísla domu
- Tlačítko pro reset všech zaškrtnutí (na další kolo roznosu)

Funguje na Androidu i iPhonu (jedna společná aplikace postavená na React Native / Expo).

## Instalace do telefonu přímo z GitHubu (doporučeno)

Appka je nasazená jako instalovatelná webová appka (PWA) na GitHub Pages — žádný
APK soubor, žádný App Store, jen odkaz:

**👉 https://hukanai.github.io/Letaky/**

1. Otevři odkaz výše v telefonu (Chrome na Androidu, Safari na iPhonu).
2. **Android (Chrome):** klepni na nabídku (⋮) → **"Přidat na plochu"** /
   **"Nainstalovat aplikaci"**.
   **iPhone (Safari):** klepni na ikonu sdílení (□↑) → **"Přidat na plochu"**.
3. Na ploše telefonu se objeví ikona Letáky, která se otevírá na celou obrazovku
   jako normální appka. Zaškrtnutí adres se ukládá přímo v telefonu a appka
   funguje i bez internetu (jen první otevření vyžaduje připojení).

Po každém `git push` do větve `main` se appka na tomto odkazu automaticky
aktualizuje (viz [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml)).

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

## Souřadnice domů (mapa)

GPS souřadnice domů v [`src/data/geo.ts`](src/data/geo.ts) pocházejí z oficiálního
registru adres ČR (RÚIAN / ČÚZK) a byly převedeny ze systému S-JTSK do WGS84.
Mapa používá dlaždice z OpenStreetMap — proto při prvním otevření mapy potřebuje
internet (samotné zaškrtávání funguje offline).

Navigace po ulicích používá bezplatnou pěší routovací službu
[FOSSGIS OSRM](https://routing.openstreetmap.de) (bez API klíče, komunitní projekt
OpenStreetMap) — vyžaduje připojení k internetu. Když není dostupná, aplikace
nakreslí přímou čáru k cíli.

## Technologie

- [Expo](https://expo.dev) / React Native + TypeScript
- `@react-native-async-storage/async-storage` pro uložení zaškrtnutých adres v zařízení
- [Leaflet](https://leafletjs.com) + [OpenStreetMap](https://www.openstreetmap.org) pro mapu (webová verze)
