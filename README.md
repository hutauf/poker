# Pokerlabor

Ein interaktiver Texas-Hold’em-Chancenrechner zum Lernen und Ausprobieren.
React + TypeScript, vollständig im Browser. Kein Backend, kein API-Schlüssel,
kein Login erforderlich. Oberfläche auf Deutsch und Englisch.

## Direkt ausprobieren

Die mitgelieferte **Pokerlabor.html** im Browser öffnen. Sie enthält bereits
JavaScript, CSS und das Tischbild und funktioniert ohne Installation und offline.
Die HTML-Datei entspricht dem aktuellen Quellcode dieses Projekts.

## Lokal entwickeln

Voraussetzungen: Node.js ab 22.13 und npm.
Die Entwicklungsbefehle funktionieren auch unter Windows ohne Bash.

```sh
npm ci
npm run dev
```

Anschließend die im Terminal angezeigte Adresse öffnen (normalerweise
http://localhost:5173).

## Erstellen

```sh
npm run build
```

Der Build liegt unter `dist/` und kann auf einem statischen Webserver oder über
den App-Builder veröffentlicht werden. `dist/index.html` ist eine einzelne,
vollständig eingebettete Offline-Datei.

Die einzelne Offline-HTML-Datei aus dem Quellcode neu erzeugen:

```sh
node scripts/build-offline.mjs Pokerlabor.html
```

## Prüfen

```sh
npm exec -- tsc --noEmit
node --experimental-strip-types tests/poker.test.mjs
node --experimental-strip-types tests/table.test.mjs
node --experimental-strip-types tests/deal.test.mjs
```

## Funktionen

- 2–10 Spieler, bekannte und unbekannte Hände sowie zufälliges Austeilen.
- Interaktiver Tisch für Hoch- und Querformat, kompakte Auswahl aller 52 Karten.
- Flop, Turn und River schrittweise austeilen; einzelne Karten frei bearbeiten.
- Rückgängig, Spieler zurücksetzen und neue Hand mit optionalem Austeilen.
- Sieg- und Teilungswahrscheinlichkeit; im Pro-Modus zusätzlich Topfanteil,
  benötigter Topfanteil und erwarteter Gewinn beim Mitgehen.
- Bis 30.000 mögliche Kartenverteilungen vollständige Aufzählung, sonst
  24.000 Monte-Carlo-Stichproben. Geschätzte Werte sind mit `~` markiert.
- Vollständig unbekannte, gleichwertige Spieler bekommen gemittelte Schätzwerte.
  Auch bei ausschließlich unbekannten Händen werden Siege und Teilungen simuliert.

## Projektstruktur

- `app/page.tsx`: Tisch, Bedienung und DE/EN-Texte.
- `app/globals.css`: responsives Erscheinungsbild.
- `lib/poker.ts`: Handbewertung, Chancenberechnung und Austeilen.
- `lib/table.ts`: Sitzpositionen und Berechnung zum Mitgehen.
- `public/table.webp`: erzeugtes Tischbild; `public/favicon.svg`: App-Symbol.
- `components/ui/`: mitgelieferte UI-Bausteine.
- `tests/`: Berechnungs- und Austeiltests.
- `scripts/build-offline.mjs`: Export als einzelne HTML-Datei.
