# German Quest: Deutschstadt (Context & Architecture Guide)

## 1. Project Overview
* **Name:** German Quest: Deutschstadt
* **Genre:** 2D Pixel-Art Educational RPG
* **Goal:** Teach German language and grammar (Articles: der/die/das, vocabulary, everyday conversation, and German culture) through gamified exploration and questing.
* **Stack:**
  * **Framework:** Next.js 15 (App Router, TypeScript)
  * **Styling:** Tailwind CSS (Retro pixel theme, sharp borders, chunky drop shadows, `Press Start 2P` pixel font)
  * **World Engine:** Phaser 3 (Arcade Physics, 2D procedural rendering, collision bounds)
  * **State Bridge:** Zustand (`useGameStore.ts`)
  * **Audio:** Web Audio API 8-bit procedural sound synthesizer (Zero external MP3 dependencies)

---

## 2. Hybrid Architecture (Phaser + React)

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Next.js / React DOM Overlay Layer                    │
│  ┌─────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │ HUD (XP, Coins, Quests) │  │ DialogueBox (Lukas/Portraits & Tree)│  │
│  ├─────────────────────────┤  ├─────────────────────────────────────┤  │
│  │ Inventory (Rucksack [I])│  │ Wort-Blitz (Der/Die/Das)            │  │
│  │                         │  │ Satz-Bauer (Bibliothek)             │  │
│  │                         │  │ Bürger-Quiz (Rathaus)               │  │
│  │                         │  │ Speisekarten-Match (Café)           │  │
│  │                         │  │ Fahrkarten-Schalter (Bahnhof)       │  │
│  └─────────────────────────┘  └─────────────────────────────────────┘  │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │
                    ZUSTAND EVENT BRIDGE (`useGameStore.ts`)
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                       Phaser 3 Game Canvas                             │
│  - Player Entity: 8-way movement, Arcade Physics, WASD/Arrows          │
│  - NPC Lukas: Stationed in Plaza, animated badge, Proximity zone       │
│  - NPC Herr Braun: Bahnhofsvorsteher on the station forecourt          │
│  - 2D Institutions: Bäckerei, Bibliothek, Rathaus, Café, Bahnhof       │
│  - Bahnhof: Dedicated platform, rails, steam train & departure board   │
│  - World Map: Procedural Cobblestone Plaza, Fountain, Grass Grid       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. The 5 Town Institutions (Deutschstadt)

1. **Die Bäckerei (Bakery - Northwest):**
   * **Visuals:** Red tiled roof, red-and-white striped awning, wooden door, bread display.
   * **Interaction:** Triggers the **"Wort-Blitz"** minigame where players race to choose the correct German article (`der`, `die`, `das`) for nouns.
   * **Items:** Offers `Die Brezel` (+15 XP) and `Der Apfel` (+10 XP).

2. **Die Bibliothek (Library - Northeast):**
   * **Visuals:** Scholarly dark navy roof, marble columns, gold book emblem, sign `BIBLIOTHEK`.
   * **Interaction:** **Satz-Bauer** with **Frau Weber**. Players tap shuffled word tiles to rebuild six German sentences in the correct order. Covers verb-second position, time–manner–place order, modal questions and dative/accusative. Two attempts, then the solution and grammar hint are revealed. 4+ solved completes `bibliothek_quest`. Data: `src/data/bibliothek.json`, UI: `src/components/minigames/Satzbauer.tsx`.

3. **Das Rathaus (Town Hall - North Center):**
   * **Visuals:** Imposing clock tower, stone facade, German flag ribbon (Schwarz-Rot-Gold), grand double archway door.
   * **Interaction:** **Bürger-Quiz** with **Bürgermeister Schmidt**. Eight timed (20 s) multiple-choice questions about German geography, history, culture and language, with fact explanations and a streak bonus for consecutive correct answers. 6+ correct earns the Bürger-Urkunde and completes `rathaus_quest`. Data: `src/data/rathaus.json`, UI: `src/components/minigames/BuergerQuiz.tsx`.

4. **Das Café "Gemütlichkeit" (Town Café - Southeast):**
   * **Visuals:** Green-striped awning, patio windows with coffee cup silhouette, wooden door.
   * **Interaction:** **Speisekarten-Match** with **Herr Müller**. A 12-card memory game matching six German menu words (`der Kaffee`, `das Wasser`, `die Brezel` …) with their English meanings. Fewer moves = more stars and higher rewards; completing the board finishes `cafe_quest`. Data: `src/data/cafe.json`, UI: `src/components/minigames/KaffeeMatch.tsx`.

5. **Der Bahnhof (Main Station - Southwest):**
   * **Visuals:** Sandstone station hall with a clock tower, grand arched entrance, `BAHNHOF` sign, platform with yellow safety line, rails and a steam train with animated smoke.
   * **Interaction:** Interacting with the station opens the **"Fahrkarten-Schalter"** minigame. Herr Braun the station master stands on the forecourt and teaches travel vocabulary (`der Zug`, `das Gleis`, `die Fahrkarte`, `die Abfahrt`, `die Ankunft`).
   * **Minigame (Fahrkarten-Schalter):** Six ticket-counter questions with an always-visible `Abfahrtstafel` (departure board). Covers destinations (`nach …`), one-way vs. round trip, platform and departure-time reading, accusative articles (`einen Koffer`), and paying (`bar` / `mit Karte`).
   * **Rewards:** XP + coins scale with correct answers. Four or more correct earns `Die Fahrkarte` (added to the Rucksack) and completes the `bahnhof_quest` ("Die Reise beginnt").
   * **Data:** `src/data/bahnhof.json` (departures + rounds), `src/data/dialogue.json` (`braun_*` nodes), `src/components/minigames/FahrkartenSchalter.tsx`.

> All five institutions now launch a dedicated React minigame overlay. Shared shell + intro UI lives in `src/components/minigames/MinigameFrame.tsx`; pixel portraits for the hosts are in `public/characters/` (`Weber.svg`, `Schmidt.svg`, `Mueller.svg`, `Braun.svg`).

---

## 4. NPC Lukas (Your Companion)
* **Portrait & Artwork:** Rendered from `assets/characters/Lukas.png` (2048x2048 illustration) and served from `public/characters/Lukas.png`.
* **In-Game Role:** Stationed at the town square next to the central fountain.
* **Dialogue Tree:** Branching dialogue system (`src/data/dialogue.json`) allowing players to choose responses in German with instant English translation toggles.

---

## 5. Controls & Shortcuts
* **`WASD` / `Arrow Keys`:** Move character (8-directional with normalized diagonals).
* **`SPACE` / `E`:** Interact with Lukas, Herr Braun, or enter town buildings (including the Bahnhof).
* **`I`:** Toggle Rucksack / Inventory overlay.
* **`1`, `2`, `3`:** Quick-select dialogue response options (also selects answers in the Bürger-Quiz and replies in the Fahrkarten-Schalter).
* **`ENTER` / `SPACE`:** Check the current sentence in the Satz-Bauer / continue to the next question in the Bahnhof and Bürger-Quiz.
* **`ESC`:** Close the active minigame overlay.
* **Mouse / tap:** Select word tiles (Satz-Bauer), quiz answers (Bürger-Quiz) and flip cards (Speisekarten-Match).
* **Audio Button (HUD):** Toggle retro sound effects.
